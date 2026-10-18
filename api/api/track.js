// Sayt har ochilganda shu manzilga signal yuboradi: /api/track
// Sayt bir nechta domenda turishi mumkin (Vercel + Hostra). Vercel'dan boshqa domenlar uchun:
// Vercel -> Settings -> Environment Variables -> ALLOWED_ORIGINS = https://domeningiz.uz,https://www.domeningiz.uz
const { rd, tg, OWNER, day, clock, ALLOW } = require('./_lib');

module.exports = async (req, res) => {
  const o = String(req.headers.origin || '').toLowerCase();
  let host = String(req.headers.host || '?'), self = !o;
  if (o) { try { const u = new URL(o); host = u.hostname; self = u.host === req.headers.host; } catch (e) { self = false; } }
  if (!self && !ALLOW.includes(o)) return res.status(403).json({ error: 'origin_not_allowed' }); // begona saytlar statistikani buzmasin
  if (o) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
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
      await rd(['HINCRBY', 'hv', host, '1']); // domenlar bo'yicha hisob (/stat'da ko'rinadi)
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
            '\n🌐 Domen: ' + host +
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

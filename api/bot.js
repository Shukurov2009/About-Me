// Telegram bot (webhook): /api/bot
const { rd, tg, OWNER, T, day, diag } = require('./_lib');

const REPO = process.env.GITHUB_REPO;
const BR = process.env.GITHUB_BRANCH || 'main';
const GT = process.env.GITHUB_TOKEN;
const PHOTO = 'Image/portfolio-rasm.jpg';

// ---------- Hostra: GitHub'ga yozilgach, Hostra'ga "yangilan" signali ----------
// Hostra'dagi deploy.php GitHub'dan yangi fayllarni (rasm, musiqa, index.html) o'zi olib joylaydi.
const HU = process.env.HOSTRA_DEPLOY_URL;   // masalan: https://utkrvc11.wwwz.uz/deploy.php
const HK = process.env.HOSTRA_SECRET;       // deploy.php ichidagi SECRET bilan bir xil
let dirty = false;                          // bu so'rovda GitHub'ga biror narsa yozildimi
async function syncHostra(wait) {
  if (!HU || !HK) return 'Hostra sozlanmagan (HOSTRA_DEPLOY_URL va HOSTRA_SECRET kerak)';
  try {
    await new Promise(r => setTimeout(r, 2000)); // GitHub o'zgarishni to'liq qabul qilib olishi uchun
    const r = await fetch(HU + (HU.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(HK), { signal: AbortSignal.timeout(wait ? 50000 : 4000) });
    return (await r.text()).slice(0, 200);    // wait=false bo'lsa, deploy.php baribir ishini davom ettiradi
  } catch (e) { return wait ? 'Hostra javob bermadi: ' + e.message : ''; }
}

// ---------- GitHub ----------
const gh = (p, o = {}) => fetch(
  'https://api.github.com/repos/' + REPO + '/contents/' + p + (o.method && o.method !== 'GET' ? '' : '?ref=' + BR),
  { ...o, headers: { Authorization: 'Bearer ' + GT, Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-bot', 'Content-Type': 'application/json' } }
);
async function getF(p) {
  const r = await gh(p);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub ' + r.status);
  return r.json();
}
async function putF(p, buf, msg, sha) {
  const r = await gh(p, { method: 'PUT', body: JSON.stringify({ message: msg, content: buf.toString('base64'), branch: BR, sha }) });
  if (!r.ok) throw new Error('GitHub ' + r.status + ': ' + (await r.text()).slice(0, 140));
  dirty = true;
}
async function delF(p, msg) {
  const f = await getF(p);
  if (f) { await gh(p, { method: 'DELETE', body: JSON.stringify({ message: msg, sha: f.sha, branch: BR }) }); dirty = true; }
}

// ---------- Sayt ma'lumotlari (index.html ichidagi DATA bloki) ----------
const RE = /\/\*DATA_START\*\/var SITE_DATA=([\s\S]*?);\/\*DATA_END\*\//;
async function readData() {
  const f = await getF('index.html');
  const m = Buffer.from(f.content, 'base64').toString('utf8').match(RE);
  if (!m) throw new Error('index.html ichida DATA bloki topilmadi');
  return JSON.parse(m[1]);
}
async function edit(fn, msg) {
  for (let k = 0; k < 2; k++) {
    const f = await getF('index.html');
    const html = Buffer.from(f.content, 'base64').toString('utf8');
    const m = html.match(RE);
    if (!m) throw new Error('index.html ichida DATA bloki topilmadi');
    const d = JSON.parse(m[1]);
    const out = await fn(d);
    const json = JSON.stringify(d).replace(/</g, '\\u003c');
    const nh = html.replace(RE, () => '/*DATA_START*/var SITE_DATA=' + json + ';/*DATA_END*/');
    try { await putF('index.html', Buffer.from(nh), msg, f.sha); return out; } catch (e) { if (k) throw e; }
  }
}

// ---------- Telegram fayl ----------
async function dl(fileId) {
  const f = await tg('getFile', { file_id: fileId });
  if (!f.ok) throw new Error("Faylni olib bo'lmadi (Telegram botlari uchun chegara 20 MB)");
  const r = await fetch('https://api.telegram.org/file/bot' + T + '/' + f.result.file_path);
  return Buffer.from(await r.arrayBuffer());
}
const say = (c, t) => tg('sendMessage', { chat_id: c, text: t });
const slug = s => (String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'track') + '-' + Date.now().toString(36);
const list = (a, f) => a.length ? a.map((x, i) => (i + 1) + '. ' + f(x)).join('\n') : "(bo'sh)";

const HELP = `Portfolyo boti. Buyruqlar:

📷 Rasm yuboring: portfolyo rasmi almashadi
🎵 Audio (mp3) yuboring: playlistga qo'shiladi. Izohga "Nom - Artist" yozsangiz, nomi shunday bo'ladi.

/sertifikat Nom | Izoh: sertifikat qo'shish
/sertifikatlar: ro'yxat
/sertifikat_ochir 2: 2-sertifikatni o'chirish

/qoshiqlar: playlist ro'yxati
/qoshiq_ochir 3: 3-qo'shiqni o'chirish

/stat: tashriflar statistikasi
/xabar on yoki /xabar off: har tashrifda xabar kelishini yoqish/o'chirish
/diag: analitika sozlamalarini tekshirish
/sync: Hostra saytini qo'lda yangilash

Eslatma: o'zgarishlar saytda 1-2 daqiqada ko'rinadi.`;

async function handle(m) {
  const c = m.chat.id;
  const tx = (m.text || '').trim();
  const cmd = tx.split(/\s+/)[0].toLowerCase().replace(/@.*/, '');
  const arg = tx.slice(tx.split(/\s+/)[0].length).trim();

  if (m.photo) {
    const buf = await dl(m.photo[m.photo.length - 1].file_id);
    const f = await getF(PHOTO);
    await putF(PHOTO, buf, 'Bot: portfolyo rasmi yangilandi', f && f.sha);
    await edit(d => { d.v = (d.v || 1) + 1; }, 'Bot: rasm versiyasi');
    return say(c, "✅ Rasm yangilandi. 1-2 daqiqadan keyin saytda ko'rinadi.");
  }

  const a = m.audio || (m.document && /audio|mpeg|mp3/i.test((m.document.mime_type || '') + (m.document.file_name || '')) ? m.document : null);
  if (a) {
    if (a.file_size > 20 * 1024 * 1024) return say(c, "⚠️ Fayl 20 MB dan katta, Telegram bot uni ololmaydi.");
    let t = a.title || (a.file_name || 'Qoshiq').replace(/\.[^.]+$/, ''), ar = a.performer || '';
    if (m.caption) { const p = m.caption.split(' - '); t = p[0].trim(); ar = (p[1] || '').trim(); }
    const path = 'music/' + slug(t) + '.mp3';
    await say(c, '⏳ Yuklanmoqda: ' + t);
    await putF(path, await dl(a.file_id), "Bot: qo'shiq qo'shildi", undefined);
    await edit(d => { d.tracks = d.tracks || []; d.tracks.push({ t, a: ar, s: path }); }, "Bot: playlistga qo'shildi");
    return say(c, "✅ Playlistga qo'shildi: " + t + (ar ? ' - ' + ar : ''));
  }

  switch (cmd) {
    case '/start': case '/help': return say(c, HELP);
    case '/sertifikat': {
      const [t, d] = arg.split('|').map(s => s.trim());
      if (!t) return say(c, 'Namuna: /sertifikat Ingliz tili IELTS | 7.0 ball');
      await edit(x => { x.certs = x.certs || []; x.certs.push({ t, d: d || '' }); }, "Bot: sertifikat qo'shildi");
      return say(c, "✅ Qo'shildi: " + t);
    }
    case '/sertifikatlar': { const d = await readData(); return say(c, list(d.certs || [], x => x.t + (x.d ? ' (' + x.d + ')' : ''))); }
    case '/sertifikat_ochir': {
      const n = parseInt(arg, 10);
      const r = await edit(x => (x.certs && x.certs[n - 1]) ? x.certs.splice(n - 1, 1)[0] : null, "Bot: sertifikat o'chirildi");
      return say(c, r ? "🗑 O'chirildi: " + r.t : "Bunday raqam yo'q. /sertifikatlar bilan ro'yxatni ko'ring.");
    }
    case '/qoshiqlar': { const d = await readData(); return say(c, list(d.tracks || [], x => x.t + (x.a ? ' - ' + x.a : ''))); }
    case '/qoshiq_ochir': {
      const n = parseInt(arg, 10);
      const r = await edit(x => (x.tracks && x.tracks[n - 1]) ? x.tracks.splice(n - 1, 1)[0] : null, "Bot: qo'shiq o'chirildi");
      if (!r) return say(c, "Bunday raqam yo'q. /qoshiqlar bilan ro'yxatni ko'ring.");
      if (/^music\//.test(r.s)) await delF(r.s, "Bot: qo'shiq fayli o'chirildi");
      return say(c, "🗑 O'chirildi: " + r.t);
    }
    case '/xabar': {
      if (arg === 'off') await rd(['SET', 'notify:off', '1']); else await rd(['DEL', 'notify:off']);
      return say(c, arg === 'off' ? "🔕 Tashrif xabarlari o'chirildi (statistika davom etadi)." : '🔔 Tashrif xabarlari yoqildi.');
    }
    case '/stat': {
      const keys = [0, 1, 2, 3, 4, 5, 6].map(i => day(i));
      const vals = await rd(['MGET', ...keys.map(k => 'visits:' + k)]);
      const uniq = await rd(['GET', 'uniq:total']), tot = await rd(['GET', 'visits:total']);
      const hv = (await rd(['HGETALL', 'hv'])) || [], hosts = [];
      for (let i = 0; i < hv.length; i += 2) hosts.push(hv[i] + ': ' + hv[i + 1]);
      return say(c, '📊 Statistika\n\nBugun: ' + (vals[0] || 0) + '\n\nOxirgi 7 kun:\n' +
        keys.map((k, i) => k.slice(5) + ': ' + (vals[i] || 0)).join('\n') +
        '\n\nJami tashrif: ' + (tot || 0) + '\nNechta odam ko\'rgan: ' + (uniq || 0) +
        (hosts.length ? '\n\nDomenlar bo\'yicha (yangi hisob):\n' + hosts.join('\n') : ''));
    }
    case '/sync': { await say(c, '⏳ Hostra yangilanmoqda...'); return say(c, '🌐 ' + (await syncHostra(true))); }
    case '/diag': return say(c, await diag());
    default: return say(c, "Tushunmadim. /help ni bosing.");
  }
}

module.exports = async (req, res) => {
  const E = process.env;
  if (req.method === 'GET') { // brauzerda tekshirish uchun: faqat true/false ko'rsatadi, qiymatlarni emas
    return res.status(200).json({ bot_token: !!E.BOT_TOKEN, owner_id: !!E.OWNER_ID, webhook_secret: !!E.WEBHOOK_SECRET, github: !!(E.GITHUB_REPO && E.GITHUB_TOKEN), redis: !!(E.UPSTASH_REDIS_REST_URL || E.KV_REST_API_URL), hostra: !!(E.HOSTRA_DEPLOY_URL && E.HOSTRA_SECRET) });
  }
  if (!E.WEBHOOK_SECRET || req.headers['x-telegram-bot-api-secret-token'] !== E.WEBHOOK_SECRET) return res.status(401).end();
  const m = (req.body || {}).message;
  dirty = false;
  try { if (m && m.from && m.from.id === OWNER) await handle(m); }
  catch (e) { try { await say(m.chat.id, '⚠️ Xato: ' + e.message); } catch (_) { } }
  if (dirty) await syncHostra(false); // GitHub'ga yozilgan bo'lsa, Hostra'ga ham xabar beramiz
  res.status(200).end();
};

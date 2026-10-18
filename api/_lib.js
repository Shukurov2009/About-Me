// Umumiy yordamchilar (api/_lib.js: nomi _ bilan boshlangani uchun alohida manzil bo'lmaydi)
const E = process.env;
const T = E.BOT_TOKEN;
const OWNER = Number(E.OWNER_ID);
// Saytga so'rov yuborishi mumkin bo'lgan boshqa domenlar (Hostra): https://domen.uz,https://www.domen.uz
const ALLOW = (E.ALLOWED_ORIGINS || '').split(',').map(x => x.trim().toLowerCase().replace(/\/$/, '')).filter(Boolean);

// Redis o'zgaruvchilari: avval standart nomlar, topilmasa har qanday prefiks (STORAGE_, KV_, UPSTASH_ ...)
let RU = E.UPSTASH_REDIS_REST_URL || E.KV_REST_API_URL;
let RT = E.UPSTASH_REDIS_REST_TOKEN || E.KV_REST_API_TOKEN;
let RN = E.UPSTASH_REDIS_REST_URL ? 'UPSTASH_REDIS_REST_URL' : (E.KV_REST_API_URL ? 'KV_REST_API_URL' : '');
if (!RU || !RT) {
  const k = Object.keys(E).find(n => /(REDIS_REST_URL|REST_API_URL)$/.test(n) && E[n] && E[n.replace(/URL$/, 'TOKEN')]);
  if (k) { RU = E[k]; RT = E[k.replace(/URL$/, 'TOKEN')]; RN = k; }
}

async function rd(cmd) {
  if (!RU || !RT) {
    throw new Error("Redis sozlanmagan. Vercel Storage orqali Upstash Redis ulang, loyihani Redeploy qiling va botda /diag yuboring.");
  }
  const r = await fetch(RU, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RT, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd.map(String))
  });
  const body = await r.text();
  let j;
  try { j = JSON.parse(body); } catch (_) { throw new Error("Redis noto'g'ri javob qaytardi (HTTP " + r.status + ")."); }
  if (!r.ok || j.error) throw new Error('Redis xatosi: ' + (j.error || ('HTTP ' + r.status)));
  return j.result;
}
async function tg(method, payload) {
  const r = await fetch('https://api.telegram.org/bot' + T + '/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  return r.json();
}
// Toshkent vaqti bilan sana (YYYY-MM-DD); o = necha kun oldin
const day = (o = 0) => new Date(Date.now() + 5 * 3600e3 - o * 864e5).toISOString().slice(0, 10);
const clock = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(11, 16);

// /diag buyrug'i: analitika uchun kerakli narsalarni tekshiradi (qiymatlarni ko'rsatmaydi, faqat nomlar va holat)
async function diag() {
  const L = ['Redis manzili: ' + (RN || (RU ? 'bor' : 'TOPILMADI')), 'Redis tokeni: ' + (RT ? 'bor' : 'TOPILMADI')];
  if (RU && RT) {
    try {
      await rd(['SET', 'diag:test', '1', 'EX', 60]);
      L.push("Redis yozish/o'qish: " + ((await rd(['GET', 'diag:test'])) === '1' ? 'OK' : "noto'g'ri javob"));
    } catch (e) { L.push('Redis: XATO. ' + e.message); }
  }
  L.push('Ruxsat berilgan domenlar: ' + (ALLOW.length ? ALLOW.join(', ') : "YO'Q (Hostra'dan tashrif sanalmaydi)"));
  L.push('GitHub: ' + (E.GITHUB_REPO && E.GITHUB_TOKEN ? 'bor (' + E.GITHUB_REPO + ')' : "YO'Q"));
  L.push('Bot tokeni: ' + (T ? 'bor' : "YO'Q"), 'Owner ID: ' + (OWNER ? 'bor' : "YO'Q"));
  return L.join('\n');
}

module.exports = { rd, tg, OWNER, T, day, clock, diag, ALLOW };

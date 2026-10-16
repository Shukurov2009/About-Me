// Umumiy yordamchilar (api/_lib.js: nomi _ bilan boshlangani uchun alohida manzil bo'lmaydi)
const T = process.env.BOT_TOKEN;
const OWNER = Number(process.env.OWNER_ID);
const RU = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RT = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function rd(cmd) {
  const r = await fetch(RU, { method: 'POST', headers: { Authorization: 'Bearer ' + RT }, body: JSON.stringify(cmd) });
  const j = await r.json();
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

module.exports = { rd, tg, OWNER, T, day, clock };

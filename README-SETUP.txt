PORTFOLIO BOTINI ISHGA TUSHIRISH
================================

Bu papkadagi fayllar:
  index.html      - yangilangan sayt (eskisining o'rniga qo'ying)
  vercel.json     - bot funksiyasi uchun sozlama
  api/bot.js      - Telegram bot
  api/track.js    - sayt tashriflarini hisoblaydi
  api/_lib.js     - umumiy yordamchi kod

1) BOT YARATISH
   Telegramda @BotFather -> /newbot -> nom va username bering.
   U sizga TOKEN beradi (uni hech kimga bermang, sahifa kodiga yozmang).

2) O'Z TELEGRAM ID'INGIZNI BILISH
   Telegramda @userinfobot ga /start yozing. U raqamli "Id" beradi.

3) GITHUB TOKEN (bot repozitoriyga yozishi uchun)
   GitHub -> Settings -> Developer settings -> Personal access tokens
   -> Fine-grained tokens -> Generate new token.
   - Repository access: faqat portfolyo repozitoriyingiz.
   - Permissions -> Contents: Read and write.
   Hosil bo'lgan tokenni nusxalab oling.

4) HISOBLAGICH UCHUN BAZA (bepul)
   Vercel -> loyihangiz -> Storage (yoki Marketplace) -> Upstash Redis
   -> Create / Connect to project. Vercel kerakli o'zgaruvchilarni o'zi qo'shadi.

5) VERCEL'DA MAXFIY O'ZGARUVCHILAR
   Loyiha -> Settings -> Environment Variables. Quyidagilarni qo'shing:
     BOT_TOKEN       = (1-qadamdagi token)
     OWNER_ID        = (2-qadamdagi raqam)
     WEBHOOK_SECRET  = (o'zingiz o'ylab topgan uzun tasodifiy matn, masalan 30 ta harf-raqam)
     GITHUB_TOKEN    = (3-qadamdagi token)
     GITHUB_REPO     = foydalanuvchi/repozitoriy   (masalan: fayzulloh/portfolio)
     GITHUB_BRANCH   = main                         (sizniki master bo'lsa, master)

6) FAYLLARNI REPOZITORIYGA QO'YISH
   Shu papkadagi hamma narsani repozitoriy ildiziga (index.html turgan joyga) qo'ying:
   api/ papkasi, vercel.json, index.html (eskisini almashtiring).
   Push qiling. Vercel o'zi qayta yig'adi (1-2 daqiqa).
   MUHIM: o'zgaruvchilarni qo'shgandan KEYIN Vercel'da Redeploy qiling.

7) WEBHOOK'NI ULASH (faqat bir marta)
   Brauzerda manzilni oching (<...> o'rniga o'zingiznikini qo'ying):
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<SAYT_MANZILI>/api/bot&secret_token=<WEBHOOK_SECRET>
   "ok":true chiqsa, tayyor.

8) SINASH
   Botga /start yozing. Yordam ro'yxati chiqadi.

QR KOD: havolani  https://SAYT/?ref=qr  ko'rinishida kodlasangiz, xabarda
"Qayerdan: qr" deb yoziladi.

ESLATMALAR
- Bot faqat sizning Telegram ID'ingizga javob beradi.
- Bot har o'zgarishda repozitoriyga yozadi, Vercel qayta yig'adi (1-2 daqiqa).
- Kompyuterda index.html'ni o'zgartirmoqchi bo'lsangiz, avval "git pull" qiling,
  aks holda bot yozgan o'zgarishlar bilan to'qnashuv (conflict) chiqadi.
- Audio fayl 20 MB dan oshmasin (Telegram botlari uchun chegara).
- index.html ichidagi DATA_START va DATA_END belgilarini o'chirmang.
- Token oshkor bo'lib qolsa: BotFather -> /revoke (yoki GitHub'da tokenni o'chirib yangisini oling).

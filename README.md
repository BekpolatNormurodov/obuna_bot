# Obuna Bot

Kino obuna Telegram bot — NestJS + nestjs-telegraf + Prisma/MySQL. Kino
videolar serverga yuklanmaydi — faqat Telegram `file_id` bazada saqlanadi.

## Docker bilan ishga tushirish

1. `cp .env.example .env` va `BOT_TOKEN` ni to'ldiring, `MYSQL_ROOT_PASSWORD`
   uchun o'zingizning parolingizni tanlang (`DATABASE_URL` dagi parol bilan
   bir xil bo'lsin).
2. `docker compose up -d --build`

Bu ikkita konteyner ishga tushiradi: `mysql` (ma'lumotlar bazasi) va `bot`
(ilovaning o'zi). `bot` konteyneri ishga tushishidan oldin
`npx prisma migrate deploy` avtomatik bajariladi, shuning uchun sxema har
doim yangilangan bo'ladi.

Keyingi relizlarda (kod o'zgarganda): `docker compose up -d --build`.
Loglarni ko'rish: `docker compose logs -f bot`.
To'xtatish: `docker compose down` (ma'lumotlar bazasi volume saqlanib
qoladi).

## Lokal rivojlantirish (ixtiyoriy, Docker'siz tezroq iteratsiya uchun)

1. `docker compose up -d mysql` (faqat bazani konteynerda ishga tushiradi)
2. `npm install`
3. `npx prisma migrate dev`
4. `npm run start:dev`

## Boshlang'ich sozlash

Bot birinchi marta ishga tushgach, admin akkountdan (`.env` dagi
`ADMIN_IDS`) botga `/kanallar` yuboring, so'ng **➕ Qo'shish** tugmasini
bosib quyidagi kanalni qo'shing:

- `-1002949185784` (AZARTNIK UZ)

Bot bu kanalda **admin** bo'lishi shart — aks holda taklif havolasini
(`invite link`) ololmaydi va "Bot bu kanalda admin emas" xabarini
qaytaradi.

## Zaxira nusxa (backup)

`Movie.fileId` yozuvlari qayta tiklab bo'lmaydigan ma'lumot — admin
yuklagan original videoning o'rnini bosuvchi manba yo'q. Production
serverida davriy `mysqldump` (masalan kunlik cron) sozlash tavsiya
etiladi.

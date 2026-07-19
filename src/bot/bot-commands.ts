export const BOT_PROFILE = {
  description:
    "🎬 Bu bot orqali minglab kinolarni bepul tomosha qilishingiz mumkin.\n\n" +
    "Kino raqamini yuboring yoki nomi bo'yicha qidiring — kerakli kino darhol " +
    "sizga yuboriladi.\n\nBoshlash uchun /start bosing!",
  shortDescription: "🎬 Kinolar dunyosi — raqam yoki nom bo'yicha qidiring va tomosha qiling!",
} as const;

export const PUBLIC_COMMANDS = [
  { command: 'start', description: 'Botni ishga tushirish' },
  { command: 'search', description: "Kino nomi yoki raqami bo'yicha qidirish" },
  { command: 'kinolar', description: "Barcha kinolar ro'yxati" },
] as const;

export const ADMIN_COMMANDS = [
  ...PUBLIC_COMMANDS,
  { command: 'kanallar', description: 'Majburiy obuna kanallarini boshqarish' },
  { command: 'cancel', description: 'Joriy amalni bekor qilish' },
] as const;

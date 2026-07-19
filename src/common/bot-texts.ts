export const BOT_TEXTS = {
  welcome:
    "Assalomu alaykum! Kino raqamini yuboring yoki /search <nomi> orqali qidiring.",
  subscribeRequired: "Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:",
  stillNotSubscribed: "⚠️ Siz hali barcha kanallarga obuna bo'lmadingiz.",
  checkSubscriptionButton: '✅ Tekshirish',

  movieNotFound: '⚠️ Bunday kino topilmadi.',
  searchResultsHeader: 'Topilgan kinolar:',

  chooseSaveOrReplace: 'Bu videoni nima qilaman?',
  saveNewButton: '💾 Yangi kino',
  replaceExistingButton: '✏️ Mavjudini almashtirish',
  askTitle: 'Kino nomini kiriting:',
  askTitleWithSuggestion: (caption: string) =>
    `Kino nomini kiriting (yoki tavsiya etilgan nomni yuboring: "${caption}"):`,
  movieSaved: (id: number) => `✅ Saqlandi, raqami: ${id}`,
  askEditNumber: "Almashtirmoqchi bo'lgan kino raqamini kiriting:",
  editNumberNotFound: (id: number) => `⚠️ #${id} raqamli kino topilmadi.`,
  movieUpdated: (id: number) => `✅ #${id} yangilandi`,
  uploadCancelled: '❌ Bekor qilindi.',

  botNotAdminInChannel:
    '⚠️ Bot bu kanalda admin emas, iltimos botni kanalga admin qiling.',
  channelsListHeader: "Kanallar ro'yxati:",
  channelsListEmpty: "Hozircha kanallar qo'shilmagan.",
  addChannelButton: "➕ Qo'shish",
  editChannelButton: '✏️ Tahrirlash',
  deleteChannelButton: "🗑 O'chirish",
  confirmDeleteButton: "✅ Ha, o'chirish",
  cancelDeleteButton: "❌ Yo'q, bekor qilish",
  askChannelIdentifier:
    "Kanal @username yoki chat ID sini yuboring (masalan @azartnik_uz yoki -1002949185784):",
  channelSaved: (title: string) => `✅ "${title}" kanali saqlandi.`,
  channelDeleted: "✅ Kanal o'chirildi.",
  confirmDeleteChannel: (title: string) =>
    `"${title}" kanalini o'chirishni tasdiqlaysizmi?`,
  channelResolveError:
    "⚠️ Kanalni topib bo'lmadi. Kanal @username yoki ID to'g'riligini tekshiring.",
} as const;

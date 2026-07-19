export const BOT_TEXTS = {
  welcome:
    "🎬 *KINO BOT*ga xush kelibsiz!\n\n" +
    "Bu yerda minglab kinolarni bir necha soniyada topishingiz mumkin.\n\n" +
    "📌 *Qanday foydalanish mumkin:*\n" +
    "🔢 Kino raqamini yuboring — kerakli kino darhol yuboriladi\n" +
    "🔍 /search _nomi_ — kino nomi bo'yicha qidiring\n" +
    "🎞 /kinolar — barcha kinolar ro'yxatini ko'ring\n\n" +
    "Xush ko'rilgan tomosha! 🍿",
  subscribeRequired: "Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:",
  stillNotSubscribed: "⚠️ Siz hali barcha kanallarga obuna bo'lmadingiz.",
  checkSubscriptionButton: '✅ Tekshirish',

  movieNotFound:
    "😔 Afsuski, bunday kino topilmadi.\n\n" +
    "🔢 Kino raqamini tekshirib qaytadan yuboring\n" +
    "🔍 Yoki /search _nomi_ orqali qidirib ko'ring",
  searchResultsHeader: 'Topilgan kinolar:',

  allMoviesHeader: (page: number, totalPages: number) =>
    `🎬 *Barcha kinolar* (${page}/${totalPages}-sahifa):`,
  noMoviesYet:
    "📭 Hozircha kinolar mavjud emas.\n\n" +
    "Tez orada yangi kinolar qo'shiladi, keyinroq qayta urinib ko'ring! 🎬",
  prevPageButton: '⬅️ Oldingi',
  nextPageButton: 'Keyingi ➡️',

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
  confirmReplaceMovie: (id: number, title: string) =>
    `"#${id} — ${title}" o'rniga shu videoni qo'yaymi?`,
  confirmReplaceButton: '✅ Ha, almashtirish',
  cancelReplaceButton: "❌ Yo'q, bekor qilish",
  pendingChoiceReminder: 'Iltimos, avval yuqoridagi tugmalardan birini tanlang.',

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
    "📡 Kanal @username yoki chat ID sini yuboring.\n\n" +
    "Masalan: @azartnik\\_uz yoki -1002949185784\n\n" +
    "⚠️ *Diqqat:* bot shu kanalga *admin* qilib qo'shilgan bo'lishi shart, aks holda kanal ma'lumotlarini ololmayman.\n\n" +
    "🆔 Kanal ID sini bilmasangiz, @raw\\_data\\_bot orqali topishingiz mumkin — kanaldagi istalgan xabarni shu botga forward qiling.",
  channelSaved: (title: string) => `✅ "${title}" kanali saqlandi.`,
  channelDeleted: "✅ Kanal o'chirildi.",
  confirmDeleteChannel: (title: string) =>
    `"${title}" kanalini o'chirishni tasdiqlaysizmi?`,
  channelResolveError:
    "⚠️ Kanalni topib bo'lmadi. Kanal @username yoki ID to'g'riligini tekshiring.",
} as const;

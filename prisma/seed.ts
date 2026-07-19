import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Telegram } from 'telegraf';

const KNOWN_CHANNELS = [
  { chatId: '-1002949185784' }, // AZARTNIK UZ
];

async function main() {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error('BOT_TOKEN is not set in .env — cannot resolve channel info from Telegram.');
  }

  const telegram = new Telegram(botToken);
  const prisma = new PrismaClient();

  for (const { chatId } of KNOWN_CHANNELS) {
    const chat = await telegram.getChat(chatId);
    const username = 'username' in chat ? (chat.username ?? null) : null;
    const title = 'title' in chat ? chat.title : chatId;

    let inviteUrl: string | null = null;
    if (!username) {
      inviteUrl = await telegram.exportChatInviteLink(chat.id);
    }

    await prisma.channel.upsert({
      where: { chatId: String(chat.id) },
      update: { username, title, inviteUrl },
      create: { chatId: String(chat.id), username, title, inviteUrl },
    });

    console.log(`Seeded channel: ${title} (${chatId})`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

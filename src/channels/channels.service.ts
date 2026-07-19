import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

export interface ResolvedChannel {
  type: 'TELEGRAM' | 'INSTAGRAM';
  chatId: string | null;
  username: string | null;
  title: string;
  inviteUrl: string | null;
}

export class ChannelNotAdminError extends Error {}

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async resolveChannel(identifier: string): Promise<ResolvedChannel> {
    const chat = await this.bot.telegram.getChat(identifier);
    const username = 'username' in chat ? (chat.username ?? null) : null;
    const title = 'title' in chat ? chat.title : identifier;

    let inviteUrl: string | null = null;
    if (!username) {
      try {
        inviteUrl = await this.bot.telegram.exportChatInviteLink(chat.id);
      } catch {
        throw new ChannelNotAdminError();
      }
    }

    return { type: 'TELEGRAM', chatId: String(chat.id), username, title, inviteUrl };
  }

  findAll() {
    return this.prisma.channel.findMany({ orderBy: { id: 'asc' } });
  }

  findById(id: number) {
    return this.prisma.channel.findUnique({ where: { id } });
  }

  create(data: ResolvedChannel) {
    return this.prisma.channel.create({ data });
  }

  update(id: number, data: ResolvedChannel) {
    return this.prisma.channel.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.channel.delete({ where: { id } });
  }
}

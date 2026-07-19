import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ChannelsService } from '../channels/channels.service';
import { getMissingChannels } from './subscription-check';

const JOINED_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

export interface ChannelMembershipResult {
  chatId: string;
  title: string;
  username: string | null;
  inviteUrl: string | null;
  isMember: boolean;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly channelsService: ChannelsService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async getMissingChannelsForUser(userId: number): Promise<ChannelMembershipResult[]> {
    const channels = await this.channelsService.findAll();
    const memberships: ChannelMembershipResult[] = await Promise.all(
      channels.map(async (channel) => {
        try {
          const member = await this.bot.telegram.getChatMember(channel.chatId, userId);
          return {
            chatId: channel.chatId,
            title: channel.title,
            username: channel.username,
            inviteUrl: channel.inviteUrl,
            isMember: JOINED_STATUSES.has(member.status),
          };
        } catch {
          return {
            chatId: channel.chatId,
            title: channel.title,
            username: channel.username,
            inviteUrl: channel.inviteUrl,
            isMember: false,
          };
        }
      }),
    );
    return getMissingChannels(memberships);
  }
}

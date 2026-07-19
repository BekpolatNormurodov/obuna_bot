import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ChannelsService } from '../channels/channels.service';
import { InstagramFollowService } from '../channels/instagram-follow.service';
import { getMissingChannels } from './subscription-check';

const JOINED_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

export interface ChannelMembershipResult {
  id: number;
  type: 'TELEGRAM' | 'INSTAGRAM';
  chatId: string | null;
  title: string;
  username: string | null;
  inviteUrl: string | null;
  isMember: boolean;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly instagramFollowService: InstagramFollowService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async getMissingChannelsForUser(userId: number): Promise<ChannelMembershipResult[]> {
    const channels = await this.channelsService.findAll();
    const memberships: ChannelMembershipResult[] = await Promise.all(
      channels.map(async (channel) => {
        const isMember =
          channel.type === 'INSTAGRAM'
            ? await this.instagramFollowService.isConfirmed(channel.id, userId)
            : await this.checkTelegramMembership(channel.chatId as string, userId);
        return {
          id: channel.id,
          type: channel.type,
          chatId: channel.chatId,
          title: channel.title,
          username: channel.username,
          inviteUrl: channel.inviteUrl,
          isMember,
        };
      }),
    );
    return getMissingChannels(memberships);
  }

  private async checkTelegramMembership(chatId: string, userId: number): Promise<boolean> {
    try {
      const member = await this.bot.telegram.getChatMember(chatId, userId);
      return JOINED_STATUSES.has(member.status);
    } catch {
      return false;
    }
  }
}

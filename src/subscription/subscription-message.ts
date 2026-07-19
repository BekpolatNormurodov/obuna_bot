import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { BOT_TEXTS } from '../common/bot-texts';
import { ChannelMembershipResult } from './subscription.service';

export function buildSubscriptionKeyboard(missing: ChannelMembershipResult[]) {
  const rows: InlineKeyboardButton[][] = [];

  for (const channel of missing) {
    const url =
      channel.type === 'INSTAGRAM'
        ? (channel.inviteUrl as string)
        : channel.username
          ? `https://t.me/${channel.username}`
          : (channel.inviteUrl as string);
    rows.push([Markup.button.url(channel.title, url)]);

    if (channel.type === 'INSTAGRAM') {
      rows.push([
        Markup.button.callback(BOT_TEXTS.confirmInstagramFollowButton, `ig_confirm:${channel.id}`),
      ]);
    }
  }

  rows.push([Markup.button.callback(BOT_TEXTS.checkSubscriptionButton, 'check_subscription')]);
  return Markup.inlineKeyboard(rows);
}

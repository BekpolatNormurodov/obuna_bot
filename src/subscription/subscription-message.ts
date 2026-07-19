import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { BOT_TEXTS } from '../common/bot-texts';
import { ChannelMembershipResult } from './subscription.service';

export function buildSubscriptionKeyboard(missing: ChannelMembershipResult[]) {
  const rows: InlineKeyboardButton[][] = missing.map((channel) => [
    Markup.button.url(
      channel.title,
      channel.username
        ? `https://t.me/${channel.username}`
        : (channel.inviteUrl as string),
    ),
  ]);
  rows.push([Markup.button.callback(BOT_TEXTS.checkSubscriptionButton, 'check_subscription')]);
  return Markup.inlineKeyboard(rows);
}

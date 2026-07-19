import { UseGuards } from '@nestjs/common';
import { Action, Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminGuard } from '../common/admin.guard';
import { BOT_TEXTS } from '../common/bot-texts';
import { ChannelsService } from './channels.service';
import { PendingChannelActionService } from './pending-channel-action.service';

type MatchContext = Context & { match: RegExpExecArray };

function typeEmoji(type: string): string {
  return type === 'INSTAGRAM' ? '📸' : '📱';
}

@Update()
@UseGuards(AdminGuard)
export class ChannelsUpdate {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly pendingChannelActionService: PendingChannelActionService,
  ) {}

  @Command('kanallar')
  async list(@Ctx() ctx: Context) {
    await this.sendChannelList(ctx);
  }

  private async sendChannelList(ctx: Context) {
    const channels = await this.channelsService.findAll();
    const rows = channels.map((channel) => [
      { text: `${typeEmoji(channel.type)} ${channel.title}`, callback_data: `channel_view:${channel.id}` },
    ]);
    rows.push([{ text: BOT_TEXTS.addChannelButton, callback_data: 'channel_add' }]);
    const text = channels.length ? BOT_TEXTS.channelsListHeader : BOT_TEXTS.channelsListEmpty;
    await ctx.reply(text, { reply_markup: { inline_keyboard: rows } });
  }

  @Action('channel_add')
  async onAdd(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.pendingChannelActionService.startTypeChoice(ctx.from!.id);
    await ctx.reply(BOT_TEXTS.askChannelType, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.telegramTypeButton, callback_data: 'channel_type:TELEGRAM' },
            { text: BOT_TEXTS.instagramTypeButton, callback_data: 'channel_type:INSTAGRAM' },
          ],
        ],
      },
    });
  }

  @Action(/^channel_type:(TELEGRAM|INSTAGRAM)$/)
  async onChooseType(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const type = ctx.match[1];
    const userId = ctx.from!.id;
    if (type === 'TELEGRAM') {
      await this.pendingChannelActionService.setWaitingTelegramIdentifier(userId);
      await ctx.reply(BOT_TEXTS.askChannelIdentifier, { parse_mode: 'Markdown' });
    } else {
      await this.pendingChannelActionService.setWaitingInstagramLink(userId);
      await ctx.reply(BOT_TEXTS.askInstagramLink);
    }
  }

  @Action(/^channel_view:(\d+)$/)
  async onView(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const channel = await this.channelsService.findById(id);
    if (!channel) return;
    await ctx.reply(`${typeEmoji(channel.type)} ${channel.title}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.editChannelButton, callback_data: `channel_edit:${id}` },
            { text: BOT_TEXTS.deleteChannelButton, callback_data: `channel_delete_ask:${id}` },
          ],
        ],
      },
    });
  }

  @Action(/^channel_edit:(\d+)$/)
  async onEdit(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const channel = await this.channelsService.findById(id);
    if (!channel) return;
    const userId = ctx.from!.id;
    if (channel.type === 'INSTAGRAM') {
      await this.pendingChannelActionService.setWaitingInstagramLink(userId, id);
      await ctx.reply(BOT_TEXTS.askInstagramLink);
    } else {
      await this.pendingChannelActionService.setWaitingTelegramIdentifier(userId, id);
      await ctx.reply(BOT_TEXTS.askChannelIdentifier, { parse_mode: 'Markdown' });
    }
  }

  @Action(/^channel_delete_ask:(\d+)$/)
  async onDeleteAsk(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const channel = await this.channelsService.findById(id);
    if (!channel) return;
    await ctx.reply(BOT_TEXTS.confirmDeleteChannel(channel.title), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.confirmDeleteButton, callback_data: `channel_delete:${id}` },
            { text: BOT_TEXTS.cancelDeleteButton, callback_data: 'channel_delete_cancel' },
          ],
        ],
      },
    });
  }

  @Action(/^channel_delete:(\d+)$/)
  async onDelete(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    await this.channelsService.delete(id);
    await ctx.reply(BOT_TEXTS.channelDeleted);
  }

  @Action('channel_delete_cancel')
  async onDeleteCancel(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(BOT_TEXTS.uploadCancelled);
  }
}

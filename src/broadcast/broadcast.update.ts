import { UseGuards } from '@nestjs/common';
import { Action, Command, Ctx, Next, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { AdminGuard } from '../common/admin.guard';
import { getAdminIds } from '../common/admin-ids';
import { BOT_TEXTS } from '../common/bot-texts';
import { BotUserService } from '../users/bot-user.service';
import { BroadcastService } from './broadcast.service';

type MatchContext = Context & { match: RegExpExecArray };
type NextFn = () => Promise<void>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Update()
export class BroadcastUpdate {
  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly botUserService: BotUserService,
  ) {}

  @Command('hammaga')
  @UseGuards(AdminGuard)
  async onStartBroadcast(@Ctx() ctx: Context) {
    await this.broadcastService.startWaiting(ctx.from!.id);
    await ctx.reply(BOT_TEXTS.askBroadcastMessage);
  }

  @Command('stats')
  @UseGuards(AdminGuard)
  async onStats(@Ctx() ctx: Context) {
    const count = await this.botUserService.count();
    await ctx.reply(BOT_TEXTS.userStats(count));
  }

  // The only handler in the bot that catches every message type (text, photo,
  // video, ...) — needed because a broadcast can be any kind of message, and
  // because it's the single point that tracks every user for /stats and
  // broadcasting (registered first in AppModule.providers so it sees a
  // message before any @Command/@On('video') handler can claim it). It must
  // never swallow anything it doesn't explicitly claim: every branch below
  // either replies and returns, or calls next() so bot.update.ts,
  // text-router.update.ts, upload.update.ts and every @Command handler keep
  // working normally.
  @On('message')
  async onMessage(@Ctx() ctx: Context, @Next() next: NextFn) {
    const userId = ctx.from?.id;
    if (userId) {
      await this.botUserService.track(userId);
    }

    if (!userId) {
      await next();
      return;
    }

    const message = ctx.message as Message;
    if ('text' in message && message.text.startsWith('/')) {
      await next();
      return;
    }

    if (!getAdminIds().includes(userId)) {
      await next();
      return;
    }

    const waiting = await this.broadcastService.getWaiting(userId);
    if (!waiting) {
      await next();
      return;
    }

    await this.broadcastService.clearWaiting(userId);
    const broadcast = await this.broadcastService.createDraft(
      userId,
      ctx.chat!.id,
      message.message_id,
    );
    await ctx.reply(BOT_TEXTS.broadcastSaved(broadcast.id), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: BOT_TEXTS.confirmBroadcastButton,
              callback_data: `broadcast_confirm:${broadcast.id}`,
            },
            {
              text: BOT_TEXTS.cancelBroadcastButton,
              callback_data: `broadcast_cancel:${broadcast.id}`,
            },
          ],
        ],
      },
    });
  }

  @Action(/^broadcast_confirm:(\d+)$/)
  @UseGuards(AdminGuard)
  async onConfirm(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const broadcast = await this.broadcastService.findById(id);
    if (!broadcast || broadcast.status !== 'DRAFT') {
      await ctx.reply(BOT_TEXTS.uploadCancelled);
      return;
    }

    await ctx.reply(BOT_TEXTS.broadcastSending);

    const users = await this.botUserService.findAllIds();
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await ctx.telegram.copyMessage(
          Number(user.telegramId),
          Number(broadcast.sourceChatId),
          broadcast.sourceMessageId,
        );
        sent++;
      } catch {
        failed++;
      }
      await sleep(35); // stay under Telegram's ~30 messages/second guideline
    }

    await this.broadcastService.markSent(id, sent, failed);
    await ctx.reply(BOT_TEXTS.broadcastComplete(sent, failed));
  }

  @Action(/^broadcast_cancel:(\d+)$/)
  @UseGuards(AdminGuard)
  async onCancel(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    await this.broadcastService.deleteDraft(id);
    await ctx.reply(BOT_TEXTS.uploadCancelled);
  }
}

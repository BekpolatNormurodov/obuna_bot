import { Ctx, Next, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { BOT_TEXTS } from '../common/bot-texts';
import { getAdminIds } from '../common/admin-ids';
import { ChannelNotAdminError, ChannelsService } from '../channels/channels.service';
import { PendingChannelActionService } from '../channels/pending-channel-action.service';
import { MoviesService } from '../movies/movies.service';
import { PendingUploadService } from '../movies/pending-upload.service';
import { parseSearchQuery } from '../movies/search-query';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';

type NextFn = () => Promise<void>;

@Update()
export class TextRouterUpdate {
  constructor(
    private readonly pendingUploadService: PendingUploadService,
    private readonly pendingChannelActionService: PendingChannelActionService,
    private readonly channelsService: ChannelsService,
    private readonly moviesService: MoviesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @On('text')
  async onText(@Ctx() ctx: Context, @Next() next: NextFn) {
    const userId = ctx.from?.id;
    const text = (ctx.message as Message.TextMessage).text.trim();
    if (!userId || !text || text.startsWith('/')) {
      await next();
      return;
    }

    if (getAdminIds().includes(userId)) {
      if (await this.handlePendingUpload(ctx, userId, text)) return;
      if (await this.handlePendingChannelAction(ctx, userId, text)) return;
    }

    await this.handleMovieLookup(ctx, userId, text, next);
  }

  private async handlePendingUpload(ctx: Context, userId: number, text: string) {
    const pending = await this.pendingUploadService.get(userId);
    if (!pending) return false;

    if (pending.step === 'AWAITING_CHOICE' || pending.step === 'CONFIRM_REPLACE') {
      await ctx.reply(BOT_TEXTS.pendingChoiceReminder);
      return true;
    }

    if (pending.step === 'WAITING_TITLE') {
      const movie = await this.moviesService.create({ title: text, fileId: pending.fileId });
      await this.pendingUploadService.clear(userId);
      await ctx.reply(BOT_TEXTS.movieSaved(movie.id));
      return true;
    }

    if (pending.step === 'WAITING_EDIT_NUMBER') {
      const id = Number(text);
      if (!Number.isInteger(id)) {
        await ctx.reply(BOT_TEXTS.askEditNumber);
        return true;
      }
      const movie = await this.moviesService.findById(id);
      if (!movie) {
        await ctx.reply(BOT_TEXTS.editNumberNotFound(id));
        return true;
      }
      await this.pendingUploadService.setConfirmReplace(userId, movie.id);
      await ctx.reply(BOT_TEXTS.confirmReplaceMovie(movie.id, movie.title), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: BOT_TEXTS.confirmReplaceButton, callback_data: 'confirm_replace' },
              { text: BOT_TEXTS.cancelReplaceButton, callback_data: 'cancel_replace' },
            ],
          ],
        },
      });
      return true;
    }

    return false;
  }

  private async handlePendingChannelAction(ctx: Context, userId: number, text: string) {
    const pending = await this.pendingChannelActionService.get(userId);
    if (!pending) return false;

    try {
      const resolved = await this.channelsService.resolveChannel(text);
      if (pending.step === 'WAITING_ADD') {
        await this.channelsService.create(resolved);
      } else {
        await this.channelsService.update(pending.targetChannelId as number, resolved);
      }
      await this.pendingChannelActionService.clear(userId);
      await ctx.reply(BOT_TEXTS.channelSaved(resolved.title));
    } catch (error) {
      if (error instanceof ChannelNotAdminError) {
        await ctx.reply(BOT_TEXTS.botNotAdminInChannel);
      } else {
        await ctx.reply(BOT_TEXTS.channelResolveError);
      }
    }
    return true;
  }

  private async handleMovieLookup(ctx: Context, userId: number, text: string, next: NextFn) {
    const query = parseSearchQuery(text);
    if (!query || query.type !== 'number') {
      await next();
      return;
    }

    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      await ctx.reply(BOT_TEXTS.subscribeRequired, buildSubscriptionKeyboard(missing));
      return;
    }

    const movie = await this.moviesService.findById(query.value);
    if (!movie) {
      await ctx.reply(BOT_TEXTS.movieNotFound);
      return;
    }
    await ctx.replyWithVideo(movie.fileId);
  }
}

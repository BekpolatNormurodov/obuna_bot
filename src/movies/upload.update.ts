import { UseGuards } from '@nestjs/common';
import { Action, Command, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { AdminGuard } from '../common/admin.guard';
import { BOT_TEXTS } from '../common/bot-texts';
import { PendingChannelActionService } from '../channels/pending-channel-action.service';
import { MoviesService } from './movies.service';
import { PendingUploadService } from './pending-upload.service';

@Update()
@UseGuards(AdminGuard)
export class UploadUpdate {
  constructor(
    private readonly pendingUploadService: PendingUploadService,
    private readonly pendingChannelActionService: PendingChannelActionService,
    private readonly moviesService: MoviesService,
  ) {}

  @On('video')
  async onVideo(@Ctx() ctx: Context) {
    const message = ctx.message as Message.VideoMessage;
    const fileId = message.video.file_id;
    const caption = message.caption ?? null;
    await this.pendingUploadService.startUpload(ctx.from!.id, fileId, caption);
    await ctx.reply(BOT_TEXTS.chooseSaveOrReplace, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.saveNewButton, callback_data: 'save_new' },
            { text: BOT_TEXTS.replaceExistingButton, callback_data: 'save_replace' },
          ],
        ],
      },
    });
  }

  @Action('save_new')
  async onChooseSaveNew(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    await this.pendingUploadService.setWaitingTitle(userId);
    const pending = await this.pendingUploadService.get(userId);
    const text = pending?.caption
      ? BOT_TEXTS.askTitleWithSuggestion(pending.caption)
      : BOT_TEXTS.askTitle;
    await ctx.reply(text);
  }

  @Action('save_replace')
  async onChooseReplace(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.pendingUploadService.setWaitingEditNumber(ctx.from!.id);
    await ctx.reply(BOT_TEXTS.askEditNumber);
  }

  @Action('confirm_replace')
  async onConfirmReplace(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const pending = await this.pendingUploadService.get(userId);
    if (!pending || pending.step !== 'CONFIRM_REPLACE' || pending.targetMovieId === null) {
      await ctx.reply(BOT_TEXTS.uploadCancelled);
      return;
    }
    await this.moviesService.updateFileId(pending.targetMovieId, pending.fileId);
    await this.pendingUploadService.clear(userId);
    await ctx.reply(BOT_TEXTS.movieUpdated(pending.targetMovieId));
  }

  @Action('cancel_replace')
  async onCancelReplace(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.pendingUploadService.clear(ctx.from!.id);
    await ctx.reply(BOT_TEXTS.uploadCancelled);
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Context) {
    const userId = ctx.from!.id;
    await this.pendingUploadService.clear(userId);
    await this.pendingChannelActionService.clear(userId);
    await ctx.reply(BOT_TEXTS.uploadCancelled);
  }
}

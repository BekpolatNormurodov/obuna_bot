import { Action, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { InstagramFollowService } from '../channels/instagram-follow.service';
import { BOT_TEXTS } from '../common/bot-texts';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';

type MatchContext = Context & { match: RegExpExecArray };

@Update()
export class BotUpdate {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly instagramFollowService: InstagramFollowService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.sendGateOrWelcome(ctx, false);
  }

  @Action('check_subscription')
  async onCheckSubscription(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.sendGateOrWelcome(ctx, true);
  }

  @Action(/^ig_confirm:(\d+)$/)
  async onConfirmInstagram(@Ctx() ctx: MatchContext) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const channelId = Number(ctx.match[1]);
    await this.instagramFollowService.confirm(channelId, userId);
    await ctx.answerCbQuery(BOT_TEXTS.instagramConfirmedToast);
    await this.sendGateOrWelcome(ctx, true);
  }

  private async sendGateOrWelcome(ctx: Context, isRecheck: boolean) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      const text = isRecheck ? BOT_TEXTS.stillNotSubscribed : BOT_TEXTS.subscribeRequired;
      await ctx.reply(text, buildSubscriptionKeyboard(missing));
      return;
    }
    await ctx.reply(BOT_TEXTS.welcome, { parse_mode: 'Markdown' });
  }
}

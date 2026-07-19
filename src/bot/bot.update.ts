import { Action, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BOT_TEXTS } from '../common/bot-texts';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';

@Update()
export class BotUpdate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.sendGateOrWelcome(ctx, false);
  }

  @Action('check_subscription')
  async onCheckSubscription(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
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
    await ctx.reply(BOT_TEXTS.welcome);
  }
}

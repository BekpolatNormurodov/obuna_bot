import { Action, Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BOT_TEXTS } from '../common/bot-texts';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';
import { MoviesService } from './movies.service';
import { parseSearchQuery } from './search-query';

type MatchContext = Context & { match: RegExpExecArray };

@Update()
export class MoviesUpdate {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Command('search')
  async onSearch(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      await ctx.reply(BOT_TEXTS.subscribeRequired, buildSubscriptionKeyboard(missing));
      return;
    }

    const messageText = (ctx.message as { text: string }).text;
    const raw = messageText.replace(/^\/search(@\w+)?\s*/, '');
    const query = parseSearchQuery(raw);
    if (!query) {
      await ctx.reply(BOT_TEXTS.movieNotFound, { parse_mode: 'Markdown' });
      return;
    }

    if (query.type === 'number') {
      const movie = await this.moviesService.findById(query.value);
      if (!movie) {
        await ctx.reply(BOT_TEXTS.movieNotFound, { parse_mode: 'Markdown' });
        return;
      }
      await ctx.replyWithVideo(movie.fileId);
      return;
    }

    const movies = await this.moviesService.searchByTitle(query.value);
    if (movies.length === 0) {
      await ctx.reply(BOT_TEXTS.movieNotFound, { parse_mode: 'Markdown' });
      return;
    }
    const rows = movies.map((movie) => [
      { text: `#${movie.id} — ${movie.title}`, callback_data: `movie_get:${movie.id}` },
    ]);
    await ctx.reply(BOT_TEXTS.searchResultsHeader, { reply_markup: { inline_keyboard: rows } });
  }

  @Action(/^movie_get:(\d+)$/)
  async onGetFromSearch(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      await ctx.reply(BOT_TEXTS.subscribeRequired, buildSubscriptionKeyboard(missing));
      return;
    }

    const id = Number(ctx.match[1]);
    const movie = await this.moviesService.findById(id);
    if (!movie) {
      await ctx.reply(BOT_TEXTS.movieNotFound, { parse_mode: 'Markdown' });
      return;
    }
    await ctx.replyWithVideo(movie.fileId);
  }
}

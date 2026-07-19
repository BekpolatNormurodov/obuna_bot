import { Action, Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BOT_TEXTS } from '../common/bot-texts';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';
import { buildMoviesListKeyboard, MOVIES_PAGE_SIZE } from './movies-list-keyboard';
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

  @Command('kinolar')
  async onListAll(@Ctx() ctx: Context) {
    await this.sendMoviesPage(ctx, 0, false);
  }

  @Action(/^movies_page:(\d+)$/)
  async onPageChange(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const page = Number(ctx.match[1]);
    await this.sendMoviesPage(ctx, page, true);
  }

  @Action('noop')
  async onNoop(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
  }

  private async sendMoviesPage(ctx: Context, page: number, edit: boolean) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      await ctx.reply(BOT_TEXTS.subscribeRequired, buildSubscriptionKeyboard(missing));
      return;
    }

    const { movies, total } = await this.moviesService.findPage(page, MOVIES_PAGE_SIZE);
    if (total === 0) {
      await ctx.reply(BOT_TEXTS.noMoviesYet);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / MOVIES_PAGE_SIZE));
    const text = BOT_TEXTS.allMoviesHeader(page + 1, totalPages);
    const reply_markup = buildMoviesListKeyboard(movies, page, total, MOVIES_PAGE_SIZE);

    if (edit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
      } catch {
        // Telegram rejects a no-op edit (identical content) or an edit on a stale
        // message — the callback query is already acknowledged, safe to ignore.
      }
      return;
    }
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
}

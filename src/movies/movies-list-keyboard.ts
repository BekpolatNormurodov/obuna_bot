import { BOT_TEXTS } from '../common/bot-texts';

export const MOVIES_PAGE_SIZE = 10;

export interface MovieListItem {
  id: number;
  title: string;
}

type Button = { text: string; callback_data: string };

export function buildMoviesListKeyboard(
  movies: MovieListItem[],
  page: number,
  total: number,
  pageSize: number = MOVIES_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows: Button[][] = [];

  for (let i = 0; i < movies.length; i += 2) {
    const row: Button[] = [
      { text: `#${movies[i].id} — ${movies[i].title}`, callback_data: `movie_get:${movies[i].id}` },
    ];
    const second = movies[i + 1];
    if (second) {
      row.push({ text: `#${second.id} — ${second.title}`, callback_data: `movie_get:${second.id}` });
    }
    rows.push(row);
  }

  const navRow: Button[] = [];
  if (page > 0) {
    navRow.push({ text: BOT_TEXTS.prevPageButton, callback_data: `movies_page:${page - 1}` });
  }
  navRow.push({ text: `${page + 1}/${totalPages}`, callback_data: 'noop' });
  if (page + 1 < totalPages) {
    navRow.push({ text: BOT_TEXTS.nextPageButton, callback_data: `movies_page:${page + 1}` });
  }
  if (navRow.length > 1) {
    rows.push(navRow);
  }

  return { inline_keyboard: rows };
}

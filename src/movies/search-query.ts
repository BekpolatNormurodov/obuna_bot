export type SearchQuery =
  | { type: 'number'; value: number }
  | { type: 'title'; value: string };

export function parseSearchQuery(raw: string): SearchQuery | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return { type: 'number', value: Number(trimmed) };
  }
  return { type: 'title', value: trimmed };
}

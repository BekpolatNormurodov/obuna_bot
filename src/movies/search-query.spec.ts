import { parseSearchQuery } from './search-query';

describe('parseSearchQuery', () => {
  it('parses a pure numeric string as a number query', () => {
    expect(parseSearchQuery('120')).toEqual({ type: 'number', value: 120 });
  });

  it('parses non-numeric text as a title query', () => {
    expect(parseSearchQuery('Sherlok Xolms')).toEqual({
      type: 'title',
      value: 'Sherlok Xolms',
    });
  });

  it('trims surrounding whitespace before deciding the type', () => {
    expect(parseSearchQuery('  42  ')).toEqual({ type: 'number', value: 42 });
  });

  it('returns null for an empty or whitespace-only query', () => {
    expect(parseSearchQuery('   ')).toBeNull();
    expect(parseSearchQuery('')).toBeNull();
  });
});

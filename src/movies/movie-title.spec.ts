import { extractMovieTitle } from './movie-title';

describe('extractMovieTitle', () => {
  it('extracts the title from a "FILM NOMI:" labeled line', () => {
    const caption =
      "FILM NOMI: LANATLANGAN ROHIBA \n" +
      "------------------------------------------------------------\n" +
      "✅| TILI: O'ZBEK TILIDA \n" +
      "✅| JANRI: UJAS \n" +
      "✅| SIFATI: 720";
    expect(extractMovieTitle(caption)).toBe('LANATLANGAN ROHIBA');
  });

  it('falls back to the first non-empty line when there is no labeled line', () => {
    expect(extractMovieTitle('Sherlok Xolms\nboshqa qator')).toBe('Sherlok Xolms');
  });

  it('trims whitespace around the extracted title', () => {
    expect(extractMovieTitle('  Titanik  ')).toBe('Titanik');
  });

  it('matches the label case-insensitively and with a dash separator', () => {
    expect(extractMovieTitle('film nomi - Avatar 2')).toBe('Avatar 2');
  });
});

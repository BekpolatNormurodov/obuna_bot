import { getMissingChannels, isSubscribedToAll } from './subscription-check';

describe('subscription-check', () => {
  const azartnik = { chatId: '-1002949185784', title: 'AZARTNIK UZ', isMember: true };
  const other = { chatId: '-1009999999999', title: 'Boshqa kanal', isMember: false };

  it('returns an empty array when every channel is joined', () => {
    expect(getMissingChannels([azartnik])).toEqual([]);
  });

  it('returns only the channels that are not joined', () => {
    expect(getMissingChannels([azartnik, other])).toEqual([other]);
  });

  it('returns an empty array for an empty input', () => {
    expect(getMissingChannels([])).toEqual([]);
  });

  it('isSubscribedToAll is true only when nothing is missing', () => {
    expect(isSubscribedToAll([azartnik])).toBe(true);
    expect(isSubscribedToAll([azartnik, other])).toBe(false);
    expect(isSubscribedToAll([])).toBe(true);
  });
});

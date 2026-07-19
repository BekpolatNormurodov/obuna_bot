export interface Membership {
  isMember: boolean;
}

export function getMissingChannels<T extends Membership>(items: T[]): T[] {
  return items.filter((item) => !item.isMember);
}

export function isSubscribedToAll<T extends Membership>(items: T[]): boolean {
  return getMissingChannels(items).length === 0;
}

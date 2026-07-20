import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class BotUserService {
  constructor(private readonly prisma: PrismaService) {}

  async track(telegramId: number) {
    try {
      await this.prisma.botUser.upsert({
        where: { telegramId: BigInt(telegramId) },
        update: {},
        create: { telegramId: BigInt(telegramId) },
      });
    } catch (error) {
      // Two concurrent updates from the same user (or a redelivered update)
      // can both see "no row yet" and both attempt to create it — the loser
      // hits a unique constraint violation even though the outcome (a
      // tracked row for this user) is exactly what we wanted anyway.
      const isDuplicateRace =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (!isDuplicateRace) {
        throw error;
      }
    }
  }

  count() {
    return this.prisma.botUser.count();
  }

  findAllIds(excludeTelegramId?: number) {
    return this.prisma.botUser.findMany({
      where:
        excludeTelegramId !== undefined ? { telegramId: { not: BigInt(excludeTelegramId) } } : undefined,
      select: { telegramId: true },
    });
  }
}

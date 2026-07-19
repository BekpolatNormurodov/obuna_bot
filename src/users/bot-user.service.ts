import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotUserService {
  constructor(private readonly prisma: PrismaService) {}

  async track(telegramId: number) {
    await this.prisma.botUser.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: {},
      create: { telegramId: BigInt(telegramId) },
    });
  }

  count() {
    return this.prisma.botUser.count();
  }

  findAllIds() {
    return this.prisma.botUser.findMany({ select: { telegramId: true } });
  }
}

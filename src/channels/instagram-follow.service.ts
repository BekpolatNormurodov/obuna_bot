import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstagramFollowService {
  constructor(private readonly prisma: PrismaService) {}

  async isConfirmed(channelId: number, userId: number): Promise<boolean> {
    const row = await this.prisma.instagramFollow.findUnique({
      where: { channelId_userId: { channelId, userId: BigInt(userId) } },
    });
    return row?.confirmed ?? false;
  }

  async confirm(channelId: number, userId: number) {
    await this.prisma.instagramFollow.upsert({
      where: { channelId_userId: { channelId, userId: BigInt(userId) } },
      create: { channelId, userId: BigInt(userId), confirmed: true },
      update: { confirmed: true },
    });
  }
}

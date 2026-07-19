import { Injectable } from '@nestjs/common';
import { ChannelActionStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PendingChannelActionService {
  constructor(private readonly prisma: PrismaService) {}

  startTypeChoice(adminId: number) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, step: ChannelActionStep.WAITING_TYPE },
      update: { step: ChannelActionStep.WAITING_TYPE, targetChannelId: null, draftLink: null },
    });
  }

  setWaitingTelegramIdentifier(adminId: number, targetChannelId?: number) {
    const adminIdBig = BigInt(adminId);
    const data = {
      step: ChannelActionStep.WAITING_TELEGRAM_IDENTIFIER,
      targetChannelId: targetChannelId ?? null,
      draftLink: null,
    };
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, ...data },
      update: data,
    });
  }

  setWaitingInstagramLink(adminId: number, targetChannelId?: number) {
    const adminIdBig = BigInt(adminId);
    const data = {
      step: ChannelActionStep.WAITING_INSTAGRAM_LINK,
      targetChannelId: targetChannelId ?? null,
      draftLink: null,
    };
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, ...data },
      update: data,
    });
  }

  setInstagramLink(adminId: number, link: string) {
    return this.prisma.pendingChannelAction.update({
      where: { adminId: BigInt(adminId) },
      data: { step: ChannelActionStep.WAITING_INSTAGRAM_TITLE, draftLink: link },
    });
  }

  get(adminId: number) {
    return this.prisma.pendingChannelAction.findUnique({ where: { adminId: BigInt(adminId) } });
  }

  clear(adminId: number) {
    return this.prisma.pendingChannelAction.deleteMany({ where: { adminId: BigInt(adminId) } });
  }
}

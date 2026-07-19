import { Injectable } from '@nestjs/common';
import { ChannelActionStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PendingChannelActionService {
  constructor(private readonly prisma: PrismaService) {}

  startAdd(adminId: number) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, step: ChannelActionStep.WAITING_ADD },
      update: { step: ChannelActionStep.WAITING_ADD, targetChannelId: null },
    });
  }

  startEdit(adminId: number, targetChannelId: number) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, step: ChannelActionStep.WAITING_EDIT, targetChannelId },
      update: { step: ChannelActionStep.WAITING_EDIT, targetChannelId },
    });
  }

  get(adminId: number) {
    return this.prisma.pendingChannelAction.findUnique({ where: { adminId: BigInt(adminId) } });
  }

  clear(adminId: number) {
    return this.prisma.pendingChannelAction.deleteMany({ where: { adminId: BigInt(adminId) } });
  }
}

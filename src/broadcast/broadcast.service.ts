import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BroadcastService {
  constructor(private readonly prisma: PrismaService) {}

  startWaiting(adminId: number) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingBroadcast.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig },
      update: {},
    });
  }

  getWaiting(adminId: number) {
    return this.prisma.pendingBroadcast.findUnique({ where: { adminId: BigInt(adminId) } });
  }

  clearWaiting(adminId: number) {
    return this.prisma.pendingBroadcast.deleteMany({ where: { adminId: BigInt(adminId) } });
  }

  createDraft(adminId: number, sourceChatId: number, sourceMessageId: number) {
    return this.prisma.broadcast.create({
      data: { adminId: BigInt(adminId), sourceChatId: BigInt(sourceChatId), sourceMessageId },
    });
  }

  findById(id: number) {
    return this.prisma.broadcast.findUnique({ where: { id } });
  }

  markSent(id: number, sentCount: number, failedCount: number) {
    return this.prisma.broadcast.update({
      where: { id },
      data: { status: 'SENT', sentCount, failedCount },
    });
  }

  deleteDraft(id: number) {
    return this.prisma.broadcast.deleteMany({ where: { id, status: 'DRAFT' } });
  }
}

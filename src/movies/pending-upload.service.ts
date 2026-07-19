import { Injectable } from '@nestjs/common';
import { PendingStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PendingUploadService {
  constructor(private readonly prisma: PrismaService) {}

  startUpload(adminId: number, fileId: string, caption: string | null) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingUpload.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, fileId, caption, step: PendingStep.AWAITING_CHOICE },
      update: { fileId, caption, step: PendingStep.AWAITING_CHOICE, targetMovieId: null },
    });
  }

  get(adminId: number) {
    return this.prisma.pendingUpload.findUnique({ where: { adminId: BigInt(adminId) } });
  }

  setWaitingTitle(adminId: number) {
    return this.prisma.pendingUpload.update({
      where: { adminId: BigInt(adminId) },
      data: { step: PendingStep.WAITING_TITLE },
    });
  }

  setWaitingEditNumber(adminId: number) {
    return this.prisma.pendingUpload.update({
      where: { adminId: BigInt(adminId) },
      data: { step: PendingStep.WAITING_EDIT_NUMBER },
    });
  }

  setConfirmReplace(adminId: number, targetMovieId: number) {
    return this.prisma.pendingUpload.update({
      where: { adminId: BigInt(adminId) },
      data: { step: PendingStep.CONFIRM_REPLACE, targetMovieId },
    });
  }

  clear(adminId: number) {
    return this.prisma.pendingUpload.deleteMany({ where: { adminId: BigInt(adminId) } });
  }
}

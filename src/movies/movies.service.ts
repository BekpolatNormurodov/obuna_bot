import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.movie.findUnique({ where: { id } });
  }

  searchByTitle(title: string) {
    return this.prisma.movie.findMany({
      where: { title: { contains: title } },
      orderBy: { id: 'asc' },
      take: 20,
    });
  }

  create(data: { title: string; fileId: string }) {
    return this.prisma.movie.create({ data });
  }

  updateFileId(id: number, fileId: string) {
    return this.prisma.movie.update({ where: { id }, data: { fileId } });
  }
}

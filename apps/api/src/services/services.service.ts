import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertServiceDto } from './dto/upsert-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  list(hotelId: string) {
    return this.prisma.service.findMany({ where: { hotelId }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  async findOne(hotelId: string, id: string) {
    const service = await this.prisma.service.findFirst({ where: { id, hotelId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return service;
  }

  create(hotelId: string, dto: UpsertServiceDto) {
    return this.prisma.service.create({ data: { hotelId, ...dto } });
  }

  async update(hotelId: string, id: string, dto: UpsertServiceDto) {
    await this.findOne(hotelId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }
}

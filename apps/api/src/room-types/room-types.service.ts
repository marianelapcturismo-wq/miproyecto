import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRoomTypeDto } from './dto/upsert-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}

  list(hotelId: string) {
    return this.prisma.roomType.findMany({ where: { hotelId }, orderBy: { basePrice: 'asc' }, include: { _count: { select: { rooms: true } } } });
  }

  async findOne(hotelId: string, id: string) {
    const roomType = await this.prisma.roomType.findFirst({ where: { id, hotelId } });
    if (!roomType) throw new NotFoundException('Tipo de habitación no encontrado');
    return roomType;
  }

  create(hotelId: string, dto: UpsertRoomTypeDto) {
    return this.prisma.roomType.create({ data: { hotelId, ...dto } });
  }

  async update(hotelId: string, id: string, dto: UpsertRoomTypeDto) {
    await this.findOne(hotelId, id);
    return this.prisma.roomType.update({ where: { id }, data: dto });
  }
}

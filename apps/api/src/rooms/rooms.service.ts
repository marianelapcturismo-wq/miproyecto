import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRoomDto } from './dto/upsert-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  list(hotelId: string, status?: RoomStatus, roomTypeId?: string) {
    return this.prisma.room.findMany({
      where: { hotelId, ...(status ? { status } : {}), ...(roomTypeId ? { roomTypeId } : {}) },
      include: { roomType: true },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(hotelId: string, id: string) {
    const room = await this.prisma.room.findFirst({ where: { id, hotelId }, include: { roomType: true } });
    if (!room) throw new NotFoundException('Habitación no encontrada');
    return room;
  }

  create(hotelId: string, dto: UpsertRoomDto) {
    return this.prisma.room.create({ data: { hotelId, ...dto } });
  }

  async update(hotelId: string, id: string, dto: UpsertRoomDto) {
    await this.findOne(hotelId, id);
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async updateStatus(hotelId: string, id: string, dto: UpdateRoomStatusDto, userId: string) {
    const room = await this.findOne(hotelId, id);
    const updated = await this.prisma.room.update({ where: { id }, data: { status: dto.status, notes: dto.notes ?? room.notes } });
    await this.audit.log({
      hotelId,
      userId,
      action: 'room.status.update',
      entityType: 'Room',
      entityId: id,
      before: { status: room.status },
      after: { status: updated.status },
    });
    return updated;
  }
}

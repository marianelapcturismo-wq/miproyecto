import { Injectable, NotFoundException } from '@nestjs/common';
import { HousekeepingStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';

@Injectable()
export class HousekeepingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private include() {
    return {
      room: { include: { roomType: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    };
  }

  list(hotelId: string, status?: HousekeepingStatus) {
    return this.prisma.housekeepingTask.findMany({
      where: { hotelId, ...(status ? { status } : {}) },
      include: this.include(),
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(hotelId: string, id: string) {
    const task = await this.prisma.housekeepingTask.findFirst({ where: { id, hotelId }, include: this.include() });
    if (!task) throw new NotFoundException('Tarea de housekeeping no encontrada');
    return task;
  }

  create(hotelId: string, dto: CreateHousekeepingTaskDto) {
    return this.prisma.housekeepingTask.create({ data: { hotelId, ...dto }, include: this.include() });
  }

  async updateStatus(hotelId: string, id: string, dto: UpdateHousekeepingTaskDto, userId: string) {
    const existing = await this.findOne(hotelId, id);

    const updated = await this.prisma.housekeepingTask.update({
      where: { id },
      data: {
        status: dto.status,
        assignedToId: dto.assignedToId,
        notes: dto.notes,
        completedAt: dto.status === HousekeepingStatus.INSPECCIONADA ? new Date() : existing.completedAt,
      },
      include: this.include(),
    });

    if (dto.status === HousekeepingStatus.INSPECCIONADA) {
      await this.prisma.room.update({ where: { id: existing.roomId }, data: { status: RoomStatus.DISPONIBLE } });
    }

    await this.audit.log({
      hotelId,
      userId,
      action: 'housekeeping.status.update',
      entityType: 'HousekeepingTask',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
    });
    return updated;
  }
}

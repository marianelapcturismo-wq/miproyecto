import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { UpdateMaintenanceTaskDto } from './dto/update-maintenance-task.dto';

@Injectable()
export class MaintenanceService {
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

  list(hotelId: string, status?: MaintenanceStatus) {
    return this.prisma.maintenanceTask.findMany({
      where: { hotelId, ...(status ? { status } : {}) },
      include: this.include(),
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(hotelId: string, id: string) {
    const task = await this.prisma.maintenanceTask.findFirst({ where: { id, hotelId }, include: this.include() });
    if (!task) throw new NotFoundException('Tarea de mantenimiento no encontrada');
    return task;
  }

  async create(hotelId: string, dto: CreateMaintenanceTaskDto, userId: string) {
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, hotelId } });
    if (!room) throw new NotFoundException('Habitación no encontrada');

    const [task] = await this.prisma.$transaction([
      this.prisma.maintenanceTask.create({ data: { hotelId, ...dto }, include: this.include() }),
      this.prisma.room.update({ where: { id: dto.roomId }, data: { status: RoomStatus.MANTENIMIENTO } }),
    ]);

    await this.audit.log({ hotelId, userId, action: 'maintenance.create', entityType: 'MaintenanceTask', entityId: task.id, after: task });
    return task;
  }

  async update(hotelId: string, id: string, dto: UpdateMaintenanceTaskDto, userId: string) {
    const existing = await this.findOne(hotelId, id);

    const updated = await this.prisma.maintenanceTask.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
        assignedToId: dto.assignedToId,
        notes: dto.notes,
        resolvedAt: dto.status === MaintenanceStatus.RESUELTO ? new Date() : existing.resolvedAt,
      },
      include: this.include(),
    });

    if (dto.status === MaintenanceStatus.RESUELTO) {
      const otherOpenTasks = await this.prisma.maintenanceTask.count({
        where: { hotelId, roomId: existing.roomId, status: { not: MaintenanceStatus.RESUELTO }, id: { not: id } },
      });
      if (otherOpenTasks === 0) {
        await this.prisma.room.update({ where: { id: existing.roomId }, data: { status: RoomStatus.DISPONIBLE } });
      }
    }

    await this.audit.log({
      hotelId,
      userId,
      action: 'maintenance.update',
      entityType: 'MaintenanceTask',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
    });
    return updated;
  }
}

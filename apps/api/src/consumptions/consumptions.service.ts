import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateConsumptionDto } from './dto/create-consumption.dto';

@Injectable()
export class ConsumptionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  list(hotelId: string, reservationId: string) {
    return this.prisma.consumption.findMany({
      where: { hotelId, reservationId },
      include: { service: true },
      orderBy: { date: 'desc' },
    });
  }

  async create(hotelId: string, dto: CreateConsumptionDto, userId: string) {
    const reservation = await this.prisma.reservation.findFirst({ where: { id: dto.reservationId, hotelId } });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (['CANCELADA', 'NO_SHOW', 'CHECK_OUT'].includes(reservation.status)) {
      throw new BadRequestException('No se pueden cargar consumos a una reserva cancelada, no-show o ya finalizada.');
    }

    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, hotelId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');

    const consumption = await this.prisma.consumption.create({
      data: {
        hotelId,
        reservationId: dto.reservationId,
        serviceId: dto.serviceId,
        quantity: dto.quantity,
        unitPrice: service.price,
        notes: dto.notes,
        registeredById: userId,
      },
      include: { service: true },
    });

    await this.audit.log({ hotelId, userId, action: 'consumption.create', entityType: 'Consumption', entityId: consumption.id, after: consumption });
    return consumption;
  }
}

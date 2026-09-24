import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(hotelId: string, dto: CreatePaymentDto, userId: string) {
    const reservation = await this.prisma.reservation.findFirst({ where: { id: dto.reservationId, hotelId } });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');

    const payment = await this.prisma.payment.create({
      data: {
        hotelId,
        reservationId: dto.reservationId,
        amount: dto.amount,
        method: dto.method,
        type: dto.type,
        notes: dto.notes,
        registeredById: userId,
      },
    });

    await this.audit.log({ hotelId, userId, action: 'payment.create', entityType: 'Payment', entityId: payment.id, after: payment });
    return payment;
  }

  listPendingBalances(hotelId: string) {
    // Se resuelve en DashboardService reutilizando ReservationsService.withBalance
    return this.prisma.reservation.findMany({
      where: { hotelId, status: { in: ['CONFIRMADA', 'CHECK_IN'] } },
      include: { payments: true, titularGuest: true, room: true },
    });
  }
}

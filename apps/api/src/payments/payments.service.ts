import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashService } from '../cash/cash.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cash: CashService,
  ) {}

  async create(hotelId: string, dto: CreatePaymentDto, userId: string) {
    const reservation = await this.prisma.reservation.findFirst({ where: { id: dto.reservationId, hotelId }, include: { titularGuest: true } });
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

    const guestName = `${reservation.titularGuest.lastName}, ${reservation.titularGuest.firstName}`;
    await this.cash.registerPaymentMovement(hotelId, payment, `Pago reserva ${guestName}`, userId);

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

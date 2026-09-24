import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReservationStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ListReservationsQuery } from './dto/list-reservations.query';

const ACTIVE_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONSULTA,
  ReservationStatus.PRE_RESERVA,
  ReservationStatus.CONFIRMADA,
  ReservationStatus.CHECK_IN,
];

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private include() {
    return {
      titularGuest: true,
      room: { include: { roomType: true } },
      ratePlan: true,
      payments: { orderBy: { createdAt: 'desc' as const } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    };
  }

  withBalance<T extends { agreedPricePerNight: Prisma.Decimal | number; checkInDate: Date; checkOutDate: Date; payments: { amount: Prisma.Decimal | number; type: string }[] }>(
    reservation: T,
  ) {
    const nights = nightsBetween(new Date(reservation.checkInDate), new Date(reservation.checkOutDate));
    const total = nights * Number(reservation.agreedPricePerNight);
    const paid = reservation.payments.reduce((sum, p) => sum + (p.type === 'DEVOLUCION' ? -Number(p.amount) : Number(p.amount)), 0);
    return { ...reservation, nights, total, paid, balance: total - paid };
  }

  async list(hotelId: string, query: ListReservationsQuery) {
    const where: Prisma.ReservationWhereInput = { hotelId };
    if (query.status) where.status = query.status as ReservationStatus;
    if (query.roomId) where.roomId = query.roomId;
    if (query.roomTypeId) where.room = { roomTypeId: query.roomTypeId };
    if (query.from || query.to) {
      where.AND = [
        query.from ? { checkOutDate: { gt: new Date(query.from) } } : {},
        query.to ? { checkInDate: { lt: new Date(query.to) } } : {},
      ];
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      include: this.include(),
      orderBy: { checkInDate: 'asc' },
    });
    return reservations.map((r) => this.withBalance(r));
  }

  async findOne(hotelId: string, id: string) {
    const reservation = await this.prisma.reservation.findFirst({ where: { id, hotelId }, include: this.include() });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    return this.withBalance(reservation);
  }

  /** Habitaciones de un tipo sin superposición de reservas activas en el rango solicitado. */
  async availableRooms(hotelId: string, roomTypeId: string, checkIn: Date, checkOut: Date, excludeReservationId?: string) {
    const rooms = await this.prisma.room.findMany({
      where: { hotelId, roomTypeId, status: { not: RoomStatus.FUERA_DE_SERVICIO } },
      include: {
        reservations: {
          where: {
            status: { in: ACTIVE_STATUSES },
            id: excludeReservationId ? { not: excludeReservationId } : undefined,
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        },
      },
    });
    return rooms.filter((r) => r.reservations.length === 0).map(({ reservations, ...room }) => room);
  }

  private async assertRoomAvailable(hotelId: string, roomId: string, checkIn: Date, checkOut: Date, excludeReservationId?: string) {
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        hotelId,
        roomId,
        status: { in: ACTIVE_STATUSES },
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
    });
    if (conflict) {
      throw new ConflictException('La habitación ya tiene una reserva que se superpone con esas fechas.');
    }
  }

  async create(hotelId: string, dto: CreateReservationDto, userId: string) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (checkOut <= checkIn) throw new BadRequestException('La fecha de salida debe ser posterior a la de entrada.');

    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, hotelId } });
    if (!room) throw new NotFoundException('Habitación no encontrada');

    const guest = await this.prisma.guest.findFirst({ where: { id: dto.titularGuestId, hotelId } });
    if (!guest) throw new NotFoundException('Huésped no encontrado');

    await this.assertRoomAvailable(hotelId, dto.roomId, checkIn, checkOut);

    try {
      const reservation = await this.prisma.reservation.create({
        data: {
          hotelId,
          titularGuestId: dto.titularGuestId,
          roomId: dto.roomId,
          ratePlanId: dto.ratePlanId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestsCount: dto.guestsCount ?? 1,
          channel: dto.channel ?? 'directo',
          agreedPricePerNight: dto.agreedPricePerNight,
          notes: dto.notes,
          createdById: userId,
          guests: { create: { guestId: dto.titularGuestId, isTitular: true } },
        },
        include: this.include(),
      });

      await this.audit.log({ hotelId, userId, action: 'reservation.create', entityType: 'Reservation', entityId: reservation.id, after: reservation });
      return this.withBalance(reservation);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.message.includes('reservation_no_overlap') || e.code === 'P2010')) {
        throw new ConflictException('La habitación ya tiene una reserva que se superpone con esas fechas.');
      }
      throw e;
    }
  }

  async update(hotelId: string, id: string, dto: UpdateReservationDto, userId: string) {
    const existing = await this.prisma.reservation.findFirst({ where: { id, hotelId } });
    if (!existing) throw new NotFoundException('Reserva no encontrada');
    if (existing.status === ReservationStatus.CHECK_OUT || existing.status === ReservationStatus.CANCELADA) {
      throw new BadRequestException('No se puede editar una reserva finalizada o cancelada.');
    }

    const checkIn = dto.checkInDate ? new Date(dto.checkInDate) : existing.checkInDate;
    const checkOut = dto.checkOutDate ? new Date(dto.checkOutDate) : existing.checkOutDate;
    if (checkOut <= checkIn) throw new BadRequestException('La fecha de salida debe ser posterior a la de entrada.');

    const roomId = dto.roomId ?? existing.roomId;
    await this.assertRoomAvailable(hotelId, roomId, checkIn, checkOut, id);

    try {
      const updated = await this.prisma.reservation.update({
        where: { id },
        data: {
          roomId: dto.roomId,
          ratePlanId: dto.ratePlanId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestsCount: dto.guestsCount,
          channel: dto.channel,
          agreedPricePerNight: dto.agreedPricePerNight,
          notes: dto.notes,
        },
        include: this.include(),
      });
      await this.audit.log({ hotelId, userId, action: 'reservation.update', entityType: 'Reservation', entityId: id, before: existing, after: updated });
      return this.withBalance(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.message.includes('reservation_no_overlap')) {
        throw new ConflictException('La habitación ya tiene una reserva que se superpone con esas fechas.');
      }
      throw e;
    }
  }

  async cancel(hotelId: string, id: string, userId: string, reason?: string) {
    const existing = await this.prisma.reservation.findFirst({ where: { id, hotelId } });
    if (!existing) throw new NotFoundException('Reserva no encontrada');
    if (existing.status === ReservationStatus.CHECK_OUT) {
      throw new BadRequestException('No se puede cancelar una reserva ya finalizada (check-out realizado).');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELADA, notes: reason ? `${existing.notes ?? ''}\n[Cancelación] ${reason}`.trim() : existing.notes },
      include: this.include(),
    });
    await this.audit.log({ hotelId, userId, action: 'reservation.cancel', entityType: 'Reservation', entityId: id, before: existing, after: { status: updated.status, reason } });
    return this.withBalance(updated);
  }

  async checkin(hotelId: string, id: string, userId: string) {
    const existing = await this.prisma.reservation.findFirst({ where: { id, hotelId } });
    if (!existing) throw new NotFoundException('Reserva no encontrada');
    const allowedForCheckin: ReservationStatus[] = [ReservationStatus.CONFIRMADA, ReservationStatus.PRE_RESERVA];
    if (!allowedForCheckin.includes(existing.status)) {
      throw new BadRequestException('Solo se puede hacer check-in de una reserva confirmada.');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECK_IN, actualCheckInAt: new Date() },
        include: this.include(),
      }),
      this.prisma.room.update({ where: { id: existing.roomId }, data: { status: RoomStatus.OCUPADA } }),
    ]);

    await this.audit.log({ hotelId, userId, action: 'reservation.checkin', entityType: 'Reservation', entityId: id, before: { status: existing.status }, after: { status: updated.status } });
    return this.withBalance(updated);
  }

  async checkout(hotelId: string, id: string, userId: string) {
    const existing = await this.prisma.reservation.findFirst({ where: { id, hotelId }, include: this.include() });
    if (!existing) throw new NotFoundException('Reserva no encontrada');
    if (existing.status !== ReservationStatus.CHECK_IN) {
      throw new BadRequestException('Solo se puede hacer check-out de una reserva con check-in realizado.');
    }

    const { balance } = this.withBalance(existing);

    const [updated] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECK_OUT, actualCheckOutAt: new Date() },
        include: this.include(),
      }),
      this.prisma.room.update({ where: { id: existing.roomId }, data: { status: RoomStatus.LIMPIEZA } }),
    ]);

    await this.audit.log({ hotelId, userId, action: 'reservation.checkout', entityType: 'Reservation', entityId: id, before: { status: existing.status, balance }, after: { status: updated.status } });
    return this.withBalance(updated);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, enumerateDays, startOfDay } from '../common/utils/date';

const REALIZED_STATUSES: ReservationStatus[] = [ReservationStatus.CHECK_IN, ReservationStatus.CHECK_OUT];

export interface KpiAggregate {
  from: Date;
  to: Date;
  totalRooms: number;
  availableRoomNights: number;
  soldRoomNights: number;
  roomRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  occupancyRate: number; // %
  adr: number;
  revpar: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Recalcula y persiste daily_hotel_metrics para [from, to) — un registro por
   * día y por scope (null = todo el hotel, o un roomTypeId). No usa upsert por
   * constraint única porque roomTypeId es nullable (Postgres no deduplica NULL
   * en índices únicos); en cambio borra el rango y vuelve a insertar dentro de
   * una transacción, seguro porque nada más escribe en esta tabla.
   */
  async recomputeRange(hotelId: string, from: Date, to: Date): Promise<void> {
    const rangeFrom = startOfDay(from);
    const rangeTo = startOfDay(to);
    if (rangeTo <= rangeFrom) return;

    const [roomTypes, rooms, reservations, consumptions] = await Promise.all([
      this.prisma.roomType.findMany({ where: { hotelId } }),
      this.prisma.room.findMany({ where: { hotelId } }),
      this.prisma.reservation.findMany({
        where: { hotelId, status: { in: REALIZED_STATUSES }, checkInDate: { lt: rangeTo }, checkOutDate: { gt: rangeFrom } },
        select: { roomId: true, checkInDate: true, checkOutDate: true, agreedPricePerNight: true },
      }),
      this.prisma.consumption.findMany({
        where: { hotelId, date: { gte: rangeFrom, lt: rangeTo } },
        select: { quantity: true, unitPrice: true, date: true, reservation: { select: { roomId: true } } },
      }),
    ]);

    const roomTypeByRoomId = new Map(rooms.map((r) => [r.id, r.roomTypeId]));
    const scopes: (string | null)[] = [null, ...roomTypes.map((rt) => rt.id)];
    const roomCountByScope = new Map<string | null, number>(
      scopes.map((s) => [s, s ? rooms.filter((r) => r.roomTypeId === s).length : rooms.length]),
    );

    const days = enumerateDays(rangeFrom, rangeTo);
    const rows: Prisma.DailyHotelMetricCreateManyInput[] = [];

    for (const day of days) {
      const dayEnd = addDays(day, 1);
      for (const scopeId of scopes) {
        const scopedRes = reservations.filter(
          (r) => r.checkInDate < dayEnd && r.checkOutDate > day && (!scopeId || roomTypeByRoomId.get(r.roomId) === scopeId),
        );
        const scopedCons = consumptions.filter(
          (c) => c.date >= day && c.date < dayEnd && (!scopeId || roomTypeByRoomId.get(c.reservation.roomId) === scopeId),
        );
        rows.push({
          hotelId,
          date: day,
          roomTypeId: scopeId,
          totalRooms: roomCountByScope.get(scopeId) ?? 0,
          soldRoomNights: scopedRes.length,
          roomRevenue: scopedRes.reduce((s, r) => s + Number(r.agreedPricePerNight), 0),
          otherRevenue: scopedCons.reduce((s, c) => s + c.quantity * Number(c.unitPrice), 0),
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.dailyHotelMetric.deleteMany({ where: { hotelId, date: { gte: rangeFrom, lt: rangeTo } } }),
      this.prisma.dailyHotelMetric.createMany({ data: rows }),
    ]);
  }

  /**
   * Los días de hoy/ayer se recalculan siempre (los datos todavía cambian:
   * check-ins, pagos, consumos). Los días más viejos se consideran historia
   * cerrada y solo se recalculan si falta el registro.
   */
  async ensureFresh(hotelId: string, from: Date, to: Date): Promise<void> {
    const today = startOfDay(new Date());
    const mutableFrom = addDays(today, -1); // ayer en adelante: los datos todavía pueden cambiar
    const rangeFrom = startOfDay(from);
    const rangeTo = startOfDay(to);
    if (rangeTo <= rangeFrom) return;

    // Historia cerrada: solo se recalcula si falta ALGÚN día del rango. Contamos
    // filas vs. días esperados en vez de solo comprobar existencia: dos rangos
    // que se solapan parcialmente (ej. "últimos 30 días" y luego "últimos 90
    // días") podrían dejar huecos sin datos si solo mirásemos "¿existe algo?".
    const historicalTo = rangeTo < mutableFrom ? rangeTo : mutableFrom;
    if (historicalTo > rangeFrom) {
      const expectedDays = enumerateDays(rangeFrom, historicalTo).length;
      const existingCount = await this.prisma.dailyHotelMetric.count({
        where: { hotelId, roomTypeId: null, date: { gte: rangeFrom, lt: historicalTo } },
      });
      if (existingCount < expectedDays) {
        await this.recomputeRange(hotelId, rangeFrom, historicalTo);
      }
    }

    // Días mutables dentro del rango pedido: siempre se recalculan.
    const mutableRangeFrom = mutableFrom > rangeFrom ? mutableFrom : rangeFrom;
    if (rangeTo > mutableRangeFrom) {
      await this.recomputeRange(hotelId, mutableRangeFrom, rangeTo);
    }
  }

  async getAggregate(hotelId: string, from: Date, to: Date, roomTypeId?: string | null): Promise<KpiAggregate> {
    const rangeFrom = startOfDay(from);
    const rangeTo = startOfDay(to);
    await this.ensureFresh(hotelId, rangeFrom, rangeTo);

    const rows = await this.prisma.dailyHotelMetric.findMany({
      where: { hotelId, roomTypeId: roomTypeId ?? null, date: { gte: rangeFrom, lt: rangeTo } },
      orderBy: { date: 'asc' },
    });

    const soldRoomNights = rows.reduce((s, r) => s + r.soldRoomNights, 0);
    const availableRoomNights = rows.reduce((s, r) => s + r.totalRooms, 0);
    const roomRevenue = rows.reduce((s, r) => s + Number(r.roomRevenue), 0);
    const otherRevenue = rows.reduce((s, r) => s + Number(r.otherRevenue), 0);
    const totalRooms = rows.length > 0 ? rows[rows.length - 1].totalRooms : 0;

    return {
      from: rangeFrom,
      to: rangeTo,
      totalRooms,
      availableRoomNights,
      soldRoomNights,
      roomRevenue,
      otherRevenue,
      totalRevenue: roomRevenue + otherRevenue,
      occupancyRate: availableRoomNights > 0 ? (soldRoomNights / availableRoomNights) * 100 : 0,
      adr: soldRoomNights > 0 ? roomRevenue / soldRoomNights : 0,
      revpar: availableRoomNights > 0 ? roomRevenue / availableRoomNights : 0,
    };
  }

  async getDailySeries(hotelId: string, from: Date, to: Date, roomTypeId?: string | null) {
    const rangeFrom = startOfDay(from);
    const rangeTo = startOfDay(to);
    await this.ensureFresh(hotelId, rangeFrom, rangeTo);

    const rows = await this.prisma.dailyHotelMetric.findMany({
      where: { hotelId, roomTypeId: roomTypeId ?? null, date: { gte: rangeFrom, lt: rangeTo } },
      orderBy: { date: 'asc' },
    });

    return rows.map((r) => ({
      date: r.date,
      totalRooms: r.totalRooms,
      soldRoomNights: r.soldRoomNights,
      roomRevenue: Number(r.roomRevenue),
      otherRevenue: Number(r.otherRevenue),
      occupancyRate: r.totalRooms > 0 ? (r.soldRoomNights / r.totalRooms) * 100 : 0,
      adr: r.soldRoomNights > 0 ? Number(r.roomRevenue) / r.soldRoomNights : 0,
      revpar: r.totalRooms > 0 ? Number(r.roomRevenue) / r.totalRooms : 0,
    }));
  }

  /** Corre todas las noches a las 00:30: cierra definitivamente las métricas de ayer para todos los hoteles. */
  @Cron('30 0 * * *')
  async finalizeYesterdayForAllHotels() {
    const hotels = await this.prisma.hotel.findMany({ select: { id: true } });
    const yesterday = addDays(startOfDay(new Date()), -1);
    for (const hotel of hotels) {
      try {
        await this.recomputeRange(hotel.id, yesterday, addDays(yesterday, 1));
      } catch (e) {
        this.logger.error(`No se pudo cerrar métricas de ayer para hotel ${hotel.id}`, e as Error);
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ReservationStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, enumerateDays, startOfDay } from '../common/utils/date';

const FORECAST_STATUSES: ReservationStatus[] = [ReservationStatus.CONFIRMADA, ReservationStatus.PRE_RESERVA, ReservationStatus.CHECK_IN];
const LOW_DEMAND_THRESHOLD_PCT = 30;

@Injectable()
export class ForecastService {
  constructor(private prisma: PrismaService) {}

  async getForecast(hotelId: string, days: number) {
    const from = startOfDay(new Date());
    const to = addDays(from, days);

    const [totalRooms, reservations] = await Promise.all([
      this.prisma.room.count({ where: { hotelId, status: { not: RoomStatus.FUERA_DE_SERVICIO } } }),
      this.prisma.reservation.findMany({
        where: { hotelId, status: { in: FORECAST_STATUSES }, checkInDate: { lt: to }, checkOutDate: { gt: from } },
        select: { checkInDate: true, checkOutDate: true, agreedPricePerNight: true, titularGuest: { select: { firstName: true, lastName: true } }, room: { select: { number: true } } },
      }),
    ]);

    const dayRows = enumerateDays(from, to).map((day) => {
      const dayEnd = addDays(day, 1);
      const overlapping = reservations.filter((r) => r.checkInDate < dayEnd && r.checkOutDate > day);
      const arrivals = reservations.filter((r) => r.checkInDate.getTime() === day.getTime());
      const departures = reservations.filter((r) => r.checkOutDate.getTime() === day.getTime());

      return {
        date: day,
        soldRoomNights: overlapping.length,
        totalRooms,
        occupancyRate: totalRooms > 0 ? (overlapping.length / totalRooms) * 100 : 0,
        projectedRevenue: overlapping.reduce((s, r) => s + Number(r.agreedPricePerNight), 0),
        arrivals: arrivals.map((r) => ({ guest: `${r.titularGuest.firstName} ${r.titularGuest.lastName}`, room: r.room.number })),
        departures: departures.map((r) => ({ guest: `${r.titularGuest.firstName} ${r.titularGuest.lastName}`, room: r.room.number })),
      };
    });

    const avgOccupancyRate = dayRows.length > 0 ? dayRows.reduce((s, d) => s + d.occupancyRate, 0) / dayRows.length : 0;
    const lowDemandDates = dayRows.filter((d) => d.occupancyRate < LOW_DEMAND_THRESHOLD_PCT).map((d) => d.date);

    return {
      from,
      to,
      totalRooms,
      avgOccupancyRate,
      totalProjectedRevenue: dayRows.reduce((s, d) => s + d.projectedRevenue, 0),
      totalArrivals: dayRows.reduce((s, d) => s + d.arrivals.length, 0),
      totalDepartures: dayRows.reduce((s, d) => s + d.departures.length, 0),
      lowDemandDates,
      days: dayRows,
    };
  }
}

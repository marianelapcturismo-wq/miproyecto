import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService, KpiAggregate } from '../metrics/metrics.service';
import { addDays, diffDays, startOfDay } from '../common/utils/date';
import { KpiQueryDto } from './dto/kpi-query.dto';

const STAYED_STATUSES: ReservationStatus[] = [ReservationStatus.CHECK_IN, ReservationStatus.CHECK_OUT];

interface Variation {
  current: number;
  previous: number | null;
  absolute: number | null;
  percent: number | null;
}

function variation(current: number, previous: number | null): Variation {
  if (previous == null) return { current, previous: null, absolute: null, percent: null };
  const absolute = current - previous;
  const percent = previous !== 0 ? (absolute / previous) * 100 : null;
  return { current, previous, absolute, percent };
}

interface ReservationStats {
  total: number;
  cancelled: number;
  noShow: number;
  stayed: number;
  cancellationRate: number;
  avgStayNights: number;
  avgLeadTimeDays: number;
}

@Injectable()
export class KpisService {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  private computePreviousRange(from: Date, to: Date, mode: 'previous_period' | 'previous_year') {
    if (mode === 'previous_year') {
      return {
        from: new Date(Date.UTC(from.getUTCFullYear() - 1, from.getUTCMonth(), from.getUTCDate())),
        to: new Date(Date.UTC(to.getUTCFullYear() - 1, to.getUTCMonth(), to.getUTCDate())),
      };
    }
    const lengthDays = diffDays(from, to);
    return { from: addDays(from, -lengthDays), to: from };
  }

  private async reservationStats(hotelId: string, from: Date, to: Date, roomTypeId?: string): Promise<ReservationStats> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        status: { not: ReservationStatus.CONSULTA },
        checkInDate: { gte: from, lt: to },
        ...(roomTypeId ? { room: { roomTypeId } } : {}),
      },
      select: { status: true, checkInDate: true, checkOutDate: true, createdAt: true },
    });

    const total = reservations.length;
    const cancelled = reservations.filter((r) => r.status === ReservationStatus.CANCELADA).length;
    const noShow = reservations.filter((r) => r.status === ReservationStatus.NO_SHOW).length;
    const stayed = reservations.filter((r) => STAYED_STATUSES.includes(r.status));

    const avgStayNights = stayed.length > 0 ? stayed.reduce((s, r) => s + diffDays(r.checkInDate, r.checkOutDate), 0) / stayed.length : 0;
    const avgLeadTimeDays = total > 0 ? reservations.reduce((s, r) => s + Math.max(0, diffDays(r.createdAt, r.checkInDate)), 0) / total : 0;

    return {
      total,
      cancelled,
      noShow,
      stayed: stayed.length,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      avgStayNights,
      avgLeadTimeDays,
    };
  }

  private buildAlerts(
    agg: KpiAggregate,
    prevAgg: KpiAggregate | null,
    stats: ReservationStats,
    prevStats: ReservationStats | null,
    topChannelShare: number | null,
  ): string[] {
    const alerts: string[] = [];
    if (agg.occupancyRate < 30) alerts.push('La ocupación del período está por debajo del 30%.');
    if (prevAgg) {
      if (prevAgg.occupancyRate > 0 && agg.occupancyRate < prevAgg.occupancyRate - 10) {
        alerts.push(`La ocupación cayó ${(prevAgg.occupancyRate - agg.occupancyRate).toFixed(1)} puntos respecto del período de comparación.`);
      }
      if (prevAgg.adr > 0 && agg.adr < prevAgg.adr * 0.9) {
        alerts.push('El ADR cayó más de 10% respecto del período de comparación.');
      }
      if (prevAgg.revpar > 0 && agg.revpar < prevAgg.revpar * 0.9) {
        alerts.push('El RevPAR cayó más de 10% respecto del período de comparación.');
      }
    }
    if (prevStats && stats.cancellationRate > prevStats.cancellationRate + 5) {
      alerts.push('Aumentó la tasa de cancelaciones respecto del período de comparación.');
    }
    if (topChannelShare != null && topChannelShare > 60) {
      alerts.push(`Alta dependencia de un solo canal de venta (${topChannelShare.toFixed(0)}% de las reservas).`);
    }
    return alerts;
  }

  async summary(hotelId: string, query: KpiQueryDto) {
    const from = startOfDay(new Date(query.from));
    const to = startOfDay(new Date(query.to));
    const compareMode = query.compare ?? 'previous_period';

    const [aggregate, stats, channelShares] = await Promise.all([
      this.metrics.getAggregate(hotelId, from, to, query.roomTypeId ?? null),
      this.reservationStats(hotelId, from, to, query.roomTypeId),
      this.topChannelShare(hotelId, from, to),
    ]);

    let previous: { aggregate: KpiAggregate; stats: ReservationStats; from: Date; to: Date } | null = null;
    if (compareMode !== 'none') {
      const prevRange = this.computePreviousRange(from, to, compareMode);
      const [prevAggregate, prevStats] = await Promise.all([
        this.metrics.getAggregate(hotelId, prevRange.from, prevRange.to, query.roomTypeId ?? null),
        this.reservationStats(hotelId, prevRange.from, prevRange.to, query.roomTypeId),
      ]);
      previous = { aggregate: prevAggregate, stats: prevStats, from: prevRange.from, to: prevRange.to };
    }

    const alerts = this.buildAlerts(aggregate, previous?.aggregate ?? null, stats, previous?.stats ?? null, channelShares.topSharePct);

    return {
      period: { from, to },
      comparePeriod: previous ? { from: previous.from, to: previous.to } : null,
      occupancyRate: variation(aggregate.occupancyRate, previous?.aggregate.occupancyRate ?? null),
      adr: variation(aggregate.adr, previous?.aggregate.adr ?? null),
      revpar: variation(aggregate.revpar, previous?.aggregate.revpar ?? null),
      totalRevenue: variation(aggregate.totalRevenue, previous?.aggregate.totalRevenue ?? null),
      roomRevenue: variation(aggregate.roomRevenue, previous?.aggregate.roomRevenue ?? null),
      otherRevenue: variation(aggregate.otherRevenue, previous?.aggregate.otherRevenue ?? null),
      reservations: {
        total: variation(stats.total, previous?.stats.total ?? null),
        cancelled: variation(stats.cancelled, previous?.stats.cancelled ?? null),
        noShow: variation(stats.noShow, previous?.stats.noShow ?? null),
        cancellationRate: variation(stats.cancellationRate, previous?.stats.cancellationRate ?? null),
        avgStayNights: variation(stats.avgStayNights, previous?.stats.avgStayNights ?? null),
        avgLeadTimeDays: variation(stats.avgLeadTimeDays, previous?.stats.avgLeadTimeDays ?? null),
      },
      totalRooms: aggregate.totalRooms,
      soldRoomNights: aggregate.soldRoomNights,
      availableRoomNights: aggregate.availableRoomNights,
      alerts,
    };
  }

  async series(hotelId: string, query: KpiQueryDto) {
    const from = startOfDay(new Date(query.from));
    const to = startOfDay(new Date(query.to));
    return this.metrics.getDailySeries(hotelId, from, to, query.roomTypeId ?? null);
  }

  private async topChannelShare(hotelId: string, from: Date, to: Date) {
    const reservations = await this.prisma.reservation.findMany({
      where: { hotelId, status: { not: ReservationStatus.CONSULTA }, checkInDate: { gte: from, lt: to } },
      select: { channelId: true },
    });
    if (reservations.length === 0) return { topSharePct: null };
    const counts = new Map<string, number>();
    for (const r of reservations) counts.set(r.channelId, (counts.get(r.channelId) ?? 0) + 1);
    const top = Math.max(...counts.values());
    return { topSharePct: (top / reservations.length) * 100 };
  }

  async channels(hotelId: string, from: string, to: string, roomTypeId?: string) {
    const rangeFrom = startOfDay(new Date(from));
    const rangeTo = startOfDay(new Date(to));

    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        status: { not: ReservationStatus.CONSULTA },
        checkInDate: { gte: rangeFrom, lt: rangeTo },
        ...(roomTypeId ? { room: { roomTypeId } } : {}),
      },
      select: {
        status: true,
        checkInDate: true,
        checkOutDate: true,
        agreedPricePerNight: true,
        channel: { select: { id: true, name: true, code: true, commissionPct: true } },
      },
    });

    const total = reservations.length;
    const byChannel = new Map<string, { channel: { id: string; name: string; code: string; commissionPct: unknown }; total: number; cancelled: number; noShow: number; revenue: number }>();

    for (const r of reservations) {
      const key = r.channel.id;
      if (!byChannel.has(key)) byChannel.set(key, { channel: r.channel, total: 0, cancelled: 0, noShow: 0, revenue: 0 });
      const entry = byChannel.get(key)!;
      entry.total += 1;
      if (r.status === ReservationStatus.CANCELADA) entry.cancelled += 1;
      if (r.status === ReservationStatus.NO_SHOW) entry.noShow += 1;
      if (STAYED_STATUSES.includes(r.status)) {
        entry.revenue += diffDays(r.checkInDate, r.checkOutDate) * Number(r.agreedPricePerNight);
      }
    }

    return Array.from(byChannel.values())
      .map((e) => ({
        channelId: e.channel.id,
        channelName: e.channel.name,
        channelCode: e.channel.code,
        commissionPct: Number(e.channel.commissionPct),
        reservationsCount: e.total,
        cancelledCount: e.cancelled,
        noShowCount: e.noShow,
        participationPct: total > 0 ? (e.total / total) * 100 : 0,
        grossRevenue: e.revenue,
        netRevenue: e.revenue * (1 - Number(e.channel.commissionPct) / 100),
      }))
      .sort((a, b) => b.reservationsCount - a.reservationsCount);
  }

  async guests(hotelId: string, from: string, to: string) {
    const rangeFrom = startOfDay(new Date(from));
    const rangeTo = startOfDay(new Date(to));

    const reservations = await this.prisma.reservation.findMany({
      where: { hotelId, status: { in: STAYED_STATUSES }, checkInDate: { gte: rangeFrom, lt: rangeTo } },
      select: {
        titularGuestId: true,
        checkInDate: true,
        checkOutDate: true,
        agreedPricePerNight: true,
        consumptions: { select: { quantity: true, unitPrice: true } },
      },
    });

    if (reservations.length === 0) {
      return { totalStays: 0, distinctGuests: 0, newGuests: 0, recurringGuests: 0, repeatRatePct: 0, avgStayNights: 0, avgSpendPerStay: 0 };
    }

    const guestIds = Array.from(new Set(reservations.map((r) => r.titularGuestId)));
    const priorStays = await this.prisma.reservation.findMany({
      where: { hotelId, guests: { some: { guestId: { in: guestIds } } }, status: { in: STAYED_STATUSES }, checkInDate: { lt: rangeFrom } },
      select: { titularGuestId: true },
    });
    const guestsWithPriorStay = new Set(priorStays.map((r) => r.titularGuestId));
    const recurringGuests = guestIds.filter((id) => guestsWithPriorStay.has(id)).length;

    const avgStayNights = reservations.reduce((s, r) => s + diffDays(r.checkInDate, r.checkOutDate), 0) / reservations.length;
    const avgSpendPerStay =
      reservations.reduce((s, r) => {
        const roomTotal = diffDays(r.checkInDate, r.checkOutDate) * Number(r.agreedPricePerNight);
        const consTotal = r.consumptions.reduce((cs, c) => cs + c.quantity * Number(c.unitPrice), 0);
        return s + roomTotal + consTotal;
      }, 0) / reservations.length;

    return {
      totalStays: reservations.length,
      distinctGuests: guestIds.length,
      newGuests: guestIds.length - recurringGuests,
      recurringGuests,
      repeatRatePct: guestIds.length > 0 ? (recurringGuests / guestIds.length) * 100 : 0,
      avgStayNights,
      avgSpendPerStay,
    };
  }

  async consumptions(hotelId: string, from: string, to: string) {
    const rangeFrom = startOfDay(new Date(from));
    const rangeTo = startOfDay(new Date(to));

    const [consumptions, services] = await Promise.all([
      this.prisma.consumption.findMany({
        where: { hotelId, date: { gte: rangeFrom, lt: rangeTo } },
        select: { quantity: true, unitPrice: true, service: { select: { id: true, name: true, category: true } } },
      }),
      this.prisma.service.findMany({ where: { hotelId, active: true }, select: { id: true, name: true, category: true } }),
    ]);

    const byService = new Map<string, { serviceId: string; name: string; category: string; quantity: number; revenue: number }>();
    for (const s of services) byService.set(s.id, { serviceId: s.id, name: s.name, category: s.category, quantity: 0, revenue: 0 });
    for (const c of consumptions) {
      const key = c.service.id;
      if (!byService.has(key)) byService.set(key, { serviceId: key, name: c.service.name, category: c.service.category, quantity: 0, revenue: 0 });
      const entry = byService.get(key)!;
      entry.quantity += c.quantity;
      entry.revenue += c.quantity * Number(c.unitPrice);
    }

    const rows = Array.from(byService.values()).sort((a, b) => b.revenue - a.revenue);
    return {
      totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      services: rows,
    };
  }
}

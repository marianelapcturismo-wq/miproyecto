import { Injectable } from '@nestjs/common';
import { CashSessionStatus, HousekeepingStatus, MaintenanceStatus, ReservationStatus, RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private reservations: ReservationsService,
  ) {}

  async today(hotelId: string) {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const in7 = addDays(today, 7);

    const [
      roomsByStatus,
      checkInsToday,
      checkOutsToday,
      arrivalsNext7,
      departuresNext7,
      pendingCount,
      activeReservations,
      pendingHousekeepingTasks,
      pendingMaintenanceTasks,
      openCashSession,
    ] = await Promise.all([
      this.prisma.room.groupBy({ by: ['status'], where: { hotelId }, _count: true }),
      this.prisma.reservation.findMany({
        where: { hotelId, status: ReservationStatus.CONFIRMADA, checkInDate: { gte: today, lt: tomorrow } },
        include: { titularGuest: true, room: true },
      }),
      this.prisma.reservation.findMany({
        where: { hotelId, status: ReservationStatus.CHECK_IN, checkOutDate: { gte: today, lt: tomorrow } },
        include: { titularGuest: true, room: true },
      }),
      this.prisma.reservation.count({
        where: { hotelId, status: { in: [ReservationStatus.CONFIRMADA, ReservationStatus.PRE_RESERVA] }, checkInDate: { gte: today, lt: in7 } },
      }),
      this.prisma.reservation.count({
        where: { hotelId, status: ReservationStatus.CHECK_IN, checkOutDate: { gte: today, lt: in7 } },
      }),
      this.prisma.reservation.count({
        where: { hotelId, status: { in: [ReservationStatus.CONSULTA, ReservationStatus.PRE_RESERVA] } },
      }),
      this.prisma.reservation.findMany({
        where: { hotelId, status: { in: [ReservationStatus.CONFIRMADA, ReservationStatus.CHECK_IN] } },
        include: { payments: true, consumptions: true, titularGuest: true, room: true },
      }),
      this.prisma.housekeepingTask.count({ where: { hotelId, status: { in: [HousekeepingStatus.PENDIENTE, HousekeepingStatus.EN_PROCESO, HousekeepingStatus.CON_PROBLEMA] } } }),
      this.prisma.maintenanceTask.count({ where: { hotelId, status: { not: MaintenanceStatus.RESUELTO } } }),
      this.prisma.cashSession.findFirst({ where: { hotelId, status: CashSessionStatus.ABIERTA } }),
    ]);

    const countByStatus = (status: RoomStatus) => roomsByStatus.find((r) => r.status === status)?._count ?? 0;
    const totalRooms = roomsByStatus.reduce((sum, r) => sum + r._count, 0);
    const outOfService = countByStatus(RoomStatus.FUERA_DE_SERVICIO);
    const sellableRooms = totalRooms - outOfService;
    const occupied = countByStatus(RoomStatus.OCUPADA);
    const occupancyRate = sellableRooms > 0 ? Math.round((occupied / sellableRooms) * 1000) / 10 : 0;

    const withPendingBalance = activeReservations
      .map((r) => this.reservations.withBalance(r))
      .filter((r) => r.balance > 0);

    const alerts: string[] = [];
    if (outOfService > 0) alerts.push(`${outOfService} habitación(es) fuera de servicio.`);
    if (withPendingBalance.length > 0) alerts.push(`${withPendingBalance.length} reserva(s) activa(s) con saldo pendiente de cobro.`);
    if (countByStatus(RoomStatus.MANTENIMIENTO) > 0) alerts.push(`${countByStatus(RoomStatus.MANTENIMIENTO)} habitación(es) en mantenimiento.`);
    if (sellableRooms > 0 && occupancyRate < 30) alerts.push('La ocupación actual está por debajo del 30%.');
    if (pendingHousekeepingTasks > 0) alerts.push(`${pendingHousekeepingTasks} tarea(s) de housekeeping pendientes.`);
    if (pendingMaintenanceTasks > 0) alerts.push(`${pendingMaintenanceTasks} tarea(s) de mantenimiento sin resolver.`);
    if (!openCashSession) alerts.push('No hay una caja abierta.');

    return {
      occupancy: {
        rate: occupancyRate,
        occupiedRooms: occupied,
        availableRooms: countByStatus(RoomStatus.DISPONIBLE),
        reservedRooms: countByStatus(RoomStatus.RESERVADA),
        cleaningRooms: countByStatus(RoomStatus.LIMPIEZA),
        maintenanceRooms: countByStatus(RoomStatus.MANTENIMIENTO),
        outOfServiceRooms: outOfService,
        totalRooms,
      },
      checkInsToday: checkInsToday.map((r) => ({ id: r.id, guest: `${r.titularGuest.firstName} ${r.titularGuest.lastName}`, room: r.room.number })),
      checkOutsToday: checkOutsToday.map((r) => ({ id: r.id, guest: `${r.titularGuest.firstName} ${r.titularGuest.lastName}`, room: r.room.number })),
      arrivalsNext7Days: arrivalsNext7,
      departuresNext7Days: departuresNext7,
      pendingReservations: pendingCount,
      pendingPayments: withPendingBalance.map((r) => ({
        id: r.id,
        guest: `${r.titularGuest.firstName} ${r.titularGuest.lastName}`,
        room: r.room.number,
        balance: r.balance,
      })),
      pendingHousekeepingTasks,
      pendingMaintenanceTasks,
      cashSessionOpen: !!openCashSession,
      alerts,
    };
  }
}

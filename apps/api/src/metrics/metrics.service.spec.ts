import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { addDays, startOfDay } from '../common/utils/date';

/**
 * Regresión de un bug real encontrado en pruebas manuales: `ensureFresh`
 * decidía si recalcular un rango histórico comprobando solo si *existía*
 * alguna fila ahí. Como distintos filtros del dashboard piden rangos que se
 * solapan parcialmente (ej. "últimos 30 días" y después "últimos 90 días"),
 * encontrar una sola fila ya cargada hacía que se diera por bueno todo el
 * rango, dejando huecos sin calcular que se sumaban silenciosamente como
 * cero. La corrección compara cantidad de filas vs. días esperados.
 */
describe('MetricsService — sin huecos entre rangos solapados (integración contra DB local)', () => {
  const prisma = new PrismaService();
  const metrics = new MetricsService(prisma);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let hotel: { id: string };
  let roleId: string;
  let userId: string;
  let guestId: string;
  let channelId: string;
  let roomId: string;

  const today = startOfDay(new Date());
  // Rango bien en el pasado (fuera de la ventana "mutable" de hoy/ayer) para
  // poder comprobar el comportamiento de caché de "historia cerrada".
  const stayStart = addDays(today, -45);
  const stayEnd = addDays(today, -42); // 3 noches

  beforeAll(async () => {
    hotel = await prisma.hotel.create({ data: { name: `Test Hotel Metrics ${suffix}` } });
    const role = await prisma.role.create({ data: { code: `TEST_ROLE_METRICS_${suffix}`, name: 'Test Role' } });
    roleId = role.id;
    const user = await prisma.user.create({
      data: { hotelId: hotel.id, email: `test-metrics-${suffix}@example.com`, passwordHash: 'x', firstName: 'Test', lastName: 'M', roleId },
    });
    userId = user.id;

    const roomType = await prisma.roomType.create({ data: { hotelId: hotel.id, name: `Tipo ${suffix}`, capacity: 2, basePrice: 1000 } });
    const room = await prisma.room.create({ data: { hotelId: hotel.id, roomTypeId: roomType.id, number: `M-${suffix}` } });
    roomId = room.id;
    const guest = await prisma.guest.create({ data: { hotelId: hotel.id, firstName: 'Huesped', lastName: 'M', documentNumber: suffix } });
    guestId = guest.id;
    const channel = await prisma.channel.create({ data: { hotelId: hotel.id, code: 'DIRECTO', name: 'Directo' } });
    channelId = channel.id;

    await prisma.reservation.create({
      data: {
        hotelId: hotel.id,
        titularGuestId: guestId,
        roomId,
        channelId,
        checkInDate: stayStart,
        checkOutDate: stayEnd,
        status: ReservationStatus.CHECK_OUT,
        agreedPricePerNight: 2000,
        createdById: userId,
        actualCheckInAt: stayStart,
        actualCheckOutAt: stayEnd,
      },
    });
  });

  afterAll(async () => {
    await prisma.dailyHotelMetric.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.reservation.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.channel.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.room.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.roomType.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.guest.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.user.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.role.delete({ where: { id: roleId } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
    await prisma.$disconnect();
  });

  it('un rango de 90 días que se solapa con uno de 30 días ya calculado no deja huecos', async () => {
    // 1) Rango chico que incluye la estadía histórica.
    const narrow = await metrics.getAggregate(hotel.id, addDays(today, -50), addDays(today, -40));
    expect(narrow.soldRoomNights).toBe(3);
    expect(narrow.roomRevenue).toBe(6000);

    // 2) Rango más amplio que se solapa parcialmente con el anterior — antes
    // del fix, esto podía dejar sin calcular los días que NO estaban en el
    // rango chico, y el resultado terminaba dependiendo del orden de llamadas.
    const wide = await metrics.getAggregate(hotel.id, addDays(today, -90), addDays(today, -1));
    expect(wide.soldRoomNights).toBe(3);
    expect(wide.roomRevenue).toBe(6000);

    // 3) Repetir el rango chico debe dar exactamente el mismo resultado que
    // la primera vez, no verse afectado por el cálculo del rango amplio.
    const narrowAgain = await metrics.getAggregate(hotel.id, addDays(today, -50), addDays(today, -40));
    expect(narrowAgain.soldRoomNights).toBe(narrow.soldRoomNights);
    expect(narrowAgain.roomRevenue).toBe(narrow.roomRevenue);

    // 4) No debe haber ningún día sin fila dentro del rango solapado.
    const rows = await prisma.dailyHotelMetric.count({
      where: { hotelId: hotel.id, roomTypeId: null, date: { gte: addDays(today, -90), lt: addDays(today, -1) } },
    });
    expect(rows).toBe(89);
  });
});

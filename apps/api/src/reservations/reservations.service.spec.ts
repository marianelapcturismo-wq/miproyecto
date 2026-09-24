import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService.withBalance (cálculo puro, sin DB)', () => {
  const service = new ReservationsService({} as PrismaService, { log: jest.fn() } as unknown as AuditService);

  it('suma noches, alojamiento y consumos, y resta lo pagado', () => {
    const result = service.withBalance({
      agreedPricePerNight: 1000,
      checkInDate: new Date('2026-01-01T00:00:00Z'),
      checkOutDate: new Date('2026-01-04T00:00:00Z'),
      payments: [{ amount: 500, type: 'PARCIAL' }],
      consumptions: [{ quantity: 2, unitPrice: 200 }],
    });
    expect(result.nights).toBe(3);
    expect(result.roomTotal).toBe(3000);
    expect(result.consumptionsTotal).toBe(400);
    expect(result.total).toBe(3400);
    expect(result.paid).toBe(500);
    expect(result.balance).toBe(2900);
  });

  it('resta las devoluciones del monto pagado', () => {
    const result = service.withBalance({
      agreedPricePerNight: 1000,
      checkInDate: new Date('2026-01-01T00:00:00Z'),
      checkOutDate: new Date('2026-01-02T00:00:00Z'),
      payments: [
        { amount: 1000, type: 'FINAL' },
        { amount: 300, type: 'DEVOLUCION' },
      ],
    });
    expect(result.paid).toBe(700);
    expect(result.balance).toBe(300);
  });

  it('sin consumos, consumptionsTotal es 0 y no rompe el cálculo', () => {
    const result = service.withBalance({
      agreedPricePerNight: 500,
      checkInDate: new Date('2026-01-01T00:00:00Z'),
      checkOutDate: new Date('2026-01-02T00:00:00Z'),
      payments: [],
    });
    expect(result.consumptionsTotal).toBe(0);
    expect(result.total).toBe(500);
    expect(result.balance).toBe(500);
  });
});

/**
 * Regresión de un hallazgo real de la revisión de seguridad: create()/update()
 * no validaban que roomId/ratePlanId/channelId pertenecieran al hotel del
 * usuario autenticado, permitiendo que una reserva de un hotel apuntara a
 * recursos de otro hotel (fuga y corrupción de datos entre tenants).
 */
describe('ReservationsService — aislamiento multi-tenant (integración contra DB local)', () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const service = new ReservationsService(prisma, audit);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let hotelA: { id: string };
  let hotelB: { id: string };
  let roleId: string;
  let userA: { id: string };
  let roomA: { id: string };
  let roomB: { id: string };
  let guestA: { id: string };
  let channelA: { id: string };
  let channelB: { id: string };
  let ratePlanB: { id: string };

  beforeAll(async () => {
    hotelA = await prisma.hotel.create({ data: { name: `Test Hotel A ${suffix}` } });
    hotelB = await prisma.hotel.create({ data: { name: `Test Hotel B ${suffix}` } });

    const role = await prisma.role.create({ data: { code: `TEST_ROLE_${suffix}`, name: 'Test Role' } });
    roleId = role.id;
    userA = await prisma.user.create({
      data: { hotelId: hotelA.id, email: `test-${suffix}@a.example.com`, passwordHash: 'x', firstName: 'Test', lastName: 'A', roleId },
    });

    const roomTypeA = await prisma.roomType.create({ data: { hotelId: hotelA.id, name: `Tipo A ${suffix}`, capacity: 2, basePrice: 1000 } });
    roomA = await prisma.room.create({ data: { hotelId: hotelA.id, roomTypeId: roomTypeA.id, number: `A-${suffix}` } });
    guestA = await prisma.guest.create({ data: { hotelId: hotelA.id, firstName: 'Huesped', lastName: 'A', documentNumber: suffix } });
    channelA = await prisma.channel.create({ data: { hotelId: hotelA.id, code: 'DIRECTO', name: 'Directo' } });

    const roomTypeB = await prisma.roomType.create({ data: { hotelId: hotelB.id, name: `Tipo B ${suffix}`, capacity: 2, basePrice: 1000 } });
    roomB = await prisma.room.create({ data: { hotelId: hotelB.id, roomTypeId: roomTypeB.id, number: `B-${suffix}` } });
    channelB = await prisma.channel.create({ data: { hotelId: hotelB.id, code: 'DIRECTO', name: 'Directo' } });
    ratePlanB = await prisma.ratePlan.create({ data: { hotelId: hotelB.id, name: `Plan B ${suffix}` } });
  });

  afterAll(async () => {
    const hotelIds = [hotelA.id, hotelB.id];
    await prisma.auditLog.deleteMany({ where: { hotelId: { in: hotelIds } } });
    await prisma.reservation.deleteMany({ where: { hotelId: { in: hotelIds } } });
    await prisma.channel.deleteMany({ where: { hotelId: { in: hotelIds } } });
    await prisma.ratePlan.deleteMany({ where: { hotelId: { in: hotelIds } } });
    await prisma.room.deleteMany({ where: { hotelId: { in: hotelIds } } });
    await prisma.roomType.deleteMany({ where: { hotelId: { in: hotelIds } } });
    await prisma.guest.deleteMany({ where: { hotelId: hotelA.id } });
    await prisma.user.deleteMany({ where: { hotelId: hotelA.id } });
    await prisma.role.delete({ where: { id: roleId } });
    await prisma.hotel.deleteMany({ where: { id: { in: hotelIds } } });
    await prisma.$disconnect();
  });

  it('create() rechaza una habitación que pertenece a otro hotel', async () => {
    await expect(
      service.create(
        hotelA.id,
        { titularGuestId: guestA.id, roomId: roomB.id, checkInDate: '2027-01-01', checkOutDate: '2027-01-02', channelId: channelA.id, agreedPricePerNight: 1000 } as any,
        userA.id,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() rechaza un canal de venta que pertenece a otro hotel', async () => {
    await expect(
      service.create(
        hotelA.id,
        { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-01-03', checkOutDate: '2027-01-04', channelId: channelB.id, agreedPricePerNight: 1000 } as any,
        userA.id,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() rechaza reasignar la reserva a una habitación de otro hotel', async () => {
    const reservation = await service.create(
      hotelA.id,
      { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-02-01', checkOutDate: '2027-02-02', channelId: channelA.id, agreedPricePerNight: 1000 } as any,
      userA.id,
    );

    await expect(service.update(hotelA.id, reservation.id, { roomId: roomB.id } as any, userA.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() rechaza un plan de tarifa que pertenece a otro hotel', async () => {
    const reservation = await service.create(
      hotelA.id,
      { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-03-01', checkOutDate: '2027-03-02', channelId: channelA.id, agreedPricePerNight: 1000 } as any,
      userA.id,
    );

    await expect(service.update(hotelA.id, reservation.id, { ratePlanId: ratePlanB.id } as any, userA.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() acepta recursos que sí pertenecen al hotel del usuario', async () => {
    const reservation = await service.create(
      hotelA.id,
      { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-04-01', checkOutDate: '2027-04-02', channelId: channelA.id, agreedPricePerNight: 1500 } as any,
      userA.id,
    );
    expect(reservation.roomId).toBe(roomA.id);
    expect(reservation.hotelId).toBe(hotelA.id);
  });

  it('create() usa CONFIRMADA como estado por defecto cuando no se especifica', async () => {
    const reservation = await service.create(
      hotelA.id,
      { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-05-01', checkOutDate: '2027-05-02', channelId: channelA.id, agreedPricePerNight: 1000 } as any,
      userA.id,
    );
    expect(reservation.status).toBe('CONFIRMADA');
  });

  it('create() rechaza que se le pase CHECK_IN como estado inicial (evita saltear la lógica de check-in)', async () => {
    await expect(
      service.create(
        hotelA.id,
        { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-06-01', checkOutDate: '2027-06-02', channelId: channelA.id, agreedPricePerNight: 1000, status: 'CHECK_IN' } as any,
        userA.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirm() mueve una reserva de CONSULTA a CONFIRMADA', async () => {
    const reservation = await service.create(
      hotelA.id,
      { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-07-01', checkOutDate: '2027-07-02', channelId: channelA.id, agreedPricePerNight: 1000, status: 'CONSULTA' } as any,
      userA.id,
    );
    expect(reservation.status).toBe('CONSULTA');

    const confirmed = await service.confirm(hotelA.id, reservation.id, userA.id);
    expect(confirmed.status).toBe('CONFIRMADA');
  });

  it('confirm() rechaza confirmar una reserva que ya está confirmada', async () => {
    const reservation = await service.create(
      hotelA.id,
      { titularGuestId: guestA.id, roomId: roomA.id, checkInDate: '2027-08-01', checkOutDate: '2027-08-02', channelId: channelA.id, agreedPricePerNight: 1000 } as any,
      userA.id,
    );
    expect(reservation.status).toBe('CONFIRMADA');

    await expect(service.confirm(hotelA.id, reservation.id, userA.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});

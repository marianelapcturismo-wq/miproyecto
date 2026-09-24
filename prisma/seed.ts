/**
 * Datos de prueba realistas: catálogo de permisos/roles, un hotel, usuarios por
 * rol, tipos de habitación, habitaciones, tarifas, huéspedes y reservas en
 * distintos estados (pasadas, en curso, futuras, canceladas) para poder
 * validar disponibilidad, calendario, check-in/out, pagos y KPIs.
 */
import {
  PrismaClient,
  RoomStatus,
  ReservationStatus,
  PaymentMethod,
  PaymentType,
  ServiceCategory,
  CashMovementType,
  HousekeepingStatus,
  MaintenancePriority,
  MaintenanceStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const utcDate = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const PERMISSIONS = [
  ['dashboard.view', 'Ver dashboard operativo'],
  ['reservations.view', 'Ver reservas'],
  ['reservations.create', 'Crear reservas'],
  ['reservations.update', 'Editar reservas'],
  ['reservations.cancel', 'Cancelar reservas'],
  ['reservations.checkin', 'Realizar check-in'],
  ['reservations.checkout', 'Realizar check-out'],
  ['guests.view', 'Ver huéspedes'],
  ['guests.manage', 'Crear/editar huéspedes'],
  ['rooms.view', 'Ver habitaciones'],
  ['rooms.manage', 'Crear/editar habitaciones'],
  ['rooms.status.update', 'Cambiar estado de habitación'],
  ['roomtypes.view', 'Ver tipos de habitación'],
  ['roomtypes.manage', 'Crear/editar tipos de habitación'],
  ['payments.view', 'Ver pagos'],
  ['payments.create', 'Registrar pagos'],
  ['users.manage', 'Administrar usuarios y roles'],
  ['services.view', 'Ver catálogo de servicios'],
  ['services.manage', 'Crear/editar servicios'],
  ['consumptions.create', 'Cargar consumos a una reserva'],
  ['cash.view', 'Ver caja'],
  ['cash.manage', 'Abrir/cerrar caja y registrar movimientos'],
  ['housekeeping.view', 'Ver tareas de housekeeping'],
  ['housekeeping.manage', 'Gestionar tareas de housekeeping'],
  ['maintenance.view', 'Ver tareas de mantenimiento'],
  ['maintenance.manage', 'Gestionar tareas de mantenimiento'],
  ['rates.manage', 'Administrar planes de tarifa y precios'],
  ['channels.view', 'Ver canales de venta'],
  ['channels.manage', 'Administrar canales de venta'],
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map(([code]) => code),
  GERENTE: [
    'dashboard.view',
    'reservations.view',
    'reservations.update',
    'guests.view',
    'rooms.view',
    'roomtypes.view',
    'roomtypes.manage',
    'payments.view',
    'services.view',
    'cash.view',
    'housekeeping.view',
    'maintenance.view',
    'rates.manage',
    'channels.view',
    'channels.manage',
  ],
  RECEPCION: [
    'dashboard.view',
    'reservations.view',
    'reservations.create',
    'reservations.update',
    'reservations.cancel',
    'reservations.checkin',
    'reservations.checkout',
    'guests.view',
    'guests.manage',
    'rooms.view',
    'roomtypes.view',
    'payments.view',
    'payments.create',
    'services.view',
    'consumptions.create',
    'cash.view',
    'cash.manage',
    'channels.view',
  ],
  HOUSEKEEPING: ['dashboard.view', 'rooms.view', 'rooms.status.update', 'housekeeping.view', 'housekeeping.manage'],
  MANTENIMIENTO: ['dashboard.view', 'rooms.view', 'rooms.status.update', 'maintenance.view', 'maintenance.manage'],
};

async function main() {
  console.log('Sembrando catálogo de permisos y roles...');
  await prisma.permission.createMany({
    data: PERMISSIONS.map(([code, description]) => ({ code, description })),
    skipDuplicates: true,
  });

  const roles = await Promise.all(
    Object.keys(ROLE_PERMISSIONS).map((code) =>
      prisma.role.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: {
            ADMIN: 'Administrador',
            GERENTE: 'Gerente',
            RECEPCION: 'Recepción',
            HOUSEKEEPING: 'Housekeeping',
            MANTENIMIENTO: 'Mantenimiento',
          }[code]!,
        },
      }),
    ),
  );

  const allPermissions = await prisma.permission.findMany();
  for (const role of roles) {
    const codes = ROLE_PERMISSIONS[role.code];
    await prisma.rolePermission.createMany({
      data: allPermissions
        .filter((p) => codes.includes(p.code))
        .map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('Creando hotel demo...');
  const hotel = await prisma.hotel.create({
    data: {
      name: 'Hotel Los Alerces',
      country: 'AR',
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
    },
  });

  console.log('Creando canales de venta...');
  const CHANNEL_DEFS = [
    ['DIRECTO', 'Directo', 0],
    ['WEB', 'Web', 0],
    ['WHATSAPP', 'WhatsApp', 0],
    ['BOOKING', 'Booking.com', 15],
    ['EXPEDIA', 'Expedia', 18],
    ['AGENCIA', 'Agencia de viajes', 10],
    ['EMPRESA', 'Empresa', 0],
    ['OTRO', 'Otro', 0],
  ] as const;
  const channels = await Promise.all(
    CHANNEL_DEFS.map(([code, name, commissionPct]) =>
      prisma.channel.create({ data: { hotelId: hotel.id, code, name, commissionPct } }),
    ),
  );
  const channelByCode = Object.fromEntries(channels.map((c) => [c.code, c.id]));

  const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r.id]));
  const passwordHash = await bcrypt.hash('Demo1234!', 10);

  console.log('Creando usuarios de prueba...');
  const [admin, gerente, recepcion, housekeeping, mantenimiento] = await Promise.all([
    prisma.user.create({
      data: { hotelId: hotel.id, email: 'admin@hotellosalerces.com', passwordHash, firstName: 'Marianela', lastName: 'Administradora', roleId: roleByCode.ADMIN },
    }),
    prisma.user.create({
      data: { hotelId: hotel.id, email: 'gerente@hotellosalerces.com', passwordHash, firstName: 'Carlos', lastName: 'Gerente', roleId: roleByCode.GERENTE },
    }),
    prisma.user.create({
      data: { hotelId: hotel.id, email: 'recepcion@hotellosalerces.com', passwordHash, firstName: 'Lucía', lastName: 'Recepción', roleId: roleByCode.RECEPCION },
    }),
    prisma.user.create({
      data: { hotelId: hotel.id, email: 'housekeeping@hotellosalerces.com', passwordHash, firstName: 'Rosa', lastName: 'Limpieza', roleId: roleByCode.HOUSEKEEPING },
    }),
    prisma.user.create({
      data: { hotelId: hotel.id, email: 'mantenimiento@hotellosalerces.com', passwordHash, firstName: 'Jorge', lastName: 'Mantenimiento', roleId: roleByCode.MANTENIMIENTO },
    }),
  ]);

  console.log('Creando tipos de habitación...');
  const [individual, doble, triple, suite] = await Promise.all([
    prisma.roomType.create({ data: { hotelId: hotel.id, name: 'Individual', description: 'Habitación individual con baño privado', capacity: 1, basePrice: 30000 } }),
    prisma.roomType.create({ data: { hotelId: hotel.id, name: 'Doble', description: 'Habitación doble, una o dos camas', capacity: 2, basePrice: 45000 } }),
    prisma.roomType.create({ data: { hotelId: hotel.id, name: 'Triple', description: 'Habitación triple familiar', capacity: 3, basePrice: 58000 } }),
    prisma.roomType.create({ data: { hotelId: hotel.id, name: 'Suite', description: 'Suite con living independiente', capacity: 2, basePrice: 85000 } }),
  ]);

  console.log('Creando habitaciones...');
  const roomDefs: Array<{ number: string; roomTypeId: string; floor: string; status?: RoomStatus }> = [
    { number: '101', roomTypeId: individual.id, floor: '1' },
    { number: '102', roomTypeId: individual.id, floor: '1' },
    { number: '103', roomTypeId: individual.id, floor: '1' },
    { number: '104', roomTypeId: individual.id, floor: '1', status: RoomStatus.MANTENIMIENTO },
    { number: '201', roomTypeId: doble.id, floor: '2' },
    { number: '202', roomTypeId: doble.id, floor: '2' },
    { number: '203', roomTypeId: doble.id, floor: '2' },
    { number: '204', roomTypeId: doble.id, floor: '2' },
    { number: '205', roomTypeId: doble.id, floor: '2', status: RoomStatus.LIMPIEZA },
    { number: '206', roomTypeId: doble.id, floor: '2' },
    { number: '301', roomTypeId: triple.id, floor: '3' },
    { number: '302', roomTypeId: triple.id, floor: '3' },
    { number: '303', roomTypeId: triple.id, floor: '3' },
    { number: '401', roomTypeId: suite.id, floor: '4' },
    { number: '402', roomTypeId: suite.id, floor: '4' },
  ];
  const rooms = await Promise.all(
    roomDefs.map((r) =>
      prisma.room.create({
        data: {
          hotelId: hotel.id,
          roomTypeId: r.roomTypeId,
          number: r.number,
          floor: r.floor,
          status: r.status ?? RoomStatus.DISPONIBLE,
        },
      }),
    ),
  );
  const roomByNumber = Object.fromEntries(rooms.map((r) => [r.number, r]));

  console.log('Creando planes de tarifa y tarifas vigentes...');
  const [ratePlanEstandar, ratePlanNoReembolsable] = await Promise.all([
    prisma.ratePlan.create({ data: { hotelId: hotel.id, name: 'Tarifa Estándar', refundable: true, includesBreakfast: true } }),
    prisma.ratePlan.create({ data: { hotelId: hotel.id, name: 'No Reembolsable', refundable: false, includesBreakfast: false } }),
  ]);

  const validFrom = addDays(new Date(), -60);
  const validTo = addDays(new Date(), 180);
  const roomTypesForRates = [individual, doble, triple, suite];
  for (const rt of roomTypesForRates) {
    await prisma.rate.create({
      data: { hotelId: hotel.id, ratePlanId: ratePlanEstandar.id, roomTypeId: rt.id, price: rt.basePrice, validFrom, validTo },
    });
    await prisma.rate.create({
      data: { hotelId: hotel.id, ratePlanId: ratePlanNoReembolsable.id, roomTypeId: rt.id, price: Number(rt.basePrice) * 0.9, validFrom, validTo },
    });
  }

  console.log('Creando catálogo de servicios...');
  const SERVICE_DEFS: Array<{ name: string; category: ServiceCategory; price: number }> = [
    { name: 'Desayuno buffet', category: ServiceCategory.DESAYUNO, price: 6000 },
    { name: 'Cena restaurante', category: ServiceCategory.RESTAURANTE, price: 18000 },
    { name: 'Bebida bar', category: ServiceCategory.BAR, price: 4500 },
    { name: 'Minibar', category: ServiceCategory.MINIBAR, price: 5500 },
    { name: 'Estacionamiento por noche', category: ServiceCategory.ESTACIONAMIENTO, price: 3000 },
    { name: 'Servicio de lavandería', category: ServiceCategory.LAVANDERIA, price: 8000 },
    { name: 'Excursión al lago', category: ServiceCategory.EXCURSION, price: 25000 },
  ];
  const services = await Promise.all(SERVICE_DEFS.map((s) => prisma.service.create({ data: { hotelId: hotel.id, ...s } })));
  const serviceByName = Object.fromEntries(services.map((s) => [s.name, s]));

  console.log('Creando huéspedes...');
  const guestDefs = [
    { firstName: 'Juan', lastName: 'Pérez', documentNumber: '30111222', nationality: 'Argentina', phone: '+54 9 11 4000-1111', email: 'juan.perez@example.com' },
    { firstName: 'María', lastName: 'González', documentNumber: '28555666', nationality: 'Argentina', phone: '+54 9 11 4000-2222', email: 'maria.gonzalez@example.com' },
    { firstName: 'Pedro', lastName: 'Fernández', documentNumber: '32888999', nationality: 'Argentina', phone: '+54 9 11 4000-3333', email: 'pedro.fernandez@example.com' },
    { firstName: 'Ana', lastName: 'Martínez', documentNumber: '27444555', nationality: 'Argentina', phone: '+54 9 11 4000-4444', email: 'ana.martinez@example.com' },
    { firstName: 'Lucas', lastName: 'Sosa', documentNumber: '35222333', nationality: 'Argentina', phone: '+54 9 11 4000-5555', email: 'lucas.sosa@example.com' },
    { firstName: 'Carla', lastName: 'Romero', documentNumber: '31777888', nationality: 'Argentina', phone: '+54 9 11 4000-6666', email: 'carla.romero@example.com' },
    { firstName: 'Diego', lastName: 'Torres', documentNumber: '29666777', nationality: 'Argentina', phone: '+54 9 11 4000-7777', email: 'diego.torres@example.com' },
    { firstName: 'Sofía', lastName: 'Díaz', documentNumber: '33999000', nationality: 'Argentina', phone: '+54 9 11 4000-8888', email: 'sofia.diaz@example.com' },
    { firstName: 'Camila', lastName: 'Núñez', documentType: 'Pasaporte', documentNumber: 'CH1234567', nationality: 'Chile', phone: '+56 9 8000-1111', email: 'camila.nunez@example.com' },
    { firstName: 'Bruno', lastName: 'Silva', documentType: 'Pasaporte', documentNumber: 'BR7654321', nationality: 'Brasil', phone: '+55 11 90000-1111', email: 'bruno.silva@example.com' },
  ];
  const guests = await Promise.all(
    guestDefs.map((g) => prisma.guest.create({ data: { hotelId: hotel.id, ...g } })),
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  type ResDef = {
    room: string;
    guest: number;
    checkIn: Date;
    checkOut: Date;
    status: ReservationStatus;
    channelCode: string;
    pricePerNight: number;
    ratePlanId: string;
    payments?: Array<{ amount: number; method: PaymentMethod; type: PaymentType }>;
    markCheckedIn?: boolean;
    markCheckedOut?: boolean;
  };

  const reservationDefs: ResDef[] = [
    // Estadías pasadas ya cerradas (para que haya historia/KPIs)
    { room: '201', guest: 0, checkIn: addDays(today, -10), checkOut: addDays(today, -7), status: ReservationStatus.CHECK_OUT, channelCode: 'DIRECTO', pricePerNight: 45000, ratePlanId: ratePlanEstandar.id, markCheckedIn: true, markCheckedOut: true, payments: [{ amount: 135000, method: PaymentMethod.TRANSFERENCIA, type: PaymentType.FINAL }] },
    { room: '301', guest: 1, checkIn: addDays(today, -6), checkOut: addDays(today, -3), status: ReservationStatus.CHECK_OUT, channelCode: 'BOOKING', pricePerNight: 58000, ratePlanId: ratePlanEstandar.id, markCheckedIn: true, markCheckedOut: true, payments: [{ amount: 174000, method: PaymentMethod.TARJETA, type: PaymentType.FINAL }] },
    { room: '101', guest: 2, checkIn: addDays(today, -5), checkOut: addDays(today, -2), status: ReservationStatus.NO_SHOW, channelCode: 'WHATSAPP', pricePerNight: 30000, ratePlanId: ratePlanNoReembolsable.id },

    // En curso ahora mismo (huésped alojado)
    { room: '202', guest: 3, checkIn: addDays(today, -2), checkOut: addDays(today, 2), status: ReservationStatus.CHECK_IN, channelCode: 'DIRECTO', pricePerNight: 45000, ratePlanId: ratePlanEstandar.id, markCheckedIn: true, payments: [{ amount: 90000, method: PaymentMethod.EFECTIVO, type: PaymentType.PARCIAL }] },
    { room: '401', guest: 4, checkIn: addDays(today, -1), checkOut: addDays(today, 3), status: ReservationStatus.CHECK_IN, channelCode: 'AGENCIA', pricePerNight: 85000, ratePlanId: ratePlanEstandar.id, markCheckedIn: true, payments: [{ amount: 170000, method: PaymentMethod.TRANSFERENCIA, type: PaymentType.PARCIAL }] },
    { room: '302', guest: 5, checkIn: today, checkOut: addDays(today, 4), status: ReservationStatus.CHECK_IN, channelCode: 'DIRECTO', pricePerNight: 58000, ratePlanId: ratePlanEstandar.id, markCheckedIn: true },

    // Check-in previsto para hoy (recepción debe procesarlo)
    { room: '203', guest: 6, checkIn: today, checkOut: addDays(today, 3), status: ReservationStatus.CONFIRMADA, channelCode: 'DIRECTO', pricePerNight: 45000, ratePlanId: ratePlanEstandar.id, payments: [{ amount: 45000, method: PaymentMethod.TRANSFERENCIA, type: PaymentType.SENA }] },

    // Check-out previsto para hoy
    { room: '204', guest: 7, checkIn: addDays(today, -3), checkOut: today, status: ReservationStatus.CHECK_IN, channelCode: 'BOOKING', pricePerNight: 45000, ratePlanId: ratePlanEstandar.id, markCheckedIn: true, payments: [{ amount: 135000, method: PaymentMethod.TARJETA, type: PaymentType.FINAL }] },

    // Futuras confirmadas / pre-reservas / consultas (para calendario y forecast)
    { room: '206', guest: 8, checkIn: addDays(today, 3), checkOut: addDays(today, 6), status: ReservationStatus.CONFIRMADA, channelCode: 'EXPEDIA', pricePerNight: 45000, ratePlanId: ratePlanEstandar.id },
    { room: '303', guest: 9, checkIn: addDays(today, 5), checkOut: addDays(today, 9), status: ReservationStatus.PRE_RESERVA, channelCode: 'WHATSAPP', pricePerNight: 58000, ratePlanId: ratePlanNoReembolsable.id },
    { room: '402', guest: 0, checkIn: addDays(today, 8), checkOut: addDays(today, 12), status: ReservationStatus.CONFIRMADA, channelCode: 'DIRECTO', pricePerNight: 85000, ratePlanId: ratePlanEstandar.id, payments: [{ amount: 85000, method: PaymentMethod.EFECTIVO, type: PaymentType.SENA }] },
    { room: '102', guest: 1, checkIn: addDays(today, 15), checkOut: addDays(today, 17), status: ReservationStatus.CONSULTA, channelCode: 'WEB', pricePerNight: 30000, ratePlanId: ratePlanEstandar.id },
    { room: '201', guest: 2, checkIn: addDays(today, 20), checkOut: addDays(today, 23), status: ReservationStatus.CONFIRMADA, channelCode: 'DIRECTO', pricePerNight: 45000, ratePlanId: ratePlanEstandar.id },

    // Cancelada (no debe contar como ocupación)
    { room: '103', guest: 3, checkIn: addDays(today, 2), checkOut: addDays(today, 4), status: ReservationStatus.CANCELADA, channelCode: 'DIRECTO', pricePerNight: 30000, ratePlanId: ratePlanEstandar.id },
  ];

  console.log('Creando reservas de prueba...');
  const reservationByRoom: Record<string, { id: string }> = {};
  for (const def of reservationDefs) {
    const room = roomByNumber[def.room];
    const guest = guests[def.guest];
    const reservation = await prisma.reservation.create({
      data: {
        hotelId: hotel.id,
        titularGuestId: guest.id,
        roomId: room.id,
        ratePlanId: def.ratePlanId,
        checkInDate: def.checkIn,
        checkOutDate: def.checkOut,
        guestsCount: 1,
        status: def.status,
        channelId: channelByCode[def.channelCode],
        agreedPricePerNight: def.pricePerNight,
        createdById: recepcion.id,
        actualCheckInAt: def.markCheckedIn ? def.checkIn : null,
        actualCheckOutAt: def.markCheckedOut ? def.checkOut : null,
      },
    });
    reservationByRoom[def.room] = reservation;
    await prisma.reservationGuest.create({ data: { reservationId: reservation.id, guestId: guest.id, isTitular: true } });
    if (def.payments) {
      for (const p of def.payments) {
        await prisma.payment.create({
          data: { hotelId: hotel.id, reservationId: reservation.id, amount: p.amount, method: p.method, type: p.type, registeredById: recepcion.id },
        });
      }
    }
  }

  // Estados de habitación coherentes con las reservas activas
  const occupiedRoomNumbers = ['202', '401', '302', '204'];
  await prisma.room.updateMany({ where: { hotelId: hotel.id, number: { in: occupiedRoomNumbers } }, data: { status: RoomStatus.OCUPADA } });

  console.log('Cargando consumos de ejemplo...');
  const consumptionDefs = [
    { room: '202', service: 'Desayuno buffet', quantity: 3 },
    { room: '202', service: 'Minibar', quantity: 1 },
    { room: '401', service: 'Cena restaurante', quantity: 2 },
    { room: '401', service: 'Excursión al lago', quantity: 2 },
    { room: '302', service: 'Bebida bar', quantity: 4 },
  ];
  for (const c of consumptionDefs) {
    const service = serviceByName[c.service];
    await prisma.consumption.create({
      data: {
        hotelId: hotel.id,
        reservationId: reservationByRoom[c.room].id,
        serviceId: service.id,
        quantity: c.quantity,
        unitPrice: service.price,
        registeredById: recepcion.id,
      },
    });
  }

  console.log('Abriendo caja del día con movimientos de ejemplo...');
  const cashSession = await prisma.cashSession.create({
    data: { hotelId: hotel.id, openedById: recepcion.id, openingAmount: 50000 },
  });
  await prisma.cashMovement.createMany({
    data: [
      { hotelId: hotel.id, cashSessionId: cashSession.id, type: CashMovementType.INGRESO, concept: 'Seña reserva Torres, Diego', amount: 45000, method: PaymentMethod.TRANSFERENCIA, registeredById: recepcion.id },
      { hotelId: hotel.id, cashSessionId: cashSession.id, type: CashMovementType.INGRESO, concept: 'Pago parcial reserva Martínez, Ana', amount: 90000, method: PaymentMethod.EFECTIVO, registeredById: recepcion.id },
      { hotelId: hotel.id, cashSessionId: cashSession.id, type: CashMovementType.EGRESO, concept: 'Compra insumos de limpieza', amount: 12000, method: PaymentMethod.EFECTIVO, registeredById: recepcion.id },
    ],
  });

  console.log('Creando tareas de housekeeping y mantenimiento...');
  await prisma.housekeepingTask.createMany({
    data: [
      { hotelId: hotel.id, roomId: roomByNumber['204'].id, status: HousekeepingStatus.PENDIENTE, assignedToId: housekeeping.id, notes: 'Check-out del día, preparar para próximo huésped.' },
      { hotelId: hotel.id, roomId: roomByNumber['205'].id, status: HousekeepingStatus.EN_PROCESO, assignedToId: housekeeping.id },
    ],
  });
  await prisma.maintenanceTask.create({
    data: {
      hotelId: hotel.id,
      roomId: roomByNumber['104'].id,
      issue: 'Pérdida de agua en el baño',
      priority: MaintenancePriority.ALTA,
      status: MaintenanceStatus.EN_PROCESO,
      assignedToId: mantenimiento.id,
      notes: 'Se avisó al plomero, espera repuesto.',
    },
  });

  console.log('Seed completado.');
  console.log('Usuarios de prueba (password: Demo1234!):');
  for (const u of [admin, gerente, recepcion, housekeeping, mantenimiento]) {
    console.log(`  - ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export type RoomStatus = 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'LIMPIEZA' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

export type ReservationStatus =
  | 'CONSULTA'
  | 'PRE_RESERVA'
  | 'CONFIRMADA'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'CANCELADA'
  | 'NO_SHOW';

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';
export type PaymentType = 'SENA' | 'PARCIAL' | 'FINAL' | 'DEVOLUCION';

export type ServiceCategory = 'DESAYUNO' | 'RESTAURANTE' | 'BAR' | 'MINIBAR' | 'ESTACIONAMIENTO' | 'LAVANDERIA' | 'EXCURSION' | 'OTRO';
export type CashSessionStatus = 'ABIERTA' | 'CERRADA';
export type CashMovementType = 'INGRESO' | 'EGRESO';
export type HousekeepingStatus = 'PENDIENTE' | 'EN_PROCESO' | 'LIMPIA' | 'INSPECCIONADA' | 'CON_PROBLEMA';
export type MaintenancePriority = 'BAJA' | 'MEDIA' | 'ALTA';
export type MaintenanceStatus = 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTO';
export type GoalMetric = 'OCUPACION' | 'ADR' | 'REVPAR' | 'INGRESOS' | 'CANCELACIONES' | 'VENTA_DIRECTA_PCT';

export interface Variation {
  current: number;
  previous: number | null;
  absolute: number | null;
  percent: number | null;
}

export interface KpiSummary {
  period: { from: string; to: string };
  comparePeriod: { from: string; to: string } | null;
  occupancyRate: Variation;
  adr: Variation;
  revpar: Variation;
  totalRevenue: Variation;
  roomRevenue: Variation;
  otherRevenue: Variation;
  reservations: {
    total: Variation;
    cancelled: Variation;
    noShow: Variation;
    cancellationRate: Variation;
    avgStayNights: Variation;
    avgLeadTimeDays: Variation;
  };
  totalRooms: number;
  soldRoomNights: number;
  availableRoomNights: number;
  alerts: string[];
}

export interface KpiSeriesPoint {
  date: string;
  totalRooms: number;
  soldRoomNights: number;
  roomRevenue: number;
  otherRevenue: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

export interface ChannelReport {
  channelId: string;
  channelName: string;
  channelCode: string;
  commissionPct: number;
  reservationsCount: number;
  cancelledCount: number;
  noShowCount: number;
  participationPct: number;
  grossRevenue: number;
  netRevenue: number;
}

export interface GuestsReport {
  totalStays: number;
  distinctGuests: number;
  newGuests: number;
  recurringGuests: number;
  repeatRatePct: number;
  avgStayNights: number;
  avgSpendPerStay: number;
}

export interface ConsumptionsReport {
  totalRevenue: number;
  services: { serviceId: string; name: string; category: ServiceCategory; quantity: number; revenue: number }[];
}

export interface ForecastDay {
  date: string;
  soldRoomNights: number;
  totalRooms: number;
  occupancyRate: number;
  projectedRevenue: number;
  arrivals: { guest: string; room: string }[];
  departures: { guest: string; room: string }[];
}

export interface Forecast {
  from: string;
  to: string;
  totalRooms: number;
  avgOccupancyRate: number;
  totalProjectedRevenue: number;
  totalArrivals: number;
  totalDepartures: number;
  lowDemandDates: string[];
  days: ForecastDay[];
}

export interface Goal {
  id: string;
  metric: GoalMetric;
  periodStart: string;
  periodEnd: string;
  targetValue: string;
  notes?: string | null;
  createdById: string;
  createdAt: string;
}

export interface GoalProgress extends Omit<Goal, 'targetValue'> {
  targetValue: string;
  actualValue: number;
  achievedPct: number;
  onTrack: boolean;
  isMaxTarget: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string } | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName: string;
  permissions: string[];
  hotel: { id: string; name: string; currency: string; timezone: string };
}

export interface RoomType {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  basePrice: string;
  active: boolean;
  _count?: { rooms: number };
}

export interface Room {
  id: string;
  number: string;
  floor?: string | null;
  beds?: string | null;
  features?: string | null;
  status: RoomStatus;
  notes?: string | null;
  roomTypeId: string;
  roomType: RoomType;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  nationality?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  reservationsAsTitular?: Reservation[];
}

export interface RatePlan {
  id: string;
  name: string;
  refundable: boolean;
  includesBreakfast: boolean;
  description?: string | null;
  active?: boolean;
}

export interface Rate {
  id: string;
  ratePlanId: string;
  ratePlan?: RatePlan;
  roomTypeId: string;
  roomType?: RoomType;
  price: string;
  validFrom: string;
  validTo: string;
}

export interface Channel {
  id: string;
  code: string;
  name: string;
  commissionPct: string;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  price: string;
  active: boolean;
}

export interface Consumption {
  id: string;
  reservationId: string;
  serviceId: string;
  service: Service;
  quantity: number;
  unitPrice: string;
  date: string;
  notes?: string | null;
}

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  type: PaymentType;
  notes?: string | null;
  createdAt: string;
}

export interface Reservation {
  id: string;
  titularGuestId: string;
  titularGuest: Guest;
  roomId: string;
  room: Room;
  ratePlanId?: string | null;
  ratePlan?: RatePlan | null;
  checkInDate: string;
  checkOutDate: string;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  guestsCount: number;
  status: ReservationStatus;
  channelId: string;
  channel: Channel;
  agreedPricePerNight: string;
  notes?: string | null;
  payments: Payment[];
  consumptions: Consumption[];
  nights: number;
  roomTotal: number;
  consumptionsTotal: number;
  total: number;
  paid: number;
  balance: number;
  createdBy: { id: string; firstName: string; lastName: string };
}

export interface CashMovement {
  id: string;
  type: CashMovementType;
  concept: string;
  amount: string;
  method: PaymentMethod;
  paymentId?: string | null;
  registeredBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CashSession {
  id: string;
  openingAmount: string;
  closingAmount?: string | null;
  status: CashSessionStatus;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openedBy: { id: string; firstName: string; lastName: string };
  closedBy?: { id: string; firstName: string; lastName: string } | null;
  movements: CashMovement[];
  summary: { ingresos: number; egresos: number; expectedAmount: number };
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  room: Room;
  status: HousekeepingStatus;
  assignedToId?: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface MaintenanceTask {
  id: string;
  roomId: string;
  room: Room;
  issue: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedToId?: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  notes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface DashboardToday {
  occupancy: {
    rate: number;
    occupiedRooms: number;
    availableRooms: number;
    reservedRooms: number;
    cleaningRooms: number;
    maintenanceRooms: number;
    outOfServiceRooms: number;
    totalRooms: number;
  };
  checkInsToday: { id: string; guest: string; room: string }[];
  checkOutsToday: { id: string; guest: string; room: string }[];
  arrivalsNext7Days: number;
  departuresNext7Days: number;
  pendingReservations: number;
  pendingPayments: { id: string; guest: string; room: string; balance: number }[];
  pendingHousekeepingTasks: number;
  pendingMaintenanceTasks: number;
  cashSessionOpen: boolean;
  alerts: string[];
}

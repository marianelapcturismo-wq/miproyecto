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
  channel: string;
  agreedPricePerNight: string;
  notes?: string | null;
  payments: Payment[];
  nights: number;
  total: number;
  paid: number;
  balance: number;
  createdBy: { id: string; firstName: string; lastName: string };
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
  alerts: string[];
}

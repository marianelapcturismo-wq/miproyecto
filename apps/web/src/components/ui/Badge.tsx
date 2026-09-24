import { ReactNode } from 'react';
import clsx from 'clsx';

const COLORS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
};

export function Badge({ color = 'slate', children }: { color?: keyof typeof COLORS; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', COLORS[color])}>
      {children}
    </span>
  );
}

const ROOM_STATUS_COLOR: Record<string, keyof typeof COLORS> = {
  DISPONIBLE: 'green',
  OCUPADA: 'blue',
  RESERVADA: 'cyan',
  LIMPIEZA: 'amber',
  MANTENIMIENTO: 'purple',
  FUERA_DE_SERVICIO: 'red',
};
const ROOM_STATUS_LABEL: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  RESERVADA: 'Reservada',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};
export function RoomStatusBadge({ status }: { status: string }) {
  return <Badge color={ROOM_STATUS_COLOR[status] ?? 'slate'}>{ROOM_STATUS_LABEL[status] ?? status}</Badge>;
}

const RES_STATUS_COLOR: Record<string, keyof typeof COLORS> = {
  CONSULTA: 'slate',
  PRE_RESERVA: 'amber',
  CONFIRMADA: 'blue',
  CHECK_IN: 'green',
  CHECK_OUT: 'purple',
  CANCELADA: 'red',
  NO_SHOW: 'red',
};
const RES_STATUS_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta',
  PRE_RESERVA: 'Pre-reserva',
  CONFIRMADA: 'Confirmada',
  CHECK_IN: 'Check-in',
  CHECK_OUT: 'Check-out',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'No show',
};
export function ReservationStatusBadge({ status }: { status: string }) {
  return <Badge color={RES_STATUS_COLOR[status] ?? 'slate'}>{RES_STATUS_LABEL[status] ?? status}</Badge>;
}

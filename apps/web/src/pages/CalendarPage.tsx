import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../lib/api';
import { Reservation, Room, RoomType } from '../lib/types';
import { Button } from '../components/ui/Button';
import { toDateInputValue } from '../lib/format';
import { ReservationFormModal } from '../components/reservations/ReservationFormModal';

const DAY_COUNT = 14;
const MS_DAY = 86_400_000;

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY);
}

const STATUS_COLOR: Record<string, string> = {
  CONSULTA: 'bg-slate-300 text-slate-800',
  PRE_RESERVA: 'bg-amber-300 text-amber-900',
  CONFIRMADA: 'bg-blue-400 text-white',
  CHECK_IN: 'bg-emerald-500 text-white',
  CHECK_OUT: 'bg-purple-400 text-white',
  CANCELADA: 'bg-red-200 text-red-700 line-through',
  NO_SHOW: 'bg-red-200 text-red-700',
};

export function CalendarPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(() => startOfDayUTC(new Date()));
  const [roomTypeId, setRoomTypeId] = useState('');
  const [createDefaults, setCreateDefaults] = useState<{ roomId: string; checkIn: string } | null>(null);

  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => addDays(startDate, i)), [startDate]);
  const rangeTo = addDays(startDate, DAY_COUNT);

  const { data: roomTypes } = useQuery({ queryKey: ['room-types'], queryFn: async () => (await api.get<RoomType[]>('/room-types')).data });
  const { data: rooms } = useQuery({
    queryKey: ['rooms-calendar', roomTypeId],
    queryFn: async () => (await api.get<Room[]>('/rooms', { params: roomTypeId ? { roomTypeId } : {} })).data,
  });
  const { data: reservations } = useQuery({
    queryKey: ['reservations-calendar', toDateInputValue(startDate), toDateInputValue(rangeTo)],
    queryFn: async () =>
      (
        await api.get<Reservation[]>('/reservations', {
          params: { from: toDateInputValue(startDate), to: toDateInputValue(rangeTo) },
        })
      ).data,
  });

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations?.forEach((r) => {
      if (!map.has(r.roomId)) map.set(r.roomId, []);
      map.get(r.roomId)!.push(r);
    });
    return map;
  }, [reservations]);

  const roomsByType = useMemo(() => {
    const map = new Map<string, Room[]>();
    rooms?.forEach((r) => {
      const key = r.roomType.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [rooms]);

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>, roomId: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const dayIndex = Math.floor(((e.clientX - rect.left) / rect.width) * DAY_COUNT);
    const clickedDate = addDays(startDate, Math.max(0, Math.min(DAY_COUNT - 1, dayIndex)));
    setCreateDefaults({ roomId, checkIn: toDateInputValue(clickedDate) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Calendario de reservas</h1>
          <p className="text-sm text-slate-500">Hacé click en una celda vacía para crear una reserva. Hacé click en un bloque para verla.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
            <option value="">Todos los tipos</option>
            {roomTypes?.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => setStartDate(addDays(startDate, -7))}>
            ← 7 días
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setStartDate(startOfDayUTC(new Date()))}>
            Hoy
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setStartDate(addDays(startDate, 7))}>
            7 días →
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div style={{ minWidth: 160 + DAY_COUNT * 64 }}>
          {/* Encabezado de fechas */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
            <div className="w-40 shrink-0 px-3 py-2">Habitación</div>
            <div className="flex flex-1">
              {days.map((d) => {
                const isToday = diffDays(startOfDayUTC(new Date()), d) === 0;
                const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                return (
                  <div
                    key={d.toISOString()}
                    className={clsx('flex-1 border-l border-slate-100 py-2 text-center', isToday && 'bg-brand-50 font-semibold text-brand-700', isWeekend && !isToday && 'bg-slate-100/60')}
                  >
                    {d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filas por tipo de habitación */}
          {Array.from(roomsByType.entries()).map(([roomTypeId, roomsOfType]) => (
            <div key={roomTypeId}>
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{roomsOfType[0]?.roomType.name}</div>
              {roomsOfType.map((room) => (
                <div key={room.id} className="flex border-b border-slate-100 last:border-0">
                  <div className="w-40 shrink-0 px-3 py-3 text-sm font-medium text-slate-700">{room.number}</div>
                  <div className="relative h-12 flex-1 cursor-pointer" onClick={(e) => handleRowClick(e, room.id)}>
                    <div className="absolute inset-0 flex">
                      {days.map((d) => (
                        <div key={d.toISOString()} className="flex-1 border-l border-slate-100" />
                      ))}
                    </div>
                    {(reservationsByRoom.get(room.id) ?? [])
                      .filter((r) => r.status !== 'CANCELADA' && r.status !== 'NO_SHOW')
                      .map((r) => {
                        const rawStart = diffDays(startDate, new Date(r.checkInDate));
                        const rawEnd = diffDays(startDate, new Date(r.checkOutDate));
                        const start = Math.max(0, rawStart);
                        const end = Math.min(DAY_COUNT, rawEnd);
                        if (end <= start) return null;
                        const left = (start / DAY_COUNT) * 100;
                        const width = ((end - start) / DAY_COUNT) * 100;
                        return (
                          <div
                            key={r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/reservations/${r.id}`);
                            }}
                            className={clsx('absolute top-1.5 h-9 truncate rounded-md px-2 py-1.5 text-xs font-medium shadow-sm', STATUS_COLOR[r.status])}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${r.titularGuest.firstName} ${r.titularGuest.lastName} · ${r.status}`}
                          >
                            {r.titularGuest.lastName}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {createDefaults && (
        <ReservationFormModal
          defaultRoomId={createDefaults.roomId}
          defaultCheckIn={createDefaults.checkIn}
          onClose={() => setCreateDefaults(null)}
          onCreated={(id) => {
            setCreateDefaults(null);
            navigate(`/reservations/${id}`);
          }}
        />
      )}
    </div>
  );
}

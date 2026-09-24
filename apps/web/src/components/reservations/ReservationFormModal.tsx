import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Channel, RatePlan, Room, RoomType } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, inputClass } from '../ui/FormField';
import { GuestPicker } from './GuestPicker';
import { toDateInputValue } from '../../lib/format';

interface Props {
  onClose: () => void;
  onCreated: (reservationId: string) => void;
  defaultRoomId?: string;
  defaultCheckIn?: string;
}

export function ReservationFormModal({ onClose, onCreated, defaultRoomId, defaultCheckIn }: Props) {
  const queryClient = useQueryClient();
  const { data: roomTypes } = useQuery({ queryKey: ['room-types'], queryFn: async () => (await api.get<RoomType[]>('/room-types')).data });
  const { data: ratePlans } = useQuery({ queryKey: ['rate-plans'], queryFn: async () => (await api.get<RatePlan[]>('/rate-plans', { params: { activeOnly: 'true' } })).data });
  const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: async () => (await api.get<Channel[]>('/channels')).data });

  const today = toDateInputValue(new Date());
  const [roomTypeId, setRoomTypeId] = useState('');
  const [checkInDate, setCheckInDate] = useState(defaultCheckIn ?? today);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckIn ?? today);
  const [roomId, setRoomId] = useState(defaultRoomId ?? '');
  const [ratePlanId, setRatePlanId] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [channelId, setChannelId] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState(0);
  const [guest, setGuest] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkOutDate || checkOutDate <= checkInDate) {
      const d = new Date(checkInDate);
      d.setDate(d.getDate() + 1);
      setCheckOutDate(toDateInputValue(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInDate]);

  const { data: availableRooms } = useQuery({
    queryKey: ['available-rooms', roomTypeId, checkInDate, checkOutDate],
    queryFn: async () =>
      (
        await api.get<Room[]>('/reservations/available-rooms', {
          params: { roomTypeId, checkInDate, checkOutDate },
        })
      ).data,
    enabled: !!roomTypeId && !!checkInDate && !!checkOutDate && checkOutDate > checkInDate,
  });

  useEffect(() => {
    const rt = roomTypes?.find((r) => r.id === roomTypeId);
    if (rt) setPrice(Number(rt.basePrice));
  }, [roomTypeId, roomTypes]);

  useEffect(() => {
    if (!channelId && channels && channels.length > 0) {
      const directo = channels.find((c) => c.code === 'DIRECTO');
      setChannelId(directo?.id ?? channels[0].id);
    }
  }, [channels, channelId]);

  const create = useMutation({
    mutationFn: async () =>
      api.post('/reservations', {
        titularGuestId: guest?.id,
        roomId,
        ratePlanId: ratePlanId || undefined,
        checkInDate,
        checkOutDate,
        guestsCount,
        channelId,
        agreedPricePerNight: price,
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
      onCreated(res.data.id);
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const canSubmit = guest && roomId && channelId && checkInDate && checkOutDate > checkInDate && price >= 0;

  return (
    <Modal title="Nueva reserva" onClose={onClose} width="max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) create.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Fecha de entrada">
            <input type="date" className={inputClass} value={checkInDate} min={today} onChange={(e) => setCheckInDate(e.target.value)} required />
          </FormField>
          <FormField label="Fecha de salida">
            <input type="date" className={inputClass} value={checkOutDate} min={checkInDate} onChange={(e) => setCheckOutDate(e.target.value)} required />
          </FormField>
        </div>

        <FormField label="Tipo de habitación">
          <select
            className={inputClass}
            value={roomTypeId}
            onChange={(e) => {
              setRoomTypeId(e.target.value);
              setRoomId('');
            }}
            required
          >
            <option value="" disabled>
              Seleccionar...
            </option>
            {roomTypes?.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} (cap. {rt.capacity})
              </option>
            ))}
          </select>
        </FormField>

        {roomTypeId && (
          <FormField label="Habitación disponible">
            {availableRooms?.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">No hay habitaciones de este tipo disponibles para esas fechas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableRooms?.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRoomId(r.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${roomId === r.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {r.number}
                  </button>
                ))}
              </div>
            )}
          </FormField>
        )}

        <FormField label="Huésped titular">
          <GuestPicker value={guest} onChange={setGuest} />
        </FormField>

        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Plan de tarifa">
            <select className={inputClass} value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              <option value="">Sin plan específico</option>
              {ratePlans?.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {rp.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Precio por noche">
            <input type="number" min={0} className={inputClass} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Cantidad de huéspedes">
            <input type="number" min={1} className={inputClass} value={guestsCount} onChange={(e) => setGuestsCount(Number(e.target.value))} />
          </FormField>
          <FormField label="Canal de venta">
            <select className={inputClass} value={channelId} onChange={(e) => setChannelId(e.target.value)} required>
              {channels?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Observaciones">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear reserva'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

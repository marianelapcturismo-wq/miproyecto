import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Rate, RatePlan, RoomType } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { formatCurrency, formatDate, toDateInputValue } from '../lib/format';
import { useAuth } from '../auth/AuthContext';

export function RatesPage() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission('rates.manage');
  const currency = user?.hotel.currency;

  const { data: ratePlans } = useQuery({ queryKey: ['rate-plans-all'], queryFn: async () => (await api.get<RatePlan[]>('/rate-plans')).data });
  const { data: rates, isLoading } = useQuery({ queryKey: ['rates'], queryFn: async () => (await api.get<Rate[]>('/rates')).data });
  const { data: roomTypes } = useQuery({ queryKey: ['room-types'], queryFn: async () => (await api.get<RoomType[]>('/room-types')).data });

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);

  const deleteRate = useMutation({
    mutationFn: async (id: string) => api.delete(`/rates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rates'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tarifas</h1>
        <p className="text-sm text-slate-500">Planes comerciales y precios vigentes por tipo de habitación y período.</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Planes de tarifa</h2>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setShowPlanForm(true);
            }}
          >
            + Nuevo plan
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ratePlans?.map((rp) => (
          <Card key={rp.id} className="p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-slate-900">{rp.name}</h3>
              {canManage && (
                <button
                  onClick={() => {
                    setEditingPlan(rp);
                    setShowPlanForm(true);
                  }}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Editar
                </button>
              )}
            </div>
            {rp.description && <p className="mt-1 text-sm text-slate-500">{rp.description}</p>}
            <div className="mt-2 flex gap-2 text-xs text-slate-500">
              <span>{rp.refundable ? 'Reembolsable' : 'No reembolsable'}</span>
              <span>·</span>
              <span>{rp.includesBreakfast ? 'Con desayuno' : 'Sin desayuno'}</span>
              <span>·</span>
              <span>{rp.active ? 'Activo' : 'Inactivo'}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold text-slate-900">Precios vigentes</h2>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setEditingRate(null);
              setShowRateForm(true);
            }}
          >
            + Nueva tarifa
          </Button>
        )}
      </div>
      <Card>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Tipo de habitación</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Vigencia</th>
                <th className="px-4 py-2 text-right">Precio/noche</th>
                {canManage && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rates?.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{r.roomType?.name}</td>
                  <td className="px-4 py-2 text-slate-600">{r.ratePlan?.name}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {formatDate(r.validFrom)} → {formatDate(r.validTo)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-800">{formatCurrency(r.price, currency)}</td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => {
                          setEditingRate(r);
                          setShowRateForm(true);
                        }}
                        className="mr-3 text-xs font-medium text-brand-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button onClick={() => deleteRate.mutate(r.id)} className="text-xs font-medium text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rates?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No hay tarifas cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showPlanForm && <RatePlanFormModal ratePlan={editingPlan} onClose={() => setShowPlanForm(false)} />}
      {showRateForm && <RateFormModal rate={editingRate} ratePlans={ratePlans ?? []} roomTypes={roomTypes ?? []} onClose={() => setShowRateForm(false)} />}
    </div>
  );
}

function RatePlanFormModal({ ratePlan, onClose }: { ratePlan: RatePlan | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(ratePlan?.name ?? '');
  const [description, setDescription] = useState(ratePlan?.description ?? '');
  const [refundable, setRefundable] = useState(ratePlan?.refundable ?? true);
  const [includesBreakfast, setIncludesBreakfast] = useState(ratePlan?.includesBreakfast ?? false);
  const [active, setActive] = useState(ratePlan?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name, description: description || undefined, refundable, includesBreakfast, active };
      return ratePlan ? api.patch(`/rate-plans/${ratePlan.id}`, body) : api.post('/rate-plans', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['rate-plans'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title={ratePlan ? 'Editar plan de tarifa' : 'Nuevo plan de tarifa'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <FormField label="Nombre">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <FormField label="Descripción">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={refundable} onChange={(e) => setRefundable(e.target.checked)} />
          Reembolsable
        </label>
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includesBreakfast} onChange={(e) => setIncludesBreakfast(e.target.checked)} />
          Incluye desayuno
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activo
        </label>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RateFormModal({ rate, ratePlans, roomTypes, onClose }: { rate: Rate | null; ratePlans: RatePlan[]; roomTypes: RoomType[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [ratePlanId, setRatePlanId] = useState(rate?.ratePlanId ?? ratePlans[0]?.id ?? '');
  const [roomTypeId, setRoomTypeId] = useState(rate?.roomTypeId ?? roomTypes[0]?.id ?? '');
  const [price, setPrice] = useState(rate ? Number(rate.price) : 0);
  const [validFrom, setValidFrom] = useState(rate ? toDateInputValue(rate.validFrom) : toDateInputValue(new Date()));
  const [validTo, setValidTo] = useState(rate ? toDateInputValue(rate.validTo) : toDateInputValue(new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = { ratePlanId, roomTypeId, price, validFrom, validTo };
      return rate ? api.patch(`/rates/${rate.id}`, body) : api.post('/rates', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Modal title={rate ? 'Editar tarifa' : 'Nueva tarifa'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <FormField label="Tipo de habitación">
          <select className={inputClass} value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} required>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Plan de tarifa">
          <select className={inputClass} value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)} required>
            {ratePlans.map((rp) => (
              <option key={rp.id} value={rp.id}>
                {rp.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Precio por noche">
          <input type="number" min={0} className={inputClass} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
        </FormField>
        <div className="grid grid-cols-2 gap-x-3">
          <FormField label="Vigente desde">
            <input type="date" className={inputClass} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
          </FormField>
          <FormField label="Vigente hasta">
            <input type="date" className={inputClass} value={validTo} min={validFrom} onChange={(e) => setValidTo(e.target.value)} required />
          </FormField>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

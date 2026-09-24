import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Guest } from '../../lib/types';
import { inputClass } from '../ui/FormField';

export function GuestPicker({ value, onChange }: { value: { id: string; label: string } | null; onChange: (guest: { id: string; label: string } | null) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: guests } = useQuery({
    queryKey: ['guests-picker', search],
    queryFn: async () => (await api.get<Guest[]>('/guests', { params: { search } })).data,
    enabled: open && search.length > 0,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <span>{value.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(null);
          }}
          className="text-xs text-brand-600 hover:underline"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className={inputClass}
        placeholder="Buscar huésped por nombre o documento..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && search.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {guests?.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Sin resultados. Creá el huésped primero desde la sección Huéspedes.</p>}
          {guests?.map((g) => (
            <button
              key={g.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={(e) => {
                // Sin stopPropagation, el click burbujea hasta el <label> de FormField, que
                // reenvía un click implícito al input de búsqueda y pisa esta selección.
                e.preventDefault();
                e.stopPropagation();
                onChange({ id: g.id, label: `${g.lastName}, ${g.firstName} (${g.documentNumber})` });
                setOpen(false);
              }}
            >
              {g.lastName}, {g.firstName} · {g.documentType} {g.documentNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AuditLogEntry } from '../lib/types';
import { Card } from '../components/ui/Card';
import { inputClass } from '../components/ui/FormField';
import { formatDateTime } from '../lib/format';

const ENTITY_TYPES = ['Reservation', 'Payment', 'Room', 'CashSession', 'CashMovement', 'HousekeepingTask', 'MaintenanceTask', 'Consumption'];

export function AuditLogPage() {
  const [entityType, setEntityType] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType],
    queryFn: async () => (await api.get<AuditLogEntry[]>('/audit-logs', { params: entityType ? { entityType } : {} })).data,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Auditoría</h1>
        <p className="text-sm text-slate-500">Registro de acciones relevantes realizadas en el sistema (últimas 200).</p>
      </div>

      <select className={inputClass + ' max-w-xs'} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        <option value="">Todos los tipos</option>
        {ENTITY_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <Card>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-400">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">Entidad</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2 text-slate-700">{log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-800">{log.action}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {log.entityType} <span className="text-slate-300">·</span> {log.entityId.slice(0, 8)}
                  </td>
                </tr>
              ))}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No hay registros de auditoría para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

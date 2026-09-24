import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  permission?: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
      { to: '/calendar', label: 'Calendario', permission: 'reservations.view' },
      { to: '/reservations', label: 'Reservas', permission: 'reservations.view' },
      { to: '/guests', label: 'Huéspedes', permission: 'guests.view' },
      { to: '/rooms', label: 'Habitaciones', permission: 'rooms.view' },
      { to: '/housekeeping', label: 'Housekeeping', permission: 'housekeeping.view' },
      { to: '/maintenance', label: 'Mantenimiento', permission: 'maintenance.view' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/room-types', label: 'Tipos de habitación', permission: 'roomtypes.view' },
      { to: '/rates', label: 'Tarifas', permission: 'rates.manage' },
      { to: '/services', label: 'Servicios', permission: 'services.view' },
      { to: '/channels', label: 'Canales de venta', permission: 'channels.view' },
      { to: '/cash', label: 'Caja', permission: 'cash.view' },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hasPermission, user } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">HA</div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">{user?.hotel.name ?? 'Hotel PMS'}</p>
            <p className="text-xs text-slate-400">Gestión hotelera</p>
          </div>
        </div>
        <nav className="space-y-6 px-3 py-4">
          {GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.permission || hasPermission(i.permission));
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

import { useAuth } from '../../auth/AuthContext';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onMenuClick} aria-label="Abrir menú">
        ☰
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-slate-400">{user?.roleName}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </div>
        <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Salir
        </button>
      </div>
    </header>
  );
}

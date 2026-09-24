import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { inputClass } from '../components/ui/FormField';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('recepcion@hotellosalerces.com');
  const [password, setPassword] = useState('Demo1234!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos iniciar sesión. Verificá tus credenciales.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">HA</div>
          <h1 className="text-xl font-semibold text-slate-900">Hotel Los Alerces</h1>
          <p className="text-sm text-slate-500">Sistema de gestión hotelera</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Contraseña</span>
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Usuarios de prueba: admin / gerente / recepcion / housekeeping / mantenimiento @hotellosalerces.com · clave Demo1234!
        </p>
      </div>
    </div>
  );
}

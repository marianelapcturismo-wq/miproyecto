import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, clearStoredAuth, loadStoredAuth, saveStoredAuth } from '../lib/api';
import { AuthUser } from '../lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (...codes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    saveStoredAuth({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    setUser(res.data.user);
  }

  function logout() {
    clearStoredAuth();
    setUser(null);
    window.location.href = '/login';
  }

  function hasPermission(...codes: string[]) {
    if (!user) return false;
    return codes.some((c) => user.permissions.includes(c));
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

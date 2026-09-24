import axios from 'axios';

const STORAGE_KEY = 'hotel_pms_auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) return 'http://localhost:3001/api';
  // Permite pasar solo el host (ej. desde Render Blueprints, donde no se conoce
  // el subdominio final de antemano) además de una URL completa.
  return raw.includes('://') ? raw : `https://${raw}/api`;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const auth = loadStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const auth = loadStoredAuth();
      if (!auth?.refreshToken) {
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: auth.refreshToken })
            .then((res) => {
              saveStoredAuth({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
              return res.data.accessToken as string;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

import { useSessionStore } from '@/stores/session';

const BASE = '/api';

export type ApiError = { error: string; details?: unknown };

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const session = useSessionStore.getState().session;
  const headers: Record<string, string> = {};
  if (init.body !== undefined && init.body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  if (session) headers['Authorization'] = `Bearer ${session.token}`;
  if (init.headers) Object.assign(headers, init.headers as Record<string, string>);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    useSessionStore.getState().logout();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw data as ApiError;
  return data as T;
};

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

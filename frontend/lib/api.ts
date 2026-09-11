export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    if (process.env.INTERNAL_API_URL) {
      return process.env.INTERNAL_API_URL.replace(/\/$/, '');
    }
    if (process.env.NEXT_PUBLIC_API_URL && /^https?:\/\//i.test(process.env.NEXT_PUBLIC_API_URL)) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    }
    const port = process.env.PORT || 4000;
    return `http://127.0.0.1:${port}/api`;
  }

  // In the browser, route through relative '/api' so all requests stay on the single origin
  return (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

export const ACCESS_TOKEN_KEY = 'first-faith-access-token';

export function getAccessToken() {
  return typeof window === 'undefined' ? undefined : window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
}

export function setAccessToken(accessToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

// Thin fetch wrapper. Server components can call this directly for SSR;
// client components should go through services/ for typed helpers.
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken = getAccessToken(), ...init } = options;

  const { next, ...restInit } = init;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}${normalizedPath}`, {
    ...restInit,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...restInit.headers,
    },
    next: { revalidate: 60, ...(next ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

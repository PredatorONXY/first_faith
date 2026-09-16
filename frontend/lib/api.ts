export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    if (process.env.INTERNAL_API_URL) {
      return process.env.INTERNAL_API_URL.replace(/\/$/, '');
    }
    if (process.env.NEXT_PUBLIC_API_URL && /^https?:\/\//i.test(process.env.NEXT_PUBLIC_API_URL)) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api`;
    }
    const port = process.env.PORT || 3000;
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

/**
 * Safely extracts a human-readable error message from an unknown error payload.
 * Never returns "[object Object]".
 */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed && trimmed !== '[object Object]') return trimmed;
    return fallback;
  }

  if (Array.isArray(error)) {
    const parts = error
      .map((item) => (typeof item === 'string' ? item.trim() : extractErrorMessage(item, '')))
      .filter((s) => Boolean(s) && s !== '[object Object]');
    return parts.length > 0 ? parts.join(', ') : fallback;
  }

  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // Handle nested message
    if (obj.message !== undefined && obj.message !== null) {
      const msg = extractErrorMessage(obj.message, '');
      if (msg && msg !== '[object Object]') return msg;
    }

    // Handle validation errors array
    if (Array.isArray(obj.errors)) {
      const msg = extractErrorMessage(obj.errors, '');
      if (msg && msg !== '[object Object]') return msg;
    }

    // Handle error field
    if (typeof obj.error === 'string') {
      const errStr = obj.error.trim();
      if (errStr && errStr !== '[object Object]') return errStr;
    }

    // Handle standard Error instance
    if (error instanceof Error) {
      const msg = error.message.trim();
      if (msg && msg !== '[object Object]') return msg;
    }
  }

  return fallback;
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
    if (res.status === 401 && accessToken && typeof window !== 'undefined') {
      clearAccessToken();
      window.dispatchEvent(new Event('ff:auth-changed'));
    }
    const body = await res.json().catch(() => ({}));
    const message = extractErrorMessage(body, `Request failed: ${res.status}`);
    throw new Error(message);
  }

  return res.json();
}

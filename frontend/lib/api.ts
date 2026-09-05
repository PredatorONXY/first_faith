const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    // Public catalog data can be cached; callers can override per-request.
    next: { revalidate: 60, ...(init as any).next },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

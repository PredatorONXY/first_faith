'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAccessToken } from '../../lib/api';

type Profile = { role: string };

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login?next=/admin');
      return;
    }

    let active = true;
    apiFetch<Profile>('/auth/me', { cache: 'no-store' })
      .then((profile) => {
        if (!active) return;
        if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') {
          setAllowed(true);
        } else {
          router.replace('/account');
        }
      })
      .catch(() => router.replace('/login?next=/admin'));

    return () => { active = false; };
  }, [router]);

  if (!allowed) {
    return <main className="admin-gate"><p>Checking account access…</p></main>;
  }

  return <>{children}</>;
}

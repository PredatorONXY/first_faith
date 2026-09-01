'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message ?? 'Something went wrong. Please try again.');
      return;
    }

    // Mirror the new identity into our own User table (role always
    // defaults to CUSTOMER server-side — see AuthService.syncUser).
    await apiFetch('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ supabaseAuthId: data.user.id, email, fullName }),
    }).catch(() => null);

    setLoading(false);
    router.push('/account');
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-display text-3xl text-charcoal">Create an account</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium text-charcoal">Full name</label>
          <input
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-charcoal">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-charcoal">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-charcoal-soft">
        Already have an account? <Link href="/login" className="text-burgundy hover:text-burgundy-dark">Log in</Link>
      </p>
    </div>
  );
}

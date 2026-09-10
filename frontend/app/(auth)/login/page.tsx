'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, apiFetch, setAccessToken } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import Image from 'next/image';
import ritualImage from '../../../img/IMG-20260831-WA0008.jpg';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(result.accessToken);
      window.dispatchEvent(new Event('ff:auth-changed'));
      router.push('/account');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to log in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-site md:grid-cols-2">
      <div className="auth-image relative min-h-[680px] overflow-hidden">
        <Image src={ritualImage} alt="First Faith skincare ritual" fill priority className="object-cover" sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-sm text-white">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/70">The First Faith ritual</p>
          <p className="mt-3 font-display text-4xl leading-tight">A softer way to care for your skin.</p>
        </div>
      </div>
      <div className="flex items-center px-6 py-16 md:px-16 lg:px-24">
        <div className="w-full max-w-md">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-3 font-display text-5xl leading-none text-charcoal">Return to your ritual.</h1>
          <p className="mt-5 text-sm leading-7 text-charcoal-soft">Sign in to your First Faith account and keep your everyday essentials close.</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-charcoal">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border-0 border-b border-stone bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-charcoal-soft/50 focus:border-burgundy"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-charcoal">Password</label>
          <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border-0 border-b border-stone bg-transparent px-0 py-3 pr-16 text-sm outline-none transition-colors focus:border-burgundy"
          />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-0 top-3 text-[0.62rem] uppercase tracking-[0.14em] text-charcoal-soft hover:text-burgundy">
            {showPassword ? 'Hide' : 'Show'}
          </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <button
          type="button"
          onClick={() => {
            window.location.href = `${API_BASE_URL}/auth/google`;
          }}
          className="w-full rounded-sm border border-charcoal/20 bg-white/20 px-6 py-3 text-[0.68rem] font-semibold tracking-[0.18em] uppercase text-charcoal transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-burgundy hover:text-burgundy"
        >
          Continue with Google
        </button>
      </form>

      <p className="mt-8 text-sm text-charcoal-soft">
        New here? <Link href="/register" className="text-burgundy underline decoration-burgundy/30 underline-offset-4 hover:text-burgundy-dark">Create an account</Link>
      </p>
        </div>
      </div>
    </div>
  );
}

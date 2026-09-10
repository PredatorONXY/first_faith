'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, apiFetch, setAccessToken } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import Image from 'next/image';
import heroImage from '../../../img/IMG-20260831-WA0012.jpg';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
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
      const result = await apiFetch<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });
      setAccessToken(result.accessToken);
      window.dispatchEvent(new Event('ff:auth-changed'));
      router.push('/account');
    } catch (authError) {
      setLoading(false);
      setError(authError instanceof Error ? authError.message : 'Unable to create an account');
      return;
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-site md:grid-cols-2">
      <div className="relative flex items-center px-6 py-16 md:order-2 md:px-16 lg:px-24">
        <div className="w-full max-w-md">
          <p className="eyebrow">Create your account</p>
          <h1 className="mt-3 font-display text-5xl leading-none text-charcoal">Begin your ritual.</h1>
          <p className="mt-5 text-sm leading-7 text-charcoal-soft">Thoughtfully formulated care, made to become part of the everyday.</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium text-charcoal">Full name</label>
          <input
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2 w-full border-0 border-b border-stone bg-transparent px-0 py-3 text-sm outline-none transition-colors focus:border-burgundy"
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
            className="mt-2 w-full border-0 border-b border-stone bg-transparent px-0 py-3 text-sm outline-none transition-colors focus:border-burgundy"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-charcoal">Password</label>
          <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
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
          {loading ? 'Creating account…' : 'Create account'}
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
        Already have an account? <Link href="/login" className="text-burgundy underline decoration-burgundy/30 underline-offset-4 hover:text-burgundy-dark">Sign in</Link>
      </p>
        </div>
      </div>
      <div className="auth-image relative overflow-hidden md:order-1">
        <Image src={heroImage} alt="First Faith skincare collection" fill priority className="object-cover" sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/65 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-sm text-white">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/70">Perfect blend of nature &amp; science</p>
          <p className="mt-3 font-display text-4xl leading-tight">Care that feels like a ceremony.</p>
        </div>
      </div>
    </div>
  );
}

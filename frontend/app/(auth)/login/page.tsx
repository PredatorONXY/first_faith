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
    <div className="site-shell" style={{ padding: '4rem 0 6rem' }}>
      <div className="ritual-layout" style={{ alignItems: 'center' }}>
        <div className="ritual-media-wrap" style={{ minHeight: '520px' }}>
          <Image
            src={ritualImage}
            alt="First Faith skincare ritual"
            fill
            priority
            style={{ objectFit: 'cover' }}
            sizes="(min-width: 768px) 50vw, 100vw"
          />
          <div className="hero-overlay">
            <div>
              <span className="hero-overlay-badge">First Faith</span>
              <p className="hero-overlay-label">A softer way to care</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(32, 28, 27, 0.08)', borderRadius: '20px', padding: '3rem 2.5rem', boxShadow: '0 12px 32px rgba(32, 28, 27, 0.04)', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
          <p className="eyebrow">Welcome back</p>
          <h1 className="display-title" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', marginTop: '0.4rem' }}>
            Return to your ritual.
          </h1>
          <p style={{ marginTop: '0.85rem', fontSize: '0.95rem', color: 'var(--ff-charcoal-soft)', lineHeight: 1.6 }}>
            Sign in to your First Faith account and keep your everyday essentials close.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="password" className="form-label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ff-burgundy)', cursor: 'pointer' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p style={{ color: 'var(--ff-burgundy)', fontSize: '0.85rem', fontWeight: 600 }} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_BASE_URL}/auth/google`;
              }}
              className="btn btn-outline btn-block"
            >
              Continue with Google
            </button>
          </form>

          <p style={{ marginTop: '2rem', fontSize: '0.88rem', color: 'var(--ff-charcoal-soft)', textAlign: 'center' }}>
            New here?{' '}
            <Link href="/register" style={{ color: 'var(--ff-burgundy)', fontWeight: 600, textDecoration: 'underline' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

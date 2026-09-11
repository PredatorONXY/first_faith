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
    <div className="site-shell" style={{ padding: '4rem 0 6rem' }}>
      <div className="ritual-layout" style={{ alignItems: 'center' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(32, 28, 27, 0.08)', borderRadius: '20px', padding: '3rem 2.5rem', boxShadow: '0 12px 32px rgba(32, 28, 27, 0.04)', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
          <p className="eyebrow">Create your account</p>
          <h1 className="display-title" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', marginTop: '0.4rem' }}>
            Begin your ritual.
          </h1>
          <p style={{ marginTop: '0.85rem', fontSize: '0.95rem', color: 'var(--ff-charcoal-soft)', lineHeight: 1.6 }}>
            Thoughtfully formulated care, made to become part of your everyday routine.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="fullName" className="form-label">Full name</label>
              <input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                placeholder="First and last name"
              />
            </div>

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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p style={{ color: 'var(--ff-burgundy)', fontSize: '0.85rem', fontWeight: 600 }} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="btn-block" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
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
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--ff-burgundy)', fontWeight: 600, textDecoration: 'underline' }}>
              Sign in
            </Link>
          </p>
        </div>

        <div className="ritual-media-wrap" style={{ minHeight: '520px' }}>
          <Image
            src={heroImage}
            alt="First Faith skincare collection"
            fill
            priority
            style={{ objectFit: 'cover' }}
            sizes="(min-width: 768px) 50vw, 100vw"
          />
          <div className="hero-overlay">
            <div>
              <span className="hero-overlay-badge">First Faith</span>
              <p className="hero-overlay-label">Mindfully formulated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

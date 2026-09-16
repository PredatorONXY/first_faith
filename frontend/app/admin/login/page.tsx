'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, setAccessToken, clearAccessToken, extractErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

type AdminLoginResponse = {
  accessToken: string;
  user: { id: string; email: string; role: string };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your administrator username or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loginRes = await apiFetch<AdminLoginResponse>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanIdentifier, password }),
      });

      if (loginRes.user && loginRes.user.role !== 'ADMIN' && loginRes.user.role !== 'SUPER_ADMIN') {
        clearAccessToken();
        setError('Access denied: This account does not possess administrative privileges.');
        return;
      }

      setAccessToken(loginRes.accessToken);
      window.dispatchEvent(new Event('ff:auth-changed'));
      router.push('/admin');
    } catch (err: unknown) {
      clearAccessToken();
      setError(extractErrorMessage(err, 'Unable to sign in as administrator'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site-shell" style={{ padding: 'clamp(3rem, 6vw, 6rem) 0 clamp(4rem, 8vw, 8rem)' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(32, 28, 27, 0.1)',
        borderRadius: '20px',
        padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 5vw, 3rem)',
        boxShadow: '0 16px 40px rgba(32, 28, 27, 0.05)',
        maxWidth: '460px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <p className="eyebrow" style={{ color: 'var(--ff-burgundy)' }}>Administration</p>
        <h1 className="font-display text-4xl text-charcoal" style={{ marginTop: '0.5rem' }}>
          Store Access
        </h1>
        <p style={{ marginTop: '0.75rem', fontSize: '0.92rem', color: 'var(--ff-charcoal-soft)', lineHeight: 1.6 }}>
          Sign in with your administrator credentials to manage catalog, orders, and reviews.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="identifier" className="form-label">Username or Email</label>
            <input
              id="identifier"
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="form-input"
              placeholder="admin "
            />
          </div>

          <div className="form-group" style={{ margin: 0, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="password" className="form-label" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--ff-burgundy)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
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
            <div style={{
              background: '#fdf2f2',
              border: '1px solid #f8b4b4',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: 'var(--ff-burgundy)',
              fontSize: '0.85rem',
              fontWeight: 500,
            }} role="alert">
              {error}
            </div>
          )}

          <Button type="submit" className="btn-block" disabled={loading} style={{ minHeight: '48px', marginTop: '0.5rem' }}>
            {loading ? 'Authenticating…' : 'Sign in to Admin'}
          </Button>
        </form>

        <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(32, 28, 27, 0.08)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)', textDecoration: 'underline' }}>
            ← Return to First Faith store
          </Link>
        </div>
      </div>
    </main>
  );
}

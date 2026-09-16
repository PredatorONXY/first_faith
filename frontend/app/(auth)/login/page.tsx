'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, apiFetch, clearAccessToken, extractErrorMessage, setAccessToken } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get('verified') === 'true') {
      clearAccessToken();
      window.dispatchEvent(new Event('ff:auth-changed'));
      setSuccessMessage('Your email address has been verified successfully. Please sign in.');
    } else if (searchParams?.get('registered') === 'true') {
      clearAccessToken();
      window.dispatchEvent(new Event('ff:auth-changed'));
      setSuccessMessage(searchParams.get('message') || 'Account created successfully. Please verify your email before logging in.');
    } else if (searchParams?.get('message')) {
      setSuccessMessage(searchParams.get('message'));
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setUnverifiedEmail(null);
    setResendStatus(null);

    try {
      const result = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      setAccessToken(result.accessToken);
      window.dispatchEvent(new Event('ff:auth-changed'));
      router.push('/account');
    } catch (authError) {
      const msg = extractErrorMessage(authError, 'Unable to log in');
      setError(msg);
      if (msg.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(normalizedEmail);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setResendStatus(res.message || 'A new verification link has been sent to your email.');
    } catch (err) {
      setResendStatus(extractErrorMessage(err, 'Failed to resend verification email.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <main
      className="site-shell"
      style={{
        padding: 'clamp(2.5rem, 6vw, 5rem) 1rem clamp(3.5rem, 8vw, 7rem)',
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          border: '1px solid rgba(32, 28, 27, 0.08)',
          borderRadius: '24px',
          padding: 'clamp(2rem, 5vw, 3.25rem) clamp(1.5rem, 5vw, 2.75rem)',
          boxShadow: '0 20px 48px rgba(32, 28, 27, 0.05)',
          maxWidth: '460px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p className="eyebrow">Welcome back</p>
        <h1
          className="display-title"
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            marginTop: '0.4rem',
            lineHeight: 1.15,
          }}
        >
          Return to your ritual.
        </h1>
        <p
          style={{
            marginTop: '0.85rem',
            fontSize: '0.95rem',
            color: 'var(--ff-charcoal-soft)',
            lineHeight: 1.6,
          }}
        >
          Sign in to your First Faith account and keep your everyday essentials close.
        </p>

        {successMessage && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #34d399',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#065f46',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginTop: '1.25rem',
            }}
            role="status"
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="email" className="form-label">
              Email address
            </label>
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <label htmlFor="password" className="form-label" style={{ margin: 0 }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--ff-burgundy)',
                  cursor: 'pointer',
                  padding: '4px 6px',
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
            <div
              style={{
                background: '#fdf2f2',
                border: '1px solid #f8b4b4',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: 'var(--ff-burgundy)',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
              role="alert"
            >
              <p style={{ margin: 0 }}>{error}</p>
              {unverifiedEmail && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(140, 37, 48, 0.2)' }}>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ff-burgundy)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {resending ? 'Sending verification link…' : 'Resend verification email'}
                  </button>
                  {resendStatus && (
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#166534' }}>
                      {resendStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="btn-block" disabled={loading} style={{ minHeight: '48px' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `${API_BASE_URL}/auth/google`;
            }}
            className="btn btn-outline btn-block"
            style={{ minHeight: '48px' }}
          >
            Continue with Google
          </button>
        </form>

        <p
          style={{
            marginTop: '2rem',
            fontSize: '0.88rem',
            color: 'var(--ff-charcoal-soft)',
            textAlign: 'center',
          }}
        >
          New here?{' '}
          <Link
            href="/register"
            style={{
              color: 'var(--ff-burgundy)',
              fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="site-shell" style={{ minHeight: 'calc(100vh - 160px)' }} />}>
      <LoginPageContent />
    </Suspense>
  );
}


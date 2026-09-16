'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, extractErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email address…');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success?: boolean; text?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification link was provided. Please use the link sent to your email.');
      return;
    }

    let active = true;

    async function verify() {
      try {
        const result = await apiFetch<{ success: boolean; message: string }>('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (active) {
          setStatus('success');
          setMessage(result.message || 'Email verified successfully. You can now log in.');
        }
      } catch (err) {
        if (active) {
          setStatus('error');
          setMessage(extractErrorMessage(err, 'This verification link is invalid, expired, or has already been used.'));
        }
      }
    }

    verify();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const emailToResend = resendEmail.trim().toLowerCase();
    if (!emailToResend || !/^\S+@\S+\.\S+$/.test(emailToResend)) {
      setResendStatus({ success: false, text: 'Please enter a valid email address.' });
      return;
    }

    setResending(true);
    setResendStatus(null);

    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: emailToResend }),
      });
      setResendStatus({ success: true, text: res.message || 'A new verification link has been sent to your email.' });
    } catch (err) {
      setResendStatus({ success: false, text: extractErrorMessage(err, 'Unable to resend verification email.') });
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
          maxWidth: '480px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          backdropFilter: 'blur(8px)',
          textAlign: 'center',
        }}
      >
        <p className="eyebrow" style={{ textAlign: 'center' }}>Account verification</p>

        {status === 'loading' && (
          <div style={{ padding: '2rem 0' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                border: '3px solid rgba(74, 21, 33, 0.15)',
                borderTopColor: 'var(--ff-burgundy)',
                borderRadius: '50%',
                margin: '0 auto 1.5rem',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <h1
              className="display-title"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
                marginBottom: '0.75rem',
                lineHeight: 1.2,
              }}
            >
              Confirming your email
            </h1>
            <p style={{ color: 'var(--ff-charcoal-soft)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {message}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ padding: '1rem 0' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(74, 21, 33, 0.08)',
                color: 'var(--ff-burgundy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '24px',
              }}
            >
              ✓
            </div>
            <h1
              className="display-title"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
                marginBottom: '0.75rem',
                lineHeight: 1.2,
              }}
            >
              Email verified.
            </h1>
            <p style={{ color: 'var(--ff-charcoal-soft)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your First Faith account has been activated. You can now sign in to begin your skincare ritual.
            </p>

            <Button href="/login?verified=true" style={{ width: '100%' }}>
              Log in to your account
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '1rem 0', textAlign: 'left' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#fff4f4',
                color: '#8c2530',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '22px',
                fontWeight: 'bold',
              }}
            >
              !
            </div>
            <h1
              className="display-title"
              style={{
                fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)',
                marginBottom: '0.75rem',
                lineHeight: 1.2,
                textAlign: 'center',
              }}
            >
              Verification link expired
            </h1>
            <p
              style={{
                color: 'var(--ff-charcoal-soft)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              {message}
            </p>

            <div
              style={{
                borderTop: '1px solid rgba(32, 28, 27, 0.08)',
                paddingTop: '1.5rem',
                marginTop: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--ff-charcoal)' }}>
                Need a new verification link?
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)', marginBottom: '1rem' }}>
                Enter your email address below and we will send you an updated link valid for 30 minutes.
              </p>

              <form onSubmit={handleResend} style={{ display: 'grid', gap: '0.75rem' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
                <Button type="submit" disabled={resending} style={{ width: '100%' }}>
                  {resending ? 'Sending…' : 'Resend verification email'}
                </Button>
              </form>

              {resendStatus && (
                <div
                  style={{
                    marginTop: '0.85rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    backgroundColor: resendStatus.success ? '#f0fdf4' : '#fff4f4',
                    color: resendStatus.success ? '#166534' : '#8c2530',
                    border: `1px solid ${resendStatus.success ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {resendStatus.text}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link
                  href="/login"
                  style={{
                    color: 'var(--ff-burgundy)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  ← Back to login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="site-shell" style={{ padding: '6rem 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--ff-charcoal-soft)' }}>Loading verification…</p>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

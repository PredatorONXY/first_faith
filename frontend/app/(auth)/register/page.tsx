'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL, apiFetch, clearAccessToken, extractErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success?: boolean; text?: string } | null>(null);

  useEffect(() => {
    clearAccessToken();
    window.dispatchEvent(new Event('ff:auth-changed'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Use 8–72 characters with at least one letter and one number.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      clearAccessToken();
      window.dispatchEvent(new Event('ff:auth-changed'));

      await apiFetch<{ success: boolean; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password, fullName: fullName.trim() }),
      });

      setSubmittedEmail(normalizedEmail);
    } catch (authError) {
      setError(extractErrorMessage(authError, 'Unable to create an account'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!submittedEmail) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: submittedEmail }),
      });
      setResendStatus({ success: true, text: res.message || 'A new verification link has been sent.' });
    } catch (resendErr) {
      setResendStatus({ success: false, text: extractErrorMessage(resendErr, 'Unable to resend email.') });
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
        {submittedEmail ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <p className="eyebrow">Account created</p>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(74, 21, 33, 0.08)',
                color: 'var(--ff-burgundy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '1.25rem auto 1.5rem',
                fontSize: '26px',
              }}
            >
              ✉
            </div>
            <h1
              className="display-title"
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.6rem)',
                marginBottom: '0.75rem',
                lineHeight: 1.15,
              }}
            >
              Check your email.
            </h1>
            <p
              style={{
                fontSize: '0.96rem',
                color: 'var(--ff-charcoal)',
                lineHeight: 1.6,
                marginBottom: '0.5rem',
              }}
            >
              We have sent a verification link to:
            </p>
            <p
              style={{
                fontWeight: 600,
                color: 'var(--ff-burgundy)',
                fontSize: '1.05rem',
                marginBottom: '1.5rem',
                wordBreak: 'break-all',
              }}
            >
              {submittedEmail}
            </p>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--ff-charcoal-soft)',
                lineHeight: 1.65,
                marginBottom: '2rem',
              }}
            >
              Please open the link within <strong>30 minutes</strong> to activate your account. If you don&apos;t see the email, check your spam or promotions tab.
            </p>

            <Button href="/login?registered=true" style={{ width: '100%', minHeight: '48px', marginBottom: '1rem' }}>
              Proceed to sign in
            </Button>

            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ff-burgundy)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {resending ? 'Sending…' : 'Didn’t receive it? Resend verification email'}
              </button>
            </div>

            {resendStatus && (
              <div
                style={{
                  marginTop: '1rem',
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
          </div>
        ) : (
          <>
            <p className="eyebrow">Create your account</p>
            <h1
              className="display-title"
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                marginTop: '0.4rem',
                lineHeight: 1.15,
              }}
            >
              Begin your ritual.
            </h1>
            <p
              style={{
                marginTop: '0.85rem',
                fontSize: '0.95rem',
                color: 'var(--ff-charcoal-soft)',
                lineHeight: 1.6,
              }}
            >
              Thoughtfully formulated care, made to become part of your everyday routine.
            </p>

            <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="fullName" className="form-label">
                  Full name
                </label>
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
                  placeholder="name@example.com"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="At least 8 characters with a letter & number"
                    style={{ paddingRight: '4.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--ff-charcoal-soft)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(124, 40, 54, 0.08)',
                    border: '1px solid rgba(124, 40, 54, 0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: 'var(--ff-burgundy)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button type="submit" className="btn-block" disabled={loading} style={{ minHeight: '48px' }}>
                {loading ? 'Creating account…' : 'Create account'}
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
              Already have an account?{' '}
              <Link
                href="/login"
                style={{
                  color: 'var(--ff-burgundy)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

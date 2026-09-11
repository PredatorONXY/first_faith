'use client';

import { useEffect, useState } from 'react';
import { getSiteSettings, type SiteSettings } from '../../../services/settings';
import { Button } from '../../../components/ui/Button';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [settings, setSettings] = useState<Partial<SiteSettings>>({});

  useEffect(() => {
    getSiteSettings().then(setSettings).catch(() => undefined);
  }, []);

  return (
    <div className="site-shell" style={{ padding: '4.5rem 0 6rem' }}>
      <div className="ritual-layout" style={{ alignItems: 'start' }}>
        <div>
          <p className="eyebrow">We are here to help</p>
          <h1 className="display-title" style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.5rem)' }}>
            Let&apos;s talk.
          </h1>
          <p style={{ marginTop: '1.25rem', maxWidth: '28rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.75 }}>
            Questions about your ritual, a formulation, or an order? Send us a note and we&apos;ll be in touch.
          </p>

          <div style={{ marginTop: '2.5rem', display: 'grid', gap: '0.85rem', fontSize: '0.95rem', color: 'var(--ff-charcoal-soft)' }}>
            {settings.contact_email && (
              <p>
                Email:{' '}
                <a href={`mailto:${settings.contact_email}`} style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                  {settings.contact_email}
                </a>
              </p>
            )}
            {settings.contact_phone && <p>Phone: {settings.contact_phone}</p>}
            {settings.contact_address && <p>Location: {settings.contact_address}</p>}
            {settings.instagram_url && (
              <p>
                Social:{' '}
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                  Instagram
                </a>
              </p>
            )}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(32, 28, 27, 0.08)', borderRadius: '20px', padding: '2.5rem 2rem', boxShadow: '0 12px 32px rgba(32, 28, 27, 0.04)' }}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <div className="form-group">
              <label htmlFor="name" className="form-label">Name</label>
              <input id="name" name="name" required className="form-input" placeholder="Your full name" />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input id="email" name="email" type="email" required className="form-input" placeholder="your@email.com" />
            </div>

            <div className="form-group">
              <label htmlFor="message" className="form-label">Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="How can we help with your skincare ritual?"
              />
            </div>

            {sent && (
              <p style={{ marginBottom: '1.25rem', fontSize: '0.88rem', color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                Thank you. Your message has been prepared and our team will get back to you shortly.
              </p>
            )}

            <Button type="submit">Send message</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

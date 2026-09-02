import type { Metadata } from 'next';
import { getSiteSettings, type SiteSettings } from '../../../services/settings';

export const metadata: Metadata = {
  title: 'Contact',
};

export default async function ContactPage() {
  const settings: Partial<SiteSettings> = await getSiteSettings().catch(() => ({}));

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:px-10">
      <h1 className="font-display text-3xl text-charcoal md:text-4xl">Contact</h1>
      <p className="mt-2 text-charcoal-soft">We'd love to hear from you.</p>

      <div className="mt-10 space-y-2 text-charcoal-soft">
        {settings.contact_email ? (
          <p>
            Email:{' '}
            <a href={`mailto:${settings.contact_email}`} className="text-burgundy hover:text-burgundy-dark">
              {settings.contact_email}
            </a>
          </p>
        ) : (
          <p className="text-sm italic">Contact email not yet configured — add it in Admin → Settings.</p>
        )}
        {settings.contact_phone && <p>Phone: {settings.contact_phone}</p>}
        {settings.contact_address && <p>{settings.contact_address}</p>}
      </div>

      {/* Wired to a real submission endpoint in a later phase */}
      <form className="mt-12 space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-charcoal">Name</label>
          <input id="name" name="name" required className="mt-1 w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm" />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-charcoal">Email</label>
          <input id="email" name="email" type="email" required className="mt-1 w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm" />
        </div>
        <div>
          <label htmlFor="message" className="text-sm font-medium text-charcoal">Message</label>
          <textarea id="message" name="message" required rows={4} className="mt-1 w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm" />
        </div>
        <button type="submit" className="rounded-sm bg-burgundy px-6 py-3 text-sm font-medium text-white hover:bg-burgundy-dark">
          Send message
        </button>
      </form>
    </div>
  );
}

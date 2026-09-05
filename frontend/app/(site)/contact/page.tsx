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

  return <div className="site-shell grid gap-12 px-6 py-16 md:grid-cols-[0.8fr_1.2fr] md:px-10 md:py-24"><div><p className="eyebrow">We are here to help</p><h1 className="mt-4 font-display text-6xl leading-[0.9] text-charcoal md:text-8xl">Let&apos;s talk.</h1><p className="mt-8 max-w-sm leading-8 text-charcoal-soft">Questions about your ritual, a formulation, or an order? Send us a note and we&apos;ll be in touch.</p><div className="mt-12 space-y-3 text-sm text-charcoal-soft">{settings.contact_email && <a href={`mailto:${settings.contact_email}`} className="block text-burgundy hover:text-burgundy-dark">{settings.contact_email}</a>}{settings.contact_phone && <p>{settings.contact_phone}</p>}{settings.contact_address && <p>{settings.contact_address}</p>}{settings.instagram_url && <a href={settings.instagram_url} className="block text-burgundy">Instagram</a>}</div></div><div className="border-t border-stone pt-8 md:pt-0"><form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="space-y-7 md:pl-12"><div><label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">Name</label><input id="name" name="name" required className="mt-3 w-full border-0 border-b border-stone bg-transparent px-0 py-3 outline-none focus:border-burgundy" /></div><div><label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">Email</label><input id="email" name="email" type="email" required className="mt-3 w-full border-0 border-b border-stone bg-transparent px-0 py-3 outline-none focus:border-burgundy" /></div><div><label htmlFor="message" className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">Message</label><textarea id="message" name="message" required rows={5} className="mt-3 w-full resize-none border-0 border-b border-stone bg-transparent px-0 py-3 outline-none focus:border-burgundy" /></div>{sent && <p className="text-sm text-burgundy">Thank you. Your message is ready to be sent.</p>}<Button type="submit">Send message</Button></form></div></div>;
}

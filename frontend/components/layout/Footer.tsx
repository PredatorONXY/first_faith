import Link from 'next/link';

// Contact details and social links come from the backend /settings endpoint
// (admin-editable). This component renders whatever is configured and
// simply omits a row if the client hasn't supplied it yet.
type FooterSettings = {
  contact_email?: string;
  contact_phone?: string;
  instagram_url?: string;
  facebook_url?: string;
};

export function Footer({ settings = {} }: { settings?: FooterSettings }) {
  return (
    <footer className="border-t border-charcoal/10 bg-charcoal text-white">
      <div className="mx-auto grid max-w-site gap-12 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-10 md:py-20">
        <div>
          <p className="font-display text-3xl text-white">First Faith</p>
          <p className="mt-3 max-w-xs text-sm leading-7 text-white/60">Perfect Blend of Nature &amp; Science</p>
          <p className="mt-10 text-[0.65rem] uppercase tracking-[0.2em] text-white/40">Beyond just skincare.</p>
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/45">Shop</p>
          <ul className="mt-5 space-y-3 text-sm text-white/70">
            <li><Link href="/shop" className="transition-colors hover:text-white">All products</Link></li>
            <li><Link href="/ingredients" className="transition-colors hover:text-white">Ingredients</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/45">Company</p>
          <ul className="mt-5 space-y-3 text-sm text-white/70">
            <li><Link href="/about" className="transition-colors hover:text-white">About</Link></li>
            <li><Link href="/contact" className="transition-colors hover:text-white">Contact</Link></li>
            <li><Link href="/account" className="transition-colors hover:text-white">Account</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/45">Get in touch</p>
          <ul className="mt-5 space-y-3 text-sm text-white/70">
            {settings.contact_email && (
              <li><a href={`mailto:${settings.contact_email}`} className="hover:text-white">{settings.contact_email}</a></li>
            )}
            {settings.contact_phone && <li>{settings.contact_phone}</li>}
            {settings.instagram_url && (
              <li><a href={settings.instagram_url} className="hover:text-white">Instagram</a></li>
            )}
            {settings.facebook_url && (
              <li><a href={settings.facebook_url} className="hover:text-white">Facebook</a></li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/40 md:px-10">
        © {new Date().getFullYear()} First Faith. Beyond Just Skincare.
      </div>
    </footer>
  );
}

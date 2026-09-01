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
    <footer className="border-t border-stone bg-blush">
      <div className="mx-auto grid max-w-site gap-10 px-6 py-16 md:grid-cols-4 md:px-10">
        <div>
          <p className="font-display text-xl text-charcoal">First Faith</p>
          <p className="mt-2 text-sm text-charcoal-soft">Perfect Blend of Nature &amp; Science</p>
        </div>

        <div>
          <p className="text-sm font-medium text-charcoal">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-soft">
            <li><Link href="/shop" className="hover:text-burgundy">All products</Link></li>
            <li><Link href="/ingredients" className="hover:text-burgundy">Ingredients</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-charcoal">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-soft">
            <li><Link href="/about" className="hover:text-burgundy">About</Link></li>
            <li><Link href="/contact" className="hover:text-burgundy">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-charcoal">Get in touch</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-soft">
            {settings.contact_email && (
              <li><a href={`mailto:${settings.contact_email}`} className="hover:text-burgundy">{settings.contact_email}</a></li>
            )}
            {settings.contact_phone && <li>{settings.contact_phone}</li>}
            {settings.instagram_url && (
              <li><a href={settings.instagram_url} className="hover:text-burgundy">Instagram</a></li>
            )}
            {settings.facebook_url && (
              <li><a href={settings.facebook_url} className="hover:text-burgundy">Facebook</a></li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone px-6 py-6 text-center text-xs text-charcoal-soft md:px-10">
        © {new Date().getFullYear()} First Faith. Beyond Just Skincare.
      </div>
    </footer>
  );
}

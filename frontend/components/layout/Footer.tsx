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
    <footer className="site-footer">
      <div className="site-shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <p>First Faith</p>
            <p>Perfect Blend of Nature &amp; Science</p>
            <p style={{ marginTop: '2rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--ff-burgundy)' }}>
              Beyond just skincare.
            </p>
          </div>

          <div>
            <p className="footer-col-title">Shop</p>
            <ul className="footer-links">
              <li><Link href="/shop">All products</Link></li>
              <li><Link href="/ingredients">Ingredients</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer-col-title">Company</p>
            <ul className="footer-links">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/account">Account</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer-col-title">Get in touch</p>
            <ul className="footer-links">
              {settings.contact_email && (
                <li><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></li>
              )}
              {settings.contact_phone && <li><span>{settings.contact_phone}</span></li>}
              {settings.instagram_url && (
                <li><a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a></li>
              )}
              {settings.facebook_url && (
                <li><a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a></li>
              )}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} First Faith. Beyond Just Skincare. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

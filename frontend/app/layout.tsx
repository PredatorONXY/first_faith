import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { getSiteSettings } from '../services/settings';

const displayFont = Fraunces({
  subsets: ['latin'],
  variable: '--ff-font-display',
  weight: ['400', '500', '600'],
});

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--ff-font-body',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'First Faith — Perfect Blend of Nature & Science',
    template: '%s · First Faith',
  },
  description:
    'First Faith combines botanical ingredients with purposeful cosmetic actives for a modern skincare experience.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetched here so the footer's contact/social info stays admin-editable
  // without a redeploy. Falls back to an empty object if the backend isn't
  // reachable yet during early setup.
  const settings = await getSiteSettings().catch(() => ({}));

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}

import './globals.css';
import type { Viewport } from 'next';
import { SiteFooter } from '@/components/site-footer';

export const metadata = {
  title: 'Railway Concession',
  description: 'Your home → Thane railway concession form, signed and ready in one visit.',
  metadataBase: new URL('https://concession.focuzdrvn.tech'),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Railway Concession',
    description: 'Pick a slot. Walk in. Walk out with a signed form.',
    images: ['/opengraph.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Railway Concession',
    description: 'Pick a slot. Walk in. Walk out with a signed form.',
    images: ['/opengraph.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#fafaf9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-enter">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

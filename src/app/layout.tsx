import './globals.css';
import type { Viewport } from 'next';
import { SiteFooter } from '@/components/site-footer';

export const metadata = { title: 'Concession' };

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

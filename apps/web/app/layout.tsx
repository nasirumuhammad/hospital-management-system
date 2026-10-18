import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import './globals.css';

const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap';

export const metadata: Metadata = { title: 'CarePoint | Hospital Management', description: 'Hospital management dashboard' };
export const viewport: Viewport = { themeColor: '#0b6b4d' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_STYLESHEET} />
      </head>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}

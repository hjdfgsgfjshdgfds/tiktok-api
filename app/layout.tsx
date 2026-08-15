import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/app/globals.css';
import '@/app/styles/globals-part-2.css';
import '@/app/styles/globals-part-3.css';
import '@/app/styles/globals-part-4.css';

export const metadata: Metadata = {
  title: {
    default: 'Aweme Lens — TikTok target inspector',
    template: '%s · Aweme Lens'
  },
  description:
    'A provenance-first TikTok profile and post inspector with exact-target validation and a safe mock mode.',
  applicationName: 'Aweme Lens',
  icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
  themeColor: '#05070b'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';

import { geistFontVariables } from '@/lib/fonts/geist';
import { Providers } from '@/providers';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OneOhm EPC',
    template: '%s | OneOhm EPC',
  },
  description: 'OneOhm Solar EPC Management Platform',
  keywords: ['solar', 'EPC', 'energy', 'management', 'CRM'],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return (
    <html lang="en" className={geistFontVariables}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Providers mapsApiKey={mapsApiKey}>{children}</Providers>
      </body>
    </html>
  );
}

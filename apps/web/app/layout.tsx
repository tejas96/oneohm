import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OneOhm EPC',
  description: 'OneOhm EPC Application',
};

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

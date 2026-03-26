import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RuneBolt — Instant DOG Transfers',
  description:
    'Lock your DOG•GO•TO•THE•MOON in payment channels. Transfer instantly. Settle on Bitcoin.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900 font-sans text-white">{children}</body>
    </html>
  );
}

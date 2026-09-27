import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mazen Zanina • Cosmic CRM',
  description: 'Private client CRM, daily astronomical sky notes and an opt-in free reading offer for Tarot Tunisia.',
  icons: { icon: '/img/logo-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

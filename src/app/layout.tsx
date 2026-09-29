import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tarot TN • Cosmic CRM',
  description: 'Private client CRM, daily astronomical sky notes and an opt-in free reading offer for Tarot TN.',
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

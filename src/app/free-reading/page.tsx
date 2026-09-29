import type { Metadata } from 'next';
import { Signup } from '@/components/Signup';
import { cloudReady } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your free daily sky note • Tarot TN',
  description: 'An opt-in daily note with today’s real planetary positions and Moon phase, sent personally over WhatsApp.',
};

export default function FreeReadingPage() {
  const configured = cloudReady();
  return <Signup configured={configured} demo={!configured && process.env.NODE_ENV !== 'production'} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''} />;
}

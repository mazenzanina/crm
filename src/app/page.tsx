import { AdminApp } from '@/components/AdminApp';
import { cloudReady } from '@/lib/server';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const configured = cloudReady();
  return <AdminApp configured={configured} demo={!configured && process.env.NODE_ENV !== 'production'} />;
}

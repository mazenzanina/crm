'use client';
import { useEffect, useState } from 'react';
import type { SkySnapshot } from './types';

export function useSky(): { sky: SkySnapshot | null; error: string } {
  const [sky, setSky] = useState<SkySnapshot | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/sky', { cache: 'no-store' });
        if (!response.ok) throw new Error('The sky could not be loaded.');
        const data = await response.json() as SkySnapshot;
        if (mounted) { setSky(data); setError(''); }
      } catch {
        if (mounted) setError('Sky data is unavailable. Try reloading this page.');
      }
    };
    void refresh();
    // Both browser tabs and serverless deployments roll over to the new Tunis date without a cron job.
    const interval = window.setInterval(refresh, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return { sky, error };
}

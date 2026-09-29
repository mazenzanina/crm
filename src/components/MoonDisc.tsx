'use client';
import { useId } from 'react';
import type { SkySnapshot } from '@/lib/types';

/** A real illuminated lunar disc: the bright part follows today's calculated illuminated fraction. */
export function MoonDisc({ sky, size = 70 }: { sky: SkySnapshot | null; size?: number }) {
  const rawId = useId().replace(/:/g, '');
  const fraction = Math.min(1, Math.max(0, (sky?.moon.illumination ?? 29) / 100));
  const waxing = sky?.moon.waxing ?? true;
  const radius = 44;
  const point = (y: number, edge: 'outer' | 'terminator') => {
    const x = Math.sqrt(Math.max(0, radius * radius - y * y));
    const side = waxing ? 1 : -1;
    const amount = edge === 'outer' ? 1 : 1 - 2 * fraction;
    return `${(50 + side * amount * x).toFixed(2)} ${(50 + y).toFixed(2)}`;
  };
  const count = 44;
  const outer = Array.from({ length: count + 1 }, (_, i) => point(-radius + (2 * radius * i) / count, 'outer'));
  const terminator = Array.from({ length: count + 1 }, (_, i) => point(radius - (2 * radius * i) / count, 'terminator'));
  const path = `M ${outer.join(' L ')} L ${terminator.join(' L ')} Z`;
  return <svg className="moon-disc" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={sky ? `${sky.moon.phase}, ${sky.moon.illumination}% illuminated` : 'Moon'}>
    <defs><radialGradient id={rawId} cx="30%" cy="25%" r="80%"><stop offset="0%" stopColor="#fffdf6" /><stop offset="58%" stopColor="#efdddf" /><stop offset="100%" stopColor="#ac9cc0" /></radialGradient></defs>
    <circle cx="50" cy="50" r="44" fill="#281e39" stroke="#caa6d5" strokeOpacity=".55" strokeWidth=".7" />
    <path d={path} fill={`url(#${rawId})`} />
    <circle cx="50" cy="50" r="44" fill="none" stroke="#e5cbe8" strokeOpacity=".35" strokeWidth=".65" />
  </svg>;
}

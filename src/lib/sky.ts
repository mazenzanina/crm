import * as Astronomy from 'astronomy-engine';
import { SIGNS, type PlanetName, type PlanetPosition, type SkyAspect, type SkySnapshot, type ZodiacSign } from './types';

export const SKY_TIME_ZONE = 'Africa/Tunis' as const;

const BODIES: { name: PlanetName; symbol: string; body: Astronomy.Body }[] = [
  { name: 'Sun', symbol: '☉', body: Astronomy.Body.Sun },
  { name: 'Moon', symbol: '☽', body: Astronomy.Body.Moon },
  { name: 'Mercury', symbol: '☿', body: Astronomy.Body.Mercury },
  { name: 'Venus', symbol: '♀', body: Astronomy.Body.Venus },
  { name: 'Mars', symbol: '♂', body: Astronomy.Body.Mars },
  { name: 'Jupiter', symbol: '♃', body: Astronomy.Body.Jupiter },
  { name: 'Saturn', symbol: '♄', body: Astronomy.Body.Saturn },
  { name: 'Uranus', symbol: '♅', body: Astronomy.Body.Uranus },
  { name: 'Neptune', symbol: '♆', body: Astronomy.Body.Neptune },
  { name: 'Pluto', symbol: '♇', body: Astronomy.Body.Pluto },
];

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day'), hour: pick('hour'), minute: pick('minute') };
}

export function tunisDateKey(now: Date = new Date()): string {
  const { year, month, day } = partsInZone(now, SKY_TIME_ZONE);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Stable snapshot for a Tunis calendar day. Noon is outside DST transitions. */
function noonInTunis(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  const provisionalUtc = Date.UTC(year, month - 1, day, 12);
  const local = partsInZone(new Date(provisionalUtc), SKY_TIME_ZONE);
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  return new Date(provisionalUtc - (localAsUtc - provisionalUtc));
}

function normalize(angle: number): number { return ((angle % 360) + 360) % 360; }

export function signForLongitude(longitude: number): ZodiacSign {
  return SIGNS[Math.floor(normalize(longitude) / 30)];
}

function eclipticLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Moon) return normalize(Astronomy.EclipticGeoMoon(date).lon);
  return normalize(Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon);
}

function planetPosition(name: PlanetName, symbol: string, body: Astronomy.Body, time: Date): PlanetPosition {
  const longitude = eclipticLongitude(body, time);
  const relative = longitude % 30;
  const degree = Math.floor(relative);
  const minute = Math.floor((relative - degree) * 60);
  let retrograde = false;
  if (body !== Astronomy.Body.Moon && body !== Astronomy.Body.Sun) {
    const before = eclipticLongitude(body, new Date(time.getTime() - 12 * 3600_000));
    const after = eclipticLongitude(body, new Date(time.getTime() + 12 * 3600_000));
    const motion = ((after - before + 540) % 360) - 180;
    retrograde = motion < 0;
  }
  const illuminatedPercent = body === Astronomy.Body.Sun ? null
    : Math.round(Astronomy.Illumination(body, time).phase_fraction * 1000) / 10;
  return { name, symbol, sign: signForLongitude(longitude), longitude: Math.round(longitude * 10000) / 10000, degree, minute, retrograde, illuminatedPercent };
}

export function phaseForAngle(angle: number): { phase: string; emoji: string; waxing: boolean } {
  const a = normalize(angle);
  if (a < 22.5 || a >= 337.5) return { phase: 'New Moon', emoji: '🌑', waxing: a < 180 };
  if (a < 67.5) return { phase: 'Waxing Crescent', emoji: '🌒', waxing: true };
  if (a < 112.5) return { phase: 'First Quarter', emoji: '🌓', waxing: true };
  if (a < 157.5) return { phase: 'Waxing Gibbous', emoji: '🌔', waxing: true };
  if (a < 202.5) return { phase: 'Full Moon', emoji: '🌕', waxing: a < 180 };
  if (a < 247.5) return { phase: 'Waning Gibbous', emoji: '🌖', waxing: false };
  if (a < 292.5) return { phase: 'Last Quarter', emoji: '🌗', waxing: false };
  return { phase: 'Waning Crescent', emoji: '🌘', waxing: false };
}

function moonAspects(planets: PlanetPosition[]): SkyAspect[] {
  const moon = planets.find((p) => p.name === 'Moon')!;
  const targets: { kind: SkyAspect['kind']; angle: number }[] = [
    { kind: 'conjunction', angle: 0 }, { kind: 'sextile', angle: 60 },
    { kind: 'square', angle: 90 }, { kind: 'trine', angle: 120 }, { kind: 'opposition', angle: 180 },
  ];
  const aspects: SkyAspect[] = [];
  for (const planet of planets) {
    if (planet.name === 'Moon') continue;
    const separation = Math.abs(((moon.longitude - planet.longitude + 540) % 360) - 180);
    const closest = targets.reduce((best, candidate) => Math.abs(candidate.angle - separation) < Math.abs(best.angle - separation) ? candidate : best);
    const orb = Math.round(Math.abs(closest.angle - separation) * 10) / 10;
    if (orb <= 4) aspects.push({ body: planet.name, kind: closest.kind, orb });
  }
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 3);
}

/** Astronomical geocentric, tropical, true-ecliptic-of-date positions at 12:00 Africa/Tunis. */
export function computeSky(now: Date = new Date()): SkySnapshot {
  const dateKey = tunisDateKey(now);
  const atNoon = noonInTunis(dateKey);
  const angle = Astronomy.MoonPhase(atNoon);
  const moon = phaseForAngle(angle);
  const planets = BODIES.map(({ name, symbol, body }) => planetPosition(name, symbol, body, atNoon));
  return {
    dateKey,
    displayDate: new Intl.DateTimeFormat('en-GB', { timeZone: SKY_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(atNoon),
    calculatedAt: atNoon.toISOString(),
    timeZone: SKY_TIME_ZONE,
    moon: {
      ...moon,
      angle: Math.round(angle * 10) / 10,
      illumination: Math.round(Astronomy.Illumination(Astronomy.Body.Moon, atNoon).phase_fraction * 100),
    },
    planets,
    aspects: moonAspects(planets),
  };
}

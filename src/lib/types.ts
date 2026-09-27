export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type ZodiacSign = (typeof SIGNS)[number];
export type Language = 'en' | 'fr' | 'tn';
export type ClientStatus = 'lead' | 'active' | 'vip';

export const SIGN_SYMBOLS: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export const SIGN_ELEMENTS: Record<ZodiacSign, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  sun_sign: ZodiacSign | null;
  preferred_language: Language;
  status: ClientStatus;
  total_spent_tnd: number;
  notes: string;
  daily_opt_in: boolean;
  opted_in_at: string | null;
  opted_out_at: string | null;
  opt_in_source: string | null;
  privacy_accepted_at: string | null;
  adult_confirmed_at: string | null;
  last_sent_on: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanetName = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

export interface PlanetPosition {
  name: PlanetName;
  symbol: string;
  sign: ZodiacSign;
  longitude: number;
  degree: number;
  minute: number;
  retrograde: boolean;
  illuminatedPercent: number | null;
}

export interface SkyAspect {
  body: PlanetName;
  kind: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
}

export interface SkySnapshot {
  dateKey: string;
  displayDate: string;
  calculatedAt: string;
  timeZone: 'Africa/Tunis';
  moon: {
    phase: string;
    angle: number;
    illumination: number;
    emoji: string;
    waxing: boolean;
  };
  planets: PlanetPosition[];
  aspects: SkyAspect[];
}

export interface AppSettings {
  booking_url: string;
}

export const DEFAULT_BOOKING_URL = 'https://wa.me/21622481622';
export const HOME_URL = 'https://tarot-tn.vercel.app/';
export const BOOKING_PAGE_URL = 'https://tarot-tn.vercel.app/booking.html';

/** Approximate only; dates of sign changes can vary by year, place and birth time. */
export function approximateSunSign(birthDate: string): ZodiacSign | null {
  const [, monthText, dayText] = birthDate.split('-');
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dayOfYear = month * 100 + day;
  const cusp: [number, ZodiacSign][] = [
    [120, 'Aquarius'], [219, 'Pisces'], [321, 'Aries'], [420, 'Taurus'],
    [521, 'Gemini'], [621, 'Cancer'], [723, 'Leo'], [823, 'Virgo'],
    [923, 'Libra'], [1023, 'Scorpio'], [1122, 'Sagittarius'], [1222, 'Capricorn'],
  ];
  let sign: ZodiacSign = 'Capricorn';
  for (const [start, name] of cusp) if (dayOfYear >= start) sign = name;
  return sign;
}

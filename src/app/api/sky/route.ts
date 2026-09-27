import { NextResponse } from 'next/server';
import { computeSky } from '@/lib/sky';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const response = NextResponse.json(computeSky());
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

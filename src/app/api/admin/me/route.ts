import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  return auth.ok ? NextResponse.json({ email: auth.email }) : auth.response;
}

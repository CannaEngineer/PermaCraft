import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { code } = await request.json();
  const betaCode = process.env.BETA_ACCESS_CODE;

  if (!betaCode || code !== betaCode) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('beta_access', betaCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return response;
}

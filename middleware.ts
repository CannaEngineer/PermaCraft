import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const betaCode = process.env.BETA_ACCESS_CODE;

  // If no BETA_ACCESS_CODE is set, gate is disabled — allow everything through
  if (!betaCode) return NextResponse.next();

  const cookie = request.cookies.get('beta_access');
  if (cookie?.value === betaCode) return NextResponse.next();

  // Redirect to access gate, preserving the intended destination
  const url = request.nextUrl.clone();
  url.pathname = '/access';
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/login', '/register'],
};

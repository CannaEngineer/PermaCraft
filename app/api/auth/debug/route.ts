import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const checks: Record<string, unknown> = {};

  // 1. Check if session cookie exists (from request headers since getSession uses next/headers)
  const cookieHeader = request.headers.get("cookie") || "";
  const hasSessionCookie = cookieHeader.includes("session=");
  checks.sessionCookiePresent = hasSessionCookie;

  // 2. Validate session JWT
  try {
    const session = await getSession();
    checks.session = session
      ? { valid: true, userId: session.user.id, email: session.user.email, name: session.user.name }
      : { valid: false, reason: "No session or invalid token" };
  } catch (err: any) {
    checks.session = { valid: false, reason: err.message };
  }

  // 3. Check database connectivity
  try {
    const result = await db.execute({ sql: "SELECT 1 as ok", args: [] });
    checks.database = { connected: true, result: result.rows[0] };
  } catch (err: any) {
    checks.database = { connected: false, error: err.message };
  }

  // 4. Check env vars are set (not their values)
  checks.env = {
    BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  };

  return Response.json(checks);
}

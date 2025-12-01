import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secret = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session");

  if (!token) return null;

  try {
    const verified = await jwtVerify(token.value, secret);
    return verified.payload as { user: SessionUser };
  } catch (err) {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete("session");
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Get user from Turso database
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });

    const user = result.rows[0] as any;

    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT session
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });

    // Return success
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    return Response.json({ error: "Sign-in failed" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Get user from Turso database
    let result;
    try {
      result = await db.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [email],
      });
    } catch (dbError) {
      console.error("Database error during sign-in:", dbError);
      return Response.json(
        { error: "Unable to connect to the database. Please try again later." },
        { status: 503 }
      );
    }

    const user = result.rows[0] as any;

    if (!user) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    if (!user.password) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
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
    return Response.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}

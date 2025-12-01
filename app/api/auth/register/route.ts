import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { createSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const userId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO users (id, name, email, password, created_at, updated_at)
            VALUES (?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [userId, name, email, hashedPassword],
    });

    // Create session
    await createSession({
      id: userId,
      email,
      name,
      image: null,
    });

    return NextResponse.json({
      success: true,
      user: { id: userId, email, name },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

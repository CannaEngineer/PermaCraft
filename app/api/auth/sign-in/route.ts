import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const db = new Database(path.join(process.cwd(), "auth.db"));

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Get user from database
    const user = db.prepare("SELECT * FROM user WHERE email = ?").get(email) as any;

    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    db.prepare(`
      INSERT INTO session (id, userId, token, expiresAt)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt);

    // Return success with session
    const response = Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    // Set session cookie
    response.headers.set(
      "Set-Cookie",
      `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error("Sign-in error:", error);
    return Response.json({ error: "Sign-in failed" }, { status: 500 });
  }
}

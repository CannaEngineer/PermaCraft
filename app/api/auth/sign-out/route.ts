import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "auth.db"));

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value;

    if (sessionToken) {
      // Delete session from database
      db.prepare("DELETE FROM session WHERE token = ?").run(sessionToken);
    }

    // Clear cookie
    const response = Response.json({ success: true });
    response.headers.set(
      "Set-Cookie",
      "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );

    return response;
  } catch (error) {
    console.error("Sign-out error:", error);
    return Response.json({ error: "Sign-out failed" }, { status: 500 });
  }
}

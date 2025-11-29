import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Database from "better-sqlite3";
import path from "path";

export async function requireAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  // Verify session in database
  const db = new Database(path.join(process.cwd(), "auth.db"));
  const session = db.prepare(`
    SELECT s.*, u.id as user_id, u.email, u.name
    FROM session s
    JOIN user u ON s.userId = u.id
    WHERE s.token = ? AND s.expiresAt > ?
  `).get(sessionToken, Date.now()) as any;

  db.close();

  if (!session) {
    redirect("/login");
  }

  return {
    user: {
      id: session.user_id,
      email: session.email,
      name: session.name
    }
  };
}

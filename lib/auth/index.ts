import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";

// Use local SQLite for Better Auth (simpler than Turso)
const db = new Database(path.join(process.cwd(), "auth.db"));

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});

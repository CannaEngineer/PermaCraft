import { betterAuth } from "better-auth";
import { db } from "@/lib/db";
import { libsqlAdapter } from "./libsql-adapter";

// Verify required environment variables
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is required. Generate one with: openssl rand -base64 32"
  );
}

console.log('[AUTH INIT] Initializing Better Auth with libSQL adapter');

export const auth = betterAuth({
  database: libsqlAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

console.log('[AUTH INIT] Better Auth initialized successfully');

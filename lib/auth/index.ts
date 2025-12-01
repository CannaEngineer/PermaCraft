import { betterAuth } from "better-auth";
import { libsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";
import { createClient } from "@libsql/client";

// Verify required environment variables
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is required. Generate one with: openssl rand -base64 32"
  );
}

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is required");
}

// Create Turso client
console.log('[AUTH INIT] Creating Turso client with URL:', process.env.TURSO_DATABASE_URL?.substring(0, 30) + '...');
const libsqlClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create Kysely instance with libsql dialect
console.log('[AUTH INIT] Creating Kysely instance with libsql dialect');
const db = new Kysely({
  dialect: libsqlDialect({
    client: libsqlClient,
  }),
});

console.log('[AUTH INIT] Initializing Better Auth');
export const auth = betterAuth({
  database: db as any,
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

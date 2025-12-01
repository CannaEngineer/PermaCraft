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
const libsqlClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create Kysely instance with libsql dialect
const db = new Kysely({
  dialect: libsqlDialect({
    client: libsqlClient,
  }),
});

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
  // Map our existing table/column names to Better Auth's expectations
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          // Map createdAt/updatedAt to created_at/updated_at
          return {
            ...user,
            created_at: user.createdAt || Date.now(),
            updated_at: user.updatedAt || Date.now(),
          };
        },
      },
    },
    session: {
      create: {
        async before(session) {
          // Map expiresAt to expires_at and userId to user_id
          return {
            ...session,
            expires_at: session.expiresAt,
            user_id: session.userId,
            created_at: session.createdAt || Date.now(),
          };
        },
      },
    },
  },
});

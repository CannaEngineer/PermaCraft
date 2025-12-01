/**
 * Environment Variable Validation
 *
 * Validates all required environment variables are present.
 * Call this early in your app to fail fast with clear error messages.
 */

interface EnvConfig {
  // Database (Required)
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;

  // Auth (Required)
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  // AI (Required)
  OPENROUTER_API_KEY: string;

  // Storage - R2 (Optional - falls back to base64)
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;

  // App (Optional)
  NEXT_PUBLIC_APP_URL?: string;
}

export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Required variables
  const required = [
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'OPENROUTER_API_KEY',
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`❌ Missing required environment variable: ${key}`);
    }
  }

  // Optional but recommended (R2 storage)
  const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const hasAnyR2 = r2Vars.some(key => process.env[key]);
  const hasAllR2 = r2Vars.every(key => process.env[key]);

  if (hasAnyR2 && !hasAllR2) {
    errors.push(`⚠️  Partial R2 configuration detected. Either set all R2 variables or none:`);
    r2Vars.forEach(key => {
      errors.push(`   ${process.env[key] ? '✓' : '✗'} ${key}`);
    });
  }

  if (!hasAllR2) {
    console.warn('⚠️  R2 storage not configured - using base64 fallback for screenshots');
  }

  // Throw if required vars are missing
  if (errors.length > 0) {
    throw new Error(
      '\n\n' +
      '═'.repeat(60) + '\n' +
      '  ENVIRONMENT CONFIGURATION ERROR\n' +
      '═'.repeat(60) + '\n\n' +
      errors.join('\n') + '\n\n' +
      'Fix:\n' +
      '  1. Copy .env.example to .env.local\n' +
      '  2. Fill in the required values\n' +
      '  3. For Vercel: Add these to Environment Variables in dashboard\n' +
      '  4. See DEPLOYMENT.md for detailed setup guide\n\n' +
      '═'.repeat(60) + '\n'
    );
  }

  return process.env as unknown as EnvConfig;
}

// Server-side only - do not use in client components
export const env = validateEnv();

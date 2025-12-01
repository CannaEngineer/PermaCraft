# Vercel Environment Variables

This document lists ALL environment variables needed for PermaCraft deployment on Vercel.

## Required Variables (App Will Not Start Without These)

### Database
```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-token
```

**How to get these:**
```bash
# Install Turso CLI
brew install tursodatabase/tap/turso  # macOS
# or
curl -sSfL https://get.tur.so/install.sh | bash  # Linux

# Login and create database
turso auth login
turso db create permacraft
turso db show permacraft  # Get URL
turso db tokens create permacraft  # Get token
```

---

### Authentication
```
BETTER_AUTH_SECRET=your-32-character-secret
BETTER_AUTH_URL=https://your-app.vercel.app
```

**How to generate secret:**
```bash
openssl rand -base64 32
```

**Important:**
- `BETTER_AUTH_URL` must match your deployed URL
- For production: `https://your-app.vercel.app`
- For preview deployments: Vercel sets this automatically via `VERCEL_URL`

---

### AI API
```
OPENROUTER_API_KEY=sk-or-v1-your-key
```

**How to get this:**
1. Go to https://openrouter.ai/
2. Sign up / Login
3. Go to Keys section
4. Create new API key
5. Copy the key (starts with `sk-or-v1-`)

---

## Optional Variables (Recommended for Production)

### Photo Storage (Cloudflare R2)
```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=permacraft-snapshots
R2_PUBLIC_URL=https://your-r2-domain.com
```

**If not configured:**
- App will use base64 storage (works but less efficient)
- Screenshots stored directly in database
- Larger database size

**How to setup R2:**
See [DEPLOYMENT.md](./DEPLOYMENT.md#cloudflare-r2-setup) for detailed guide.

---

### App URL (Public)
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Note:** This is used for OpenRouter API attribution. Vercel sets `VERCEL_URL` automatically, which is used as fallback.

---

## Setting Variables in Vercel Dashboard

### Method 1: Vercel Dashboard (Recommended)

1. Go to your project settings: `https://vercel.com/your-username/permacraft/settings`
2. Click "Environment Variables"
3. Add each variable:
   - **Key:** Variable name (e.g., `TURSO_DATABASE_URL`)
   - **Value:** Variable value
   - **Environments:** Check `Production`, `Preview`, `Development`
4. Click "Save"

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Set variables
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add BETTER_AUTH_SECRET
vercel env add BETTER_AUTH_URL
vercel env add OPENROUTER_API_KEY

# Optional R2 variables
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add R2_PUBLIC_URL
```

### Method 3: Import from .env.local

```bash
# From project root
vercel env pull  # Download existing vars
# Or
vercel env add < .env.local  # Upload local vars
```

---

## Verification Checklist

Before deploying, verify you have:

- [ ] `TURSO_DATABASE_URL` - Database connection
- [ ] `TURSO_AUTH_TOKEN` - Database authentication
- [ ] `BETTER_AUTH_SECRET` - Session encryption (32+ chars)
- [ ] `BETTER_AUTH_URL` - Your app URL
- [ ] `OPENROUTER_API_KEY` - AI API access

Optional but recommended:
- [ ] R2 storage variables (all or none)
- [ ] `NEXT_PUBLIC_APP_URL` for OpenRouter attribution

---

## Common Errors

### "BETTER_AUTH_SECRET is required"
**Solution:** Add the variable to Vercel dashboard
```bash
openssl rand -base64 32  # Generate secret
# Add to Vercel dashboard
```

### "R2 credentials not configured"
**Solution:** Either:
1. Add all R2 variables to Vercel, OR
2. Remove any partial R2 config (app will use base64 fallback)

### "TURSO_DATABASE_URL is not defined"
**Solution:**
1. Create Turso database
2. Add URL and token to Vercel dashboard
3. Redeploy

---

## Testing Your Configuration

After setting environment variables in Vercel:

1. Trigger a new deployment (push to GitHub or click "Redeploy")
2. Check deployment logs for errors
3. Visit your deployed app
4. Try to register/login (tests auth + database)
5. Try AI analysis (tests OpenRouter API)

---

## Security Notes

- ✅ **DO** set all secret variables in Vercel dashboard
- ❌ **DO NOT** commit `.env.local` to git
- ❌ **DO NOT** share API keys in public repositories
- ✅ **DO** use different databases for dev/staging/production
- ✅ **DO** rotate secrets if compromised

---

## Quick Copy-Paste Template

For quickly setting up in Vercel dashboard:

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
OPENROUTER_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
NEXT_PUBLIC_APP_URL=
```

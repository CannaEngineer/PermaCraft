# Deployment Guide

This guide covers deploying Permaculture.Studio to production using Vercel (recommended) or other platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deploying to Vercel](#deploying-to-vercel)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Storage Setup](#storage-setup)
- [Post-Deployment](#post-deployment)
- [Alternative Platforms](#alternative-platforms)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub account (for Vercel integration)
- [ ] Turso account - [Sign up](https://turso.tech/)
- [ ] OpenRouter API key - [Get free tier](https://openrouter.ai/)
- [ ] Cloudflare account (optional, for R2 storage)
- [ ] Domain name (optional, but recommended)

---

## Deploying to Vercel

### Option 1: Deploy Button (Quickest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/permacraft)

1. Click the button above
2. Log in to Vercel
3. Configure environment variables (see below)
4. Click "Deploy"

### Option 2: GitHub Integration (Recommended)

**Step 1: Push to GitHub**

```bash
# Add your repository as remote
git remote add origin https://github.com/yourusername/permacraft.git

# Push to GitHub
git push -u origin master
```

**Step 2: Connect Vercel**

1. Go to [vercel.com](https://vercel.com/)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings (auto-detected for Next.js)
5. Add environment variables (see below)
6. Click "Deploy"

**Step 3: Set Up Auto-Deployments**

Vercel will automatically deploy:
- **Production**: on push to `master` branch
- **Preview**: on pull requests

### Option 3: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts to configure
```

---

## Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables

### Required Variables

```bash
# Database (Turso)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Authentication
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# AI
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Optional Variables (for R2 Screenshot Storage)

```bash
# Cloudflare R2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=permacraft-screenshots
R2_PUBLIC_URL=https://your-r2-public-url
```

**Without R2:** Screenshots will fall back to base64 storage (works but less efficient)

---

## Database Setup

### 1. Create Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create permacraft-prod

# Get connection details
turso db show permacraft-prod

# Create auth token
turso db tokens create permacraft-prod
```

### 2. Run Migrations

```bash
# Run schema
turso db shell permacraft-prod < lib/db/schema.sql

# Seed species data
turso db shell permacraft-prod < data/seed-species.sql
```

### 3. Add to Vercel Environment Variables

Copy the `URL` and `Token` from above and add to Vercel as:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### Database Management

**View data:**
```bash
turso db shell permacraft-prod
```

**Backup:**
```bash
turso db shell permacraft-prod .dump > backup.sql
```

**Restore:**
```bash
turso db shell permacraft-prod < backup.sql
```

---

## Storage Setup (Optional)

### Cloudflare R2

**Step 1: Create R2 Bucket**

1. Log in to Cloudflare Dashboard
2. Go to R2 → Create Bucket
3. Name: `permacraft-screenshots`
4. Region: Auto (or closest to your users)

**Step 2: Create API Token**

1. R2 → Manage R2 API Tokens
2. Create API Token with:
   - **Permissions**: Read & Write
   - **Bucket**: permacraft-screenshots
3. Save `Access Key ID` and `Secret Access Key`

**Step 3: Configure Public Access**

Choose one option:

**Option A: Custom Domain (Recommended)**
1. R2 Bucket → Settings → Public Access
2. Connect custom domain: `cdn.yourdomain.com`
3. Add DNS records as instructed
4. Set `R2_PUBLIC_URL=https://cdn.yourdomain.com`

**Option B: R2.dev Subdomain**
1. R2 Bucket → Settings → Public Access
2. Enable R2.dev subdomain
3. Copy URL (e.g., `https://pub-abc123.r2.dev`)
4. Set `R2_PUBLIC_URL=https://pub-abc123.r2.dev`

**Step 4: Set Up CORS**

See [scripts/setup-r2-cors.md](scripts/setup-r2-cors.md) for detailed CORS setup.

Quick setup:
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Set CORS (see setup-r2-cors.md for full config)
wrangler r2 bucket cors put permacraft-screenshots --cors-file=cors.json
```

---

## Post-Deployment

### 1. Verify Deployment

Visit your deployment URL and check:
- [ ] Homepage loads
- [ ] Login/Register works
- [ ] Can create a farm
- [ ] Map displays correctly
- [ ] AI chat responds
- [ ] Screenshots can be viewed

### 2. Set Up Custom Domain (Optional)

**In Vercel:**
1. Project → Settings → Domains
2. Add your domain (e.g., `permacraft.com`)
3. Follow DNS configuration instructions
4. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`

### 3. Configure Analytics (Optional)

Vercel provides built-in analytics:
1. Project → Analytics tab
2. Enable Vercel Analytics
3. Or integrate Google Analytics, Plausible, etc.

### 4. Set Up Monitoring

**Vercel Logs:**
- Project → Deployments → [Click deployment] → Logs
- Real-time function logs

**Error Tracking:**
- Consider integrating Sentry or similar
- Add in `app/error.tsx` and `app/global-error.tsx`

### 5. Performance Optimization

**Enable Production Optimizations:**
1. Vercel automatically optimizes:
   - Image optimization
   - Automatic caching
   - Serverless function bundling
   - Edge caching

**Review Edge Configuration:**
```typescript
// app/api/some-route/route.ts
export const runtime = 'edge'; // Use edge runtime where possible
```

---

## Alternative Platforms

### Netlify

Similar to Vercel:
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables
5. Deploy

### Railway

Good for full-stack apps:
1. Connect GitHub
2. Add Turso database connection
3. Configure environment
4. Deploy

### Self-Hosted (Docker)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t permacraft .
docker run -p 3000:3000 --env-file .env permacraft
```

For production self-hosting:
- Use process manager (PM2, systemd)
- Set up reverse proxy (nginx, Caddy)
- Configure SSL certificates (Let's Encrypt)
- Set up monitoring (Prometheus, Grafana)

---

## Troubleshooting

### Build Failures

**Issue:** TypeScript errors during build

**Solution:**
```bash
# Test build locally first
npm run build

# Fix type errors
npm run lint
```

**Issue:** Missing environment variables

**Solution:**
- Verify all required env vars are set in Vercel
- Check for typos in variable names
- Ensure values are properly escaped

### Runtime Errors

**Issue:** Database connection failed

**Solution:**
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Check token hasn't expired
- Ensure database exists: `turso db show permacraft-prod`

**Issue:** Authentication not working

**Solution:**
- Verify `BETTER_AUTH_SECRET` is set
- Check `BETTER_AUTH_URL` matches deployment URL
- Clear cookies and try again

**Issue:** AI analysis fails

**Solution:**
- Verify `OPENROUTER_API_KEY` is valid
- Check OpenRouter dashboard for rate limits
- Review Vercel function logs

**Issue:** Screenshots not displaying

**Solution:**
- Without R2: Expected to be slow (base64)
- With R2: Verify CORS configuration
- Check `R2_PUBLIC_URL` is accessible
- Review R2 bucket public access settings

### Performance Issues

**Issue:** Slow page loads

**Solution:**
- Enable Vercel Analytics to identify bottlenecks
- Check database query performance
- Consider adding database indexes
- Optimize images

**Issue:** High function execution time

**Solution:**
- Review Vercel function logs
- Optimize AI prompts (shorter screenshots)
- Add caching where appropriate
- Use edge runtime for lightweight functions

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review error logs
- [ ] Check analytics
- [ ] Monitor database size

**Monthly:**
- [ ] Rotate API keys
- [ ] Review and clean old screenshots
- [ ] Check for dependency updates

**Quarterly:**
- [ ] Database backup
- [ ] Security audit
- [ ] Performance review

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Test thoroughly
npm run build
npm run dev

# Deploy
git commit -am "chore: Update dependencies"
git push
```

### Database Migrations

When schema changes:
1. Create migration file in `lib/db/migrations/`
2. Test locally
3. Run on production:
   ```bash
   turso db shell permacraft-prod < lib/db/migrations/YYYY-MM-DD-migration.sql
   ```
4. Deploy code changes

---

## Security Checklist

Before going live:

- [ ] All API keys in environment variables (not hardcoded)
- [ ] CORS configured correctly
- [ ] Authentication required on all protected routes
- [ ] Input validation with Zod
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting implemented (if high traffic)
- [ ] HTTPS enabled (automatic with Vercel/Netlify)
- [ ] Dependencies updated to latest secure versions

---

## Support

**Deployment Issues:**
- Vercel Support: https://vercel.com/support
- Turso Support: https://turso.tech/discord
- GitHub Issues: https://github.com/yourusername/permacraft/issues

**Community:**
- GitHub Discussions: Q&A and best practices
- Discord: [Join community](https://discord.gg/permacraft) (if available)

---

**Last Updated:** 2024-11-30

Happy deploying! 🚀🌱

# Deployment Instructions

## Deploying PermaCraft to Vercel

### Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. All environment variables configured (see `.env.example`)
3. GitHub repository (optional, but recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### Step 3: Initial Deployment

From the project root directory:

```bash
vercel
```

This will:
- Link to an existing project or create a new one
- Prompt for project name
- Deploy to a preview URL

### Step 4: Configure Environment Variables

Option A - Via CLI:
```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add BETTER_AUTH_SECRET
vercel env add BETTER_AUTH_URL
vercel env add OPENROUTER_API_KEY
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add NEXT_PUBLIC_APP_URL
```

Option B - Via Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `.env.local`
5. Select appropriate environments (Production, Preview, Development)

### Step 5: Production Deployment

```bash
vercel --prod
```

This will deploy to your production domain.

### Step 6: Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` environment variables

### Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow
- [ ] Test farm creation
- [ ] Test map editor
- [ ] Test AI analysis
- [ ] Check database connectivity
- [ ] Verify R2 storage is working

### Continuous Deployment

If you push to GitHub:
1. Connect your repository in Vercel Dashboard
2. Enable automatic deployments
3. Every push to main will trigger a production deployment
4. Pull requests will create preview deployments

### Troubleshooting

**Build Errors:**
- Check all environment variables are set correctly
- Verify Node.js version matches local (18+)
- Check build logs in Vercel Dashboard

**Database Connection:**
- Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
- Ensure Turso database is accessible
- Check database schema is applied

**Auth Issues:**
- Verify BETTER_AUTH_SECRET is set
- Update BETTER_AUTH_URL to production domain
- Check session cookie settings

**Storage Issues:**
- Verify R2 credentials
- Check bucket permissions
- Ensure public URL is configured correctly

### Rollback

If you need to rollback to a previous deployment:
1. Go to Vercel Dashboard → Project → Deployments
2. Find the previous successful deployment
3. Click the three dots → Promote to Production

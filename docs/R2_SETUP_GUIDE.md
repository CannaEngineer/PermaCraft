# Cloudflare R2 Setup Guide for Permaculture.Studio

## Overview
This guide will help you set up Cloudflare R2 storage for blog cover images and map screenshots.

## Prerequisites
- Cloudflare account (free tier works)
- Access to your project's environment variables

---

## Step 1: Create R2 Bucket

### 1.1 Access R2 Dashboard
1. Go to https://dash.cloudflare.com/
2. Log in to your account
3. Click **"R2"** in the left sidebar
4. If prompted, enable R2 for your account (no credit card required for development)

### 1.2 Use Existing Bucket
If you already have a bucket (e.g., `permaculture-studio-snapshots`), **skip to Step 2**.

Or to create a new bucket:
1. Click **"Create bucket"**
2. **Bucket name**: `permaculture-studio-snapshots` (lowercase, no spaces)
3. **Location**: Choose closest to your users
4. Click **"Create bucket"**

Blog images will be stored in a `blog-covers/` folder within this bucket.

---

## Step 2: Enable Public Access

⚠️ **Important**: Without public access, images won't load on your site.

### Option A: R2.dev Subdomain (Recommended for Development)

1. In your bucket, go to **Settings** tab
2. Scroll to **"Public Access"** section
3. Click **"Allow Access"** → **"Connect R2.dev subdomain"**
4. Cloudflare generates: `https://pub-[random-string].r2.dev`
5. ✅ **Copy this URL** - this is your `R2_PUBLIC_URL`

### Option B: Custom Domain (Recommended for Production)

1. In bucket settings, scroll to **"Custom Domains"**
2. Click **"Connect Domain"**
3. Enter subdomain: `cdn.yoursite.com` or `images.yoursite.com`
4. Cloudflare automatically adds DNS records
5. Wait 5-10 minutes for DNS propagation
6. Your `R2_PUBLIC_URL` is: `https://cdn.yoursite.com`

---

## Step 3: Create API Token

### 3.1 Navigate to API Tokens
1. From R2 main page, click **"Manage R2 API Tokens"** (top right)
2. Click **"Create API Token"**

### 3.2 Configure Token
- **Token name**: `permacraft-uploads`
- **Permissions**: Select **"Object Read & Write"**
- **Bucket scope**:
  - Select **"Apply to specific buckets only"**
  - Choose `permaculture-studio-snapshots`
- **TTL**: Leave as "Forever" (or set expiration if you prefer)

### 3.3 Save Credentials
After clicking **"Create API Token"**, you'll see:

```
Access Key ID: 1234567890abcdef1234567890abcdef
Secret Access Key: abcdef1234567890abcdef1234567890abcdef1234567890
```

⚠️ **Save these immediately** - you can only view them once!

### 3.4 Get Account ID
Your Account ID is displayed at the top of the R2 page:
- Format: `1234567890abcdef1234567890abcdef`
- Also in URL: `dash.cloudflare.com/[ACCOUNT_ID]/r2`

---

## Step 4: Configure Environment Variables

### For Local Development

Create or update `.env.local` in your project root:

```bash
# Cloudflare R2 Storage Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=permaculture-studio-snapshots
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev

# Existing vars...
TURSO_DATABASE_URL=...
# etc.
```

**Replace the values** with your actual credentials from Step 3.

### For Vercel Production

1. Go to https://vercel.com/dashboard
2. Select your **Permaculture.Studio** project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable:

| Variable Name | Value | Environments |
|---------------|-------|--------------|
| `R2_ACCOUNT_ID` | Your account ID | ✓ All |
| `R2_ACCESS_KEY_ID` | Your access key | ✓ All |
| `R2_SECRET_ACCESS_KEY` | Your secret key | ✓ All |
| `R2_BUCKET_NAME` | `permaculture-studio-snapshots` | ✓ All |
| `R2_PUBLIC_URL` | `https://pub-xxxx.r2.dev` | ✓ All |

5. After adding all variables, **redeploy**:
   - Go to **Deployments** tab
   - Click "..." on the latest deployment
   - Click **"Redeploy"**

---

## Step 5: Test Configuration

### Test Locally

```bash
# 1. Make sure .env.local is configured
cat .env.local | grep R2

# 2. Run the test script
npx tsx scripts/test-r2-upload.ts
```

**Expected output:**
```
🧪 Testing R2 Upload Configuration...

Environment Variables:
  R2_ACCOUNT_ID: ✓ Set
  R2_ACCESS_KEY_ID: ✓ Set
  R2_SECRET_ACCESS_KEY: ✓ Set
  R2_BUCKET_NAME: permacraft-blog-images
  R2_PUBLIC_URL: https://pub-xxxxx.r2.dev

📥 Downloading test image from: https://...
⬆️  Uploading to R2 bucket: permaculture-studio-snapshots

✅ Success! Image uploaded to R2
📍 Permanent URL: https://pub-xxxxx.r2.dev/test/...
```

### Test in Browser

1. Copy the permanent URL from the test output
2. Open it in your browser
3. You should see the test image
4. If you get an error, check public access settings

### Test Blog Generation

```bash
# Generate a test blog post
npm run dev
# Navigate to /admin/blog
# Click "Generate Blog Post"
# Check that the cover image appears
```

---

## Troubleshooting

### Images Not Loading

**Problem**: Blog posts have blank cover images

**Solutions**:
1. ✓ Verify `R2_PUBLIC_URL` is set correctly
2. ✓ Check public access is enabled on bucket
3. ✓ Test URL in browser (should NOT return 403)
4. ✓ Restart dev server after adding env vars

### 403 Forbidden Error

**Problem**: Images return "Access Denied"

**Solutions**:
1. Enable public access on bucket (see Step 2)
2. If using custom domain, verify DNS is configured
3. Wait 5-10 minutes for DNS/settings to propagate

### API Token Errors

**Problem**: "Invalid credentials" or "Access denied"

**Solutions**:
1. Verify API token has "Object Read & Write" permissions
2. Check token is scoped to correct bucket
3. Ensure `R2_ACCOUNT_ID` matches the account that owns the bucket
4. Regenerate token if credentials were copied incorrectly

### Upload Succeeds but URL is Base64

**Problem**: Images upload but `cover_image_url` contains base64 data

**Solutions**:
1. This happens when `R2_PUBLIC_URL` is not set
2. Check `.env.local` has `R2_PUBLIC_URL` defined
3. Restart dev server after setting the variable

---

## Cost Estimate

Cloudflare R2 Pricing (as of 2024):

| Operation | Free Tier | Cost After Free Tier |
|-----------|-----------|---------------------|
| Storage | 10 GB/month | $0.015/GB/month |
| Class A Operations (writes) | 1M/month | $4.50/million |
| Class B Operations (reads) | 10M/month | $0.36/million |

**Estimated monthly cost for blog with 100 posts:**
- Storage: ~500 MB (100 images × 5 MB) = **FREE**
- Writes: 100 uploads = **FREE**
- Reads: 10,000 views = **FREE**

**Total: $0/month** for typical usage 🎉

---

## Next Steps

After completing setup:

1. ✅ Test locally with `npx tsx scripts/test-r2-upload.ts`
2. ✅ Generate a test blog post
3. ✅ Verify images load correctly
4. ✅ Deploy to Vercel with environment variables
5. ✅ Test on production

---

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://www.cloudflare.com/en-gb/developer-platform/r2/pricing/)
- [Public Buckets Guide](https://developers.cloudflare.com/r2/buckets/public-buckets/)
## Current Bucket Structure

Your R2 bucket will be organized like this:

```
permaculture-studio-snapshots/
├── farms/                    # Map screenshots (existing)
│   └── [farm-id]/
│       └── snapshots/
│           └── *.png
└── blog-covers/              # Blog cover images (new)
    └── [timestamp]-cover.png
```

This keeps everything organized in one bucket!

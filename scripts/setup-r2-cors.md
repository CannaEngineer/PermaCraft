# R2 Bucket Setup for Public Screenshot Access

## Problem
By default, R2 buckets accessed via `.r2.cloudflarestorage.com` URLs are NOT publicly accessible and will cause CORS/OpaqueResponseBlocking errors.

## Solution: Configure Public Access

### Option 1: Custom Domain (Recommended)

1. **Create R2 Bucket** in Cloudflare Dashboard
   - Go to R2 → Create Bucket
   - Name: `permacraft-snapshots`

2. **Enable Public Access via Custom Domain**
   - Go to bucket settings → "Public Access"
   - Click "Connect Domain"
   - Add your domain or subdomain (e.g., `cdn.permacraft.com`)
   - Follow DNS setup instructions

3. **Update Environment Variable**
   ```bash
   R2_PUBLIC_URL=https://cdn.permacraft.com
   ```

### Option 2: R2.dev Subdomain (Easier but limited)

1. **Enable Public Access**
   - In bucket settings → "Public Access"
   - Enable "Allow Access"
   - Get your R2.dev URL (e.g., `https://pub-abc123.r2.dev`)

2. **Update Environment Variable**
   ```bash
   R2_PUBLIC_URL=https://pub-abc123.r2.dev
   ```

### Option 3: Keep Using Base64 (No R2 Setup Needed)

If you don't want to configure R2, the system will automatically fallback to storing base64 data in the database. This works but is less efficient for large conversations.

Simply leave `R2_PUBLIC_URL` empty in your `.env`:
```bash
R2_PUBLIC_URL=
```

## CORS Configuration (If Using Custom Domain)

If you're using a custom domain, you may need to configure CORS headers:

1. **Via Cloudflare Dashboard**
   - Go to your R2 bucket
   - Settings → CORS Policy
   - Add policy:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

2. **Via Wrangler CLI**
   ```bash
   wrangler r2 bucket cors put permacraft-snapshots --cors-policy cors-policy.json
   ```

   Create `cors-policy.json`:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["*"],
         "AllowedMethods": ["GET"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

## Verify Setup

1. Upload a test file to your bucket
2. Access the public URL in your browser
3. If you see the image, it's working!
4. If you get CORS errors, check your CORS policy

## Environment Variables Summary

```bash
# Required
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=permacraft-snapshots

# Required for public access (choose one method above)
R2_PUBLIC_URL=https://cdn.permacraft.com
# OR
R2_PUBLIC_URL=https://pub-abc123.r2.dev
# OR leave empty to use base64 storage
R2_PUBLIC_URL=
```

## Testing

Run a test upload:
```bash
npm run test:r2
```

Or test manually by asking the AI assistant a question and checking:
1. Server logs show "Screenshot uploaded to R2: https://..."
2. Click "View Map Screenshot" button
3. Screenshot loads without errors

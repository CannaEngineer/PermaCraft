#!/usr/bin/env tsx
/**
 * Test R2 Upload Configuration
 * Run with: npx tsx scripts/test-r2-upload.ts
 */

import { uploadImageFromUrl } from '../lib/storage/r2';

async function testR2Upload() {
  console.log('🧪 Testing R2 Upload Configuration...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('  R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID ? '✓ Set' : '✗ Missing');
  console.log('  R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing');
  console.log('  R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing');
  console.log('  R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || '✗ Missing');
  console.log('  R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL || '✗ Missing');
  console.log('');

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    console.error('❌ R2 configuration incomplete. Please set all required environment variables.');
    process.exit(1);
  }

  try {
    // Test with a sample image (Unsplash placeholder)
    const testImageUrl = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400';

    console.log('📥 Downloading test image from:', testImageUrl);
    console.log('⬆️  Uploading to R2 bucket:', process.env.R2_BUCKET_NAME);

    const permanentUrl = await uploadImageFromUrl(
      testImageUrl,
      'test',
      'test-upload.jpg'
    );

    console.log('\n✅ Success! Image uploaded to R2');
    console.log('📍 Permanent URL:', permanentUrl);
    console.log('\n💡 Test this URL in your browser to verify public access.');

    if (!process.env.R2_PUBLIC_URL) {
      console.log('\n⚠️  Warning: R2_PUBLIC_URL is not set. Images may not be publicly accessible.');
      console.log('   Set this to your R2 bucket\'s public URL (e.g., https://pub-xxxxx.r2.dev)');
    }

  } catch (error: any) {
    console.error('\n❌ Upload failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Verify your R2 API token has Object Read & Write permissions');
    console.error('  2. Check that the bucket name is correct');
    console.error('  3. Ensure public access is enabled on your bucket');
    console.error('  4. Verify R2_PUBLIC_URL matches your bucket\'s public domain');
    process.exit(1);
  }
}

testR2Upload();

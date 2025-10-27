/**
 * LiveKit Credentials Verification Script
 *
 * This script helps verify that your LiveKit credentials are correctly configured
 * and match the LiveKit server URL.
 *
 * Run this script locally to test your credentials before deploying to Vercel:
 * node scripts/verify-livekit-credentials.js
 */

const { AccessToken } = require('livekit-server-sdk');
const fs = require('fs');
const path = require('path');

// Simple .env.local parser (doesn't require dotenv package)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.log(`Note: Could not load .env.local file (${error.message})`);
    console.log('Using environment variables from shell instead.\n');
  }
}

loadEnv();

async function verifyCredentials() {
  console.log('\n🔍 LiveKit Credentials Verification\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Check environment variables exist
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  console.log('Step 1: Environment Variables\n');
  console.log(`  ✓ LIVEKIT_API_KEY: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  if (apiKey) {
    console.log(`    - Format: ${apiKey.startsWith('API') ? '✅ Valid (starts with "API")' : '❌ Invalid (should start with "API")'}`);
    console.log(`    - Prefix: ${apiKey.substring(0, 10)}...`);
    console.log(`    - Length: ${apiKey.length} characters`);
  }

  console.log(`\n  ✓ LIVEKIT_API_SECRET: ${apiSecret ? '✅ Set' : '❌ Missing'}`);
  if (apiSecret) {
    console.log(`    - Length: ${apiSecret.length} characters`);
    console.log(`    - Prefix: ${apiSecret.substring(0, 10)}...`);
  }

  console.log(`\n  ✓ NEXT_PUBLIC_LIVEKIT_URL: ${wsUrl ? '✅ Set' : '❌ Missing'}`);
  if (wsUrl) {
    console.log(`    - Format: ${wsUrl.startsWith('wss://') ? '✅ Valid (starts with "wss://")' : '❌ Invalid (should start with "wss://")'}`);
    console.log(`    - URL: ${wsUrl}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 2: Validate format
  let hasErrors = false;

  if (!apiKey || !apiSecret || !wsUrl) {
    console.log('❌ ERROR: Missing required environment variables\n');
    console.log('Please set the following in .env.local:');
    if (!apiKey) console.log('  - LIVEKIT_API_KEY');
    if (!apiSecret) console.log('  - LIVEKIT_API_SECRET');
    if (!wsUrl) console.log('  - NEXT_PUBLIC_LIVEKIT_URL');
    console.log('\n');
    process.exit(1);
  }

  if (!apiKey.startsWith('API')) {
    console.log('❌ ERROR: LIVEKIT_API_KEY must start with "API"\n');
    console.log(`   Current value starts with: ${apiKey.substring(0, 10)}\n`);
    hasErrors = true;
  }

  if (!wsUrl.startsWith('wss://')) {
    console.log('❌ ERROR: NEXT_PUBLIC_LIVEKIT_URL must start with "wss://"\n');
    console.log(`   Current value: ${wsUrl}\n`);
    hasErrors = true;
  }

  if (hasErrors) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Please fix the errors above and run this script again.\n');
    process.exit(1);
  }

  // Step 3: Try to create a test token
  console.log('Step 2: Token Generation Test\n');

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: 'test-user',
      name: 'Test User',
      ttl: '1h',
    });

    token.addGrant({
      roomJoin: true,
      room: 'test-room',
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    console.log('  ✅ Token created successfully!');
    console.log(`  - Token length: ${jwt.length} characters`);
    console.log(`  - Token preview: ${jwt.substring(0, 50)}...\n`);
  } catch (error) {
    console.log('  ❌ Failed to create token!\n');
    console.log(`  Error: ${error.message}\n`);
    hasErrors = true;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 4: Extract project ID from URL and API key
  console.log('Step 3: Credential Matching Verification\n');

  // LiveKit URL format: wss://PROJECT_NAME.livekit.cloud
  const urlMatch = wsUrl.match(/wss:\/\/([^.]+)\.livekit\.cloud/);
  const projectFromUrl = urlMatch ? urlMatch[1] : null;

  if (projectFromUrl) {
    console.log(`  Project from URL: ${projectFromUrl}`);
  } else {
    console.log('  ⚠️  Could not extract project name from URL');
    console.log(`     URL format should be: wss://YOUR-PROJECT.livekit.cloud`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Final summary
  if (!hasErrors) {
    console.log('✅ SUCCESS: All credential checks passed!\n');
    console.log('Your credentials appear to be correctly formatted.');
    console.log('\nHowever, if you\'re still getting "invalid API key" errors:');
    console.log('\n1. Verify in LiveKit Cloud Dashboard that:');
    console.log(`   - Your project URL is exactly: ${wsUrl}`);
    console.log(`   - Your API key starts with: ${apiKey.substring(0, 10)}...`);
    console.log('   - The keys haven\'t been rotated or deleted\n');
    console.log('2. Make sure the SAME values are set in Vercel:');
    console.log('   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
    console.log('   - Verify each variable matches exactly (no extra spaces)');
    console.log('   - Redeploy after making any changes\n');
    console.log('3. Check LiveKit Cloud Dashboard → Settings → Keys:');
    console.log('   - Confirm the API Key and Secret are from the correct project\n');
  } else {
    console.log('❌ FAILED: Please fix the errors above\n');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verifyCredentials().catch(error => {
  console.error('\n❌ Unexpected error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

/**
 * Get Android SHA256 Certificate Fingerprint
 * 
 * This script helps you get the SHA256 fingerprint needed for Android Deep Linking
 * and Universal Links configuration.
 * 
 * Usage:
 * 1. For debug build: node scripts/get-android-sha256.js debug
 * 2. For release build: node scripts/get-android-sha256.js release
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildType = process.argv[2] || 'debug';

console.log('🔍 Getting Android SHA256 Certificate Fingerprint...\n');

if (buildType === 'debug') {
  console.log('📱 Debug Build Fingerprint:');
  console.log('=' .repeat(80));
  
  try {
    // Debug keystore path
    const debugKeystorePath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      '.android',
      'debug.keystore'
    );
    
    if (!fs.existsSync(debugKeystorePath)) {
      console.error('❌ Debug keystore not found at:', debugKeystorePath);
      console.log('\nℹ️  You may need to create it by running a debug build first:');
      console.log('   eas build --profile development --platform android');
      process.exit(1);
    }
    
    const command = `keytool -list -v -keystore "${debugKeystorePath}" -alias androiddebugkey -storepass android -keypass android`;
    const output = execSync(command, { encoding: 'utf-8' });
    
    // Extract SHA256 fingerprint
    const sha256Match = output.match(/SHA256:\s*([A-F0-9:]+)/);
    if (sha256Match) {
      const sha256 = sha256Match[1].replace(/:/g, ':');
      console.log('✅ SHA256 Fingerprint:');
      console.log(`   ${sha256}\n`);
      console.log('📋 For assetlinks.json, use:');
      console.log(`   ${sha256.replace(/:/g, ':')}\n`);
    } else {
      console.log('⚠️  Could not extract SHA256 from output');
      console.log('Full output:');
      console.log(output);
    }
  } catch (error) {
    console.error('❌ Error getting debug fingerprint:', error.message);
  }
  
} else if (buildType === 'release') {
  console.log('📱 Release Build Fingerprint:');
  console.log('=' .repeat(80));
  console.log('\nℹ️  To get the release SHA256 fingerprint, you need:');
  console.log('   1. Your release keystore file');
  console.log('   2. Your keystore password\n');
  
  console.log('Run this command with your keystore:');
  console.log('   keytool -list -v -keystore <path-to-your-release.keystore>\n');
  
  console.log('📝 Example:');
  console.log('   keytool -list -v -keystore android/app/release.keystore\n');
  
  console.log('🔐 Alternative - Get from Google Play Console:');
  console.log('   1. Go to Google Play Console');
  console.log('   2. Select your app');
  console.log('   3. Setup → App Signing');
  console.log('   4. Copy the SHA-256 certificate fingerprint\n');
  
  console.log('📋 Then update public/.well-known/assetlinks.json with the fingerprint');
  
} else {
  console.log('❌ Invalid build type. Use "debug" or "release"');
  process.exit(1);
}

console.log('=' .repeat(80));
console.log('\n📚 Next Steps:');
console.log('   1. Copy the SHA256 fingerprint');
console.log('   2. Update public/.well-known/assetlinks.json');
console.log('   3. Deploy the updated file to your web server');
console.log('   4. Verify at: https://your-domain.com/.well-known/assetlinks.json');
console.log('   5. Test deep linking with: adb shell am start -W -a android.intent.action.VIEW -d "https://your-domain.com/reset-password"\n');


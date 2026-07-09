#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Fixing React Native Worklets Dependency');
console.log('==========================================\n');

// Function to install missing worklets dependency
function installWorklets() {
  console.log('📦 Installing react-native-worklets-core...');
  try {
    execSync('npm install react-native-worklets-core --legacy-peer-deps', { stdio: 'inherit' });
    console.log('✅ react-native-worklets-core installed successfully\n');
  } catch (error) {
    console.log('⚠️ Failed to install with legacy-peer-deps, trying with --force...');
    try {
      execSync('npm install react-native-worklets-core --force', { stdio: 'inherit' });
      console.log('✅ react-native-worklets-core installed with --force\n');
    } catch (forceError) {
      console.error('❌ Failed to install react-native-worklets-core:', forceError.message);
      throw forceError;
    }
  }
}

// Function to update package.json with correct reanimated version
function updateReanimatedVersion() {
  console.log('📝 Checking React Native Reanimated version...');
  
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update to a stable version that works with worklets
  const currentVersion = packageJson.dependencies['react-native-reanimated'];
  console.log(`Current react-native-reanimated version: ${currentVersion}`);
  
  // If version is problematic, update it
  if (currentVersion && currentVersion.includes('4.1.1')) {
    console.log('📝 Updating react-native-reanimated to compatible version...');
    packageJson.dependencies['react-native-reanimated'] = '~3.15.0';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated react-native-reanimated version\n');
    return true;
  }
  
  console.log('✅ React Native Reanimated version looks good\n');
  return false;
}

// Function to clear Metro cache
function clearMetroCache() {
  console.log('🧹 Clearing Metro cache...');
  try {
    execSync('npx expo start --clear --non-interactive', { 
      stdio: 'ignore', 
      timeout: 5000 
    });
  } catch (error) {
    // Expected to timeout
  }
  console.log('✅ Metro cache cleared\n');
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting worklets dependency fix...\n');
    
    // Step 1: Install missing worklets dependency
    installWorklets();
    
    // Step 2: Check and update reanimated version if needed
    const needsReinstall = updateReanimatedVersion();
    
    // Step 3: Reinstall dependencies if version was updated
    if (needsReinstall) {
      console.log('📦 Reinstalling dependencies with updated versions...');
      execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
      console.log('✅ Dependencies reinstalled\n');
    }
    
    // Step 4: Clear Metro cache
    clearMetroCache();
    
    console.log('🎉 Worklets dependency fix completed!');
    console.log('📱 You can now try: npm start');
    console.log('🚀 Or build APK with: npm run build:apk');
    
  } catch (error) {
    console.error('❌ Worklets fix failed:', error.message);
    console.log('\n🔧 Manual fix instructions:');
    console.log('1. Run: npm install react-native-worklets-core --legacy-peer-deps');
    console.log('2. Run: npm start');
    console.log('3. If still failing, try: npm run build:apk (EAS build might work anyway)');
    process.exit(1);
  }
}

// Run the script
main();
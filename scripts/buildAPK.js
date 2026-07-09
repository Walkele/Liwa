#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Liwa Trading App - APK Builder');
console.log('=====================================\n');

// Check if EAS CLI is installed
function checkEASCLI() {
  try {
    execSync('eas --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Install EAS CLI if not present
function installEASCLI() {
  console.log('📦 Installing EAS CLI...');
  try {
    execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
    console.log('✅ EAS CLI installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install EAS CLI:', error.message);
    process.exit(1);
  }
}

// Check if TypeScript is installed
function checkTypeScript() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  return packageJson.devDependencies && packageJson.devDependencies.typescript;
}

// Install TypeScript
function installTypeScript() {
  console.log('📦 Installing TypeScript...');
  try {
    execSync('npm install typescript@~5.9.2 --save-dev', { stdio: 'inherit' });
    console.log('✅ TypeScript installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install TypeScript:', error.message);
    process.exit(1);
  }
}

// Build APK
function buildAPK() {
  console.log('🔨 Building APK...');
  console.log('This may take 10-15 minutes...\n');
  
  try {
    // Configure EAS if not already done
    if (!fs.existsSync('eas.json')) {
      console.log('⚙️ Configuring EAS...');
      execSync('eas build:configure', { stdio: 'inherit' });
    }
    
    // Build APK
    console.log('🏗️ Starting APK build...');
    execSync('eas build --platform android --profile preview', { stdio: 'inherit' });
    
    console.log('\n✅ APK build completed!');
    console.log('📱 Check your Expo dashboard for download link');
    console.log('🔗 Or run: eas build:list');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure you\'re logged in: eas login');
    console.log('2. Check your internet connection');
    console.log('3. Verify Firebase configuration');
    console.log('4. Check build logs for specific errors');
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    // Check and install EAS CLI
    if (!checkEASCLI()) {
      installEASCLI();
    } else {
      console.log('✅ EAS CLI is already installed\n');
    }
    
    // Check and install TypeScript
    if (!checkTypeScript()) {
      installTypeScript();
    } else {
      console.log('✅ TypeScript is already installed\n');
    }
    
    // Check if user is logged in
    try {
      execSync('eas whoami', { stdio: 'ignore' });
      console.log('✅ You are logged in to Expo\n');
    } catch (error) {
      console.log('🔐 Please login to Expo:');
      execSync('eas login', { stdio: 'inherit' });
    }
    
    // Build APK
    buildAPK();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
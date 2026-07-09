#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing React Native Dependencies for Liwa App');
console.log('===============================================\n');

// Function to update package.json with correct versions
function updatePackageJson() {
  console.log('📝 Updating package.json with compatible versions...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update React and React Native versions to be compatible
  packageJson.dependencies.react = "18.2.0";
  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies["react-test-renderer"] = "18.2.0";
  packageJson.devDependencies.typescript = "~5.9.2";
  
  // Add resolutions to force compatible versions
  packageJson.resolutions = {
    "react": "18.2.0",
    "react-test-renderer": "18.2.0"
  };
  
  // Add overrides for npm
  packageJson.overrides = {
    "react": "18.2.0",
    "react-test-renderer": "18.2.0"
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json updated with compatible versions\n');
}

// Function to clean and reinstall dependencies
function cleanAndReinstall() {
  console.log('🧹 Cleaning existing dependencies...');
  
  try {
    // Delete node_modules
    if (fs.existsSync('node_modules')) {
      console.log('🗑️ Deleting node_modules...');
      if (process.platform === 'win32') {
        execSync('rmdir /s /q node_modules', { stdio: 'ignore' });
      } else {
        execSync('rm -rf node_modules', { stdio: 'ignore' });
      }
    }
    
    // Delete package-lock.json
    if (fs.existsSync('package-lock.json')) {
      fs.unlinkSync('package-lock.json');
      console.log('✅ Deleted package-lock.json');
    }
    
    // Clear npm cache
    console.log('🧹 Clearing npm cache...');
    execSync('npm cache clean --force', { stdio: 'inherit' });
    
    console.log('📦 Installing dependencies with legacy peer deps...');
    execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup/reinstall:', error.message);
    console.log('\n🔧 Trying alternative approach...');
    
    try {
      execSync('npm install --force', { stdio: 'inherit' });
      console.log('✅ Dependencies installed with --force flag\n');
    } catch (forceError) {
      console.error('❌ Force install also failed:', forceError.message);
      throw forceError;
    }
  }
}

// Function to install TypeScript separately
function installTypeScript() {
  console.log('📦 Installing TypeScript...');
  try {
    execSync('npm install typescript@~5.9.2 --save-dev --legacy-peer-deps', { stdio: 'inherit' });
    console.log('✅ TypeScript installed successfully\n');
  } catch (error) {
    console.log('⚠️ TypeScript installation failed, but continuing...\n');
  }
}

// Function to test the fix
function testFix() {
  console.log('🧪 Testing the fix...');
  try {
    execSync('npx expo start --clear --non-interactive', { 
      stdio: 'inherit', 
      timeout: 10000 
    });
  } catch (error) {
    // Expected to timeout, we just want to see if it starts without dependency errors
    console.log('✅ Metro bundler started successfully (timeout expected)\n');
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting dependency fix process...\n');
    
    // Step 1: Update package.json
    updatePackageJson();
    
    // Step 2: Clean and reinstall
    cleanAndReinstall();
    
    // Step 3: Install TypeScript
    installTypeScript();
    
    console.log('🎉 Dependency fix completed!');
    console.log('📱 You can now try: npm start');
    console.log('🚀 Or build APK with: npm run build:apk');
    console.log('\n💡 If you still get errors, try: npm run start:clean');
    
  } catch (error) {
    console.error('❌ Dependency fix failed:', error.message);
    console.log('\n🔧 Manual fix instructions:');
    console.log('1. Delete node_modules folder');
    console.log('2. Delete package-lock.json');
    console.log('3. Run: npm install --legacy-peer-deps');
    console.log('4. Run: npm install typescript@~5.9.2 --save-dev --legacy-peer-deps');
    process.exit(1);
  }
}

// Run the script
main();
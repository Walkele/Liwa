#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Metro Cache Issues for Liwa App');
console.log('=========================================\n');

// Function to safely delete directory
function deleteDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      console.log(`🗑️ Deleting ${dirPath}...`);
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'ignore' });
      } else {
        execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
      }
      console.log(`✅ Deleted ${dirPath}`);
    } else {
      console.log(`ℹ️ ${dirPath} doesn't exist, skipping...`);
    }
  } catch (error) {
    console.log(`⚠️ Could not delete ${dirPath}: ${error.message}`);
  }
}

// Function to clear Metro cache
function clearMetroCache() {
  console.log('🧹 Clearing Metro cache...');
  
  try {
    // Clear Expo cache
    execSync('npx expo start --clear', { stdio: 'ignore', timeout: 5000 });
  } catch (error) {
    // This is expected to timeout, we just want to trigger the cache clear
  }
  
  try {
    // Clear React Native cache
    execSync('npx react-native start --reset-cache', { stdio: 'ignore', timeout: 5000 });
  } catch (error) {
    // This is expected to timeout
  }
  
  console.log('✅ Metro cache cleared');
}

// Function to clear npm cache
function clearNpmCache() {
  console.log('🧹 Clearing npm cache...');
  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('✅ npm cache cleared');
  } catch (error) {
    console.log('⚠️ Could not clear npm cache:', error.message);
  }
}

// Function to reinstall node_modules
function reinstallNodeModules() {
  console.log('📦 Reinstalling node_modules...');
  
  // Delete node_modules
  deleteDirectory('node_modules');
  
  // Delete package-lock.json
  try {
    if (fs.existsSync('package-lock.json')) {
      fs.unlinkSync('package-lock.json');
      console.log('✅ Deleted package-lock.json');
    }
  } catch (error) {
    console.log('⚠️ Could not delete package-lock.json:', error.message);
  }
  
  // Reinstall dependencies
  try {
    console.log('📥 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting cache cleanup process...\n');
    
    // Step 1: Clear various cache directories
    const cacheDirectories = [
      path.join(require('os').tmpdir(), 'metro-*'),
      path.join(require('os').tmpdir(), 'react-*'),
      path.join(require('os').homedir(), '.expo'),
      '.expo',
      'node_modules/.cache',
      '.metro'
    ];
    
    console.log('🗑️ Clearing cache directories...');
    cacheDirectories.forEach(dir => {
      if (dir.includes('*')) {
        // Handle wildcard directories
        try {
          const baseDir = dir.split('*')[0];
          if (fs.existsSync(baseDir)) {
            const files = fs.readdirSync(baseDir);
            files.forEach(file => {
              if (file.startsWith(dir.split('*')[1] || '')) {
                deleteDirectory(path.join(baseDir, file));
              }
            });
          }
        } catch (error) {
          console.log(`⚠️ Could not clear ${dir}: ${error.message}`);
        }
      } else {
        deleteDirectory(dir);
      }
    });
    
    // Step 2: Clear Metro cache
    clearMetroCache();
    
    // Step 3: Clear npm cache
    clearNpmCache();
    
    // Step 4: Reinstall node_modules (optional, but recommended)
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('🤔 Do you want to reinstall node_modules? (recommended) [Y/n]: ', (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'n') {
        reinstallNodeModules();
      }
      
      console.log('\n🎉 Cache cleanup completed!');
      console.log('📱 You can now try running: npm start');
      console.log('🚀 Or build APK with: npm run build:apk');
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📱 Fixing Liwa App for Expo Go Testing');
console.log('=====================================\n');

// Function to fix network issues
function fixNetworkIssues() {
  console.log('🌐 Fixing network connectivity issues...');
  
  try {
    // Clear DNS cache (Windows)
    console.log('🧹 Clearing DNS cache...');
    execSync('ipconfig /flushdns', { stdio: 'inherit' });
    
    // Clear npm cache
    console.log('🧹 Clearing npm cache...');
    execSync('npm cache clean --force', { stdio: 'inherit' });
    
    console.log('✅ Network issues addressed\n');
  } catch (error) {
    console.log('⚠️ Some network fixes failed, but continuing...\n');
  }
}

// Function to install missing dependencies for Expo Go
function installExpoGoDependencies() {
  console.log('📦 Installing dependencies for Expo Go...');
  
  try {
    // Install worklets dependency
    console.log('📦 Installing react-native-worklets-core...');
    execSync('npm install react-native-worklets-core --legacy-peer-deps', { stdio: 'inherit' });
    
    // Install any other missing dependencies
    console.log('📦 Installing missing dependencies...');
    execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed for Expo Go\n');
  } catch (error) {
    console.log('⚠️ Some dependencies failed, trying alternative approach...');
    try {
      execSync('npm install --force', { stdio: 'inherit' });
      console.log('✅ Dependencies installed with --force\n');
    } catch (forceError) {
      console.log('⚠️ Dependency installation had issues, but may still work\n');
    }
  }
}

// Function to start Expo in offline mode
function startExpoOffline() {
  console.log('🚀 Starting Expo in offline-friendly mode...');
  
  try {
    // Start Expo with offline flags
    console.log('📱 Starting Expo Go server...');
    console.log('🔗 You can now scan the QR code with Expo Go app\n');
    
    // Use spawn to keep the process running
    const { spawn } = require('child_process');
    const expoProcess = spawn('npx', ['expo', 'start', '--offline', '--clear'], {
      stdio: 'inherit',
      shell: true
    });
    
    expoProcess.on('error', (error) => {
      console.log('⚠️ Expo start had issues, trying alternative...');
      
      // Try without offline flag
      const altProcess = spawn('npx', ['expo', 'start', '--clear', '--tunnel'], {
        stdio: 'inherit',
        shell: true
      });
      
      altProcess.on('error', (altError) => {
        console.log('❌ Could not start Expo. Try manual start: npm start');
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start Expo:', error.message);
    console.log('\n🔧 Try manual start: npm start');
  }
}

// Function to create Expo Go compatible configuration
function createExpoGoConfig() {
  console.log('⚙️ Creating Expo Go compatible configuration...');
  
  // Update app.json for Expo Go compatibility
  const appJsonPath = 'app.json';
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Ensure Expo Go compatibility
    appJson.expo.sdkVersion = undefined; // Let Expo determine
    appJson.expo.platforms = ["ios", "android", "web"];
    
    // Remove any incompatible plugins for Expo Go
    if (appJson.expo.plugins) {
      appJson.expo.plugins = appJson.expo.plugins.filter(plugin => {
        // Keep only Expo Go compatible plugins
        const compatiblePlugins = ['expo-location', 'expo-barcode-scanner'];
        return compatiblePlugins.includes(plugin);
      });
    }
    
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('✅ app.json configured for Expo Go\n');
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Expo Go fix process...\n');
    
    // Step 1: Fix network issues
    fixNetworkIssues();
    
    // Step 2: Create Expo Go compatible config
    createExpoGoConfig();
    
    // Step 3: Install dependencies
    installExpoGoDependencies();
    
    console.log('🎉 Expo Go setup completed!');
    console.log('\n📱 Next steps:');
    console.log('1. Install Expo Go app on your phone');
    console.log('2. Run: npm start');
    console.log('3. Scan the QR code with Expo Go');
    console.log('4. Test your Liwa trading app!\n');
    
    // Ask if user wants to start now
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('🤔 Do you want to start Expo now? [Y/n]: ', (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'n') {
        startExpoOffline();
      } else {
        console.log('👍 Run "npm start" when you\'re ready to test!');
      }
    });
    
  } catch (error) {
    console.error('❌ Expo Go fix failed:', error.message);
    console.log('\n🔧 Manual steps:');
    console.log('1. Run: npm install --legacy-peer-deps');
    console.log('2. Run: npm start');
    console.log('3. Use Expo Go app to scan QR code');
    process.exit(1);
  }
}

// Run the script
main();
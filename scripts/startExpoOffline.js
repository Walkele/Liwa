#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('📱 Starting Expo in Offline Mode for Liwa App');
console.log('==============================================\n');

// Function to start Expo with offline flags
function startExpoOffline() {
  console.log('🚀 Starting Expo development server...');
  console.log('📱 This will bypass network dependency checks\n');
  
  // Try different offline approaches
  const startMethods = [
    {
      name: 'Offline Mode',
      command: 'npx',
      args: ['expo', 'start', '--offline', '--clear']
    },
    {
      name: 'Local Mode',
      command: 'npx',
      args: ['expo', 'start', '--localhost', '--clear']
    },
    {
      name: 'Basic Mode',
      command: 'npx',
      args: ['expo', 'start', '--clear', '--no-dev']
    },
    {
      name: 'Tunnel Mode',
      command: 'npx',
      args: ['expo', 'start', '--tunnel', '--clear']
    }
  ];
  
  let currentMethod = 0;
  
  function tryNextMethod() {
    if (currentMethod >= startMethods.length) {
      console.log('❌ All start methods failed. Try manual start: npm start');
      return;
    }
    
    const method = startMethods[currentMethod];
    console.log(`🔄 Trying ${method.name}...`);
    
    const expoProcess = spawn(method.command, method.args, {
      stdio: 'inherit',
      shell: true
    });
    
    expoProcess.on('error', (error) => {
      console.log(`⚠️ ${method.name} failed: ${error.message}`);
      currentMethod++;
      setTimeout(tryNextMethod, 1000);
    });
    
    expoProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`⚠️ ${method.name} exited with code ${code}`);
        currentMethod++;
        setTimeout(tryNextMethod, 1000);
      }
    });
    
    // If process starts successfully, it will keep running
    setTimeout(() => {
      console.log(`✅ ${method.name} appears to be running!`);
      console.log('📱 Open Expo Go app and scan the QR code');
    }, 5000);
  }
  
  tryNextMethod();
}

// Function to create offline-friendly app.json
function createOfflineConfig() {
  console.log('⚙️ Creating offline-friendly configuration...');
  
  const appJsonPath = 'app.json';
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Remove network-dependent configurations
    if (appJson.expo.updates) {
      delete appJson.expo.updates;
    }
    
    // Ensure offline compatibility
    appJson.expo.offline = true;
    
    fs.writeFileSync('app.offline.json', JSON.stringify(appJson, null, 2));
    console.log('✅ Created offline configuration\n');
  }
}

// Main execution
function main() {
  console.log('🚀 Starting offline Expo setup...\n');
  
  // Create offline config
  createOfflineConfig();
  
  // Start Expo offline
  startExpoOffline();
  
  console.log('💡 Tips:');
  console.log('- Make sure your phone and computer are on the same WiFi');
  console.log('- If QR code doesn\'t work, try the tunnel mode');
  console.log('- Press Ctrl+C to stop the server');
}

// Run the script
main();
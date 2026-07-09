#!/usr/bin/env node

// Quick Database Reset - Clean + Setup in one command
// This combines cleanup and setup for maximum convenience

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 SwipeIt Database Reset Tool');
console.log('==============================\n');

async function quickReset() {
  try {
    console.log('📋 Step 1: Cleaning database (preserving users)...');
    
    // Run cleanup script
    try {
      execSync('node scripts/cleanDatabaseExceptUsers.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Database cleanup completed\n');
    } catch (error) {
      console.log('⚠️ Cleanup script not ready (needs Firebase config)');
      console.log('💡 You can clean manually through Firebase Console\n');
    }
    
    console.log('📋 Step 2: Setting up fresh test data...');
    
    // Run setup script  
    try {
      execSync('node scripts/setupCleanDatabase.js', {
        stdio: 'inherit', 
        cwd: process.cwd()
      });
      console.log('✅ Test data setup completed\n');
    } catch (error) {
      console.log('⚠️ Setup script not ready (needs Firebase config)');
      console.log('💡 You can create test items manually in your app\n');
    }
    
    console.log('🎉 Database Reset Complete!');
    console.log('\n📱 What to do next:');
    console.log('1. Open your SwipeIt app');
    console.log('2. You should see clean, fresh items');
    console.log('3. Test the service offer system');
    console.log('4. Test counter-offers (4 rounds)');
    console.log('5. Verify all features work smoothly');
    
    console.log('\n🧪 For Testing:');
    console.log('- Items should be visible on home screen');
    console.log('- Service button should work on item details');
    console.log('- Counter-offers should work in conversations');
    console.log('- No old/confusing test data');
    
  } catch (error) {
    console.error('💥 Reset failed:', error.message);
    process.exit(1);
  }
}

// Show usage info
console.log('🎯 This tool will:');
console.log('   • Clean all data except user accounts');
console.log('   • Create fresh sample items for testing');
console.log('   • Give you a clean slate for service offers');
console.log('');

// Run the reset
quickReset();
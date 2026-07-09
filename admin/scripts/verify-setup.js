const fs = require('fs');
const path = require('path');

console.log('🔍 SwipeIt Admin Dashboard - Setup Verification\n');

// Check environment file
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  process.exit(1);
}

console.log('✅ Environment file exists');

// Read and check environment variables
const envContent = fs.readFileSync(envPath, 'utf8');
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'ADMIN_JWT_SECRET'
];

let allConfigured = true;

requiredVars.forEach(varName => {
  if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=demo-`) && !envContent.includes(`${varName}=YOUR_`)) {
    console.log(`✅ ${varName} configured`);
  } else {
    console.log(`❌ ${varName} needs configuration`);
    allConfigured = false;
  }
});

console.log('\n📋 Setup Status:');
if (allConfigured) {
  console.log('✅ All environment variables configured!');
  console.log('\n🚀 Next steps:');
  console.log('1. npm run create-admin  (create first admin user)');
  console.log('2. npm run dev          (start development server)');
  console.log('3. Open http://localhost:3001');
} else {
  console.log('⚠️  Some configuration needed');
  console.log('\n🔧 To complete setup:');
  console.log('1. Get your Firebase Admin SDK private key');
  console.log('2. Update .env.local with the correct values');
  console.log('3. Run this script again to verify');
}

console.log('\n📚 For detailed instructions, see: SETUP_GUIDE.md');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up SwipeIt Admin Dashboard...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('📝 Please copy .env.local.example to .env.local and configure your Firebase settings.\n');
  console.log('Steps:');
  console.log('1. Copy .env.local.example to .env.local');
  console.log('2. Replace demo values with your actual Firebase configuration');
  console.log('3. Add your Firebase Admin SDK private key');
  console.log('4. Set secure JWT and session secrets\n');
  process.exit(1);
}

console.log('✅ Environment file found');

// Check if Firebase config is properly set
const envContent = fs.readFileSync(envPath, 'utf8');
if (envContent.includes('demo-api-key') || envContent.includes('DEMO_PRIVATE_KEY_HERE')) {
  console.log('⚠️  Warning: You are using demo Firebase configuration!');
  console.log('📝 Please update .env.local with your actual Firebase settings.\n');
}

console.log('✅ Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Update .env.local with your Firebase configuration');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:3001');
console.log('4. Login with your admin credentials\n');

console.log('🔐 Default admin setup:');
console.log('- Create admin users in Firebase Firestore');
console.log('- Collection: "admins"');
console.log('- Document ID: admin email');
console.log('- Required fields: email, displayName, role, permissions, hashedPassword, isActive\n');

console.log('🎉 SwipeIt Admin Dashboard is ready!');
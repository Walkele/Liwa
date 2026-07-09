const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Debug environment variables
console.log('🔍 Environment Variables Check:');
console.log('FIREBASE_ADMIN_PROJECT_ID:', process.env.FIREBASE_ADMIN_PROJECT_ID);
console.log('FIREBASE_ADMIN_CLIENT_EMAIL:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
console.log('FIREBASE_ADMIN_PRIVATE_KEY exists:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: "100842412687790302939",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40liwach-19664.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

console.log('🔧 Service Account Config:', {
  project_id: serviceAccount.project_id,
  client_email: serviceAccount.client_email,
  has_private_key: !!serviceAccount.private_key
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

async function createAdminUser() {
  try {
    console.log('🔐 Creating SwipeIt Admin User...\n');

    // Admin user details
    const adminData = {
      email: 'admin@swipeit.com',
      password: 'SwipeIt2024!', // Change this password!
      displayName: 'SwipeIt Super Admin',
      role: 'super-admin',
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Create admin document
    const adminDoc = {
      email: adminData.email,
      displayName: adminData.displayName,
      role: adminData.role,
      permissions: ['*'], // Super admin has all permissions
      hashedPassword,
      createdAt: new Date(),
      lastLoginAt: null,
      isActive: true,
    };

    // Save to Firestore
    await db.collection('admins').doc(adminData.email).set(adminDoc);

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('\n🚀 You can now start the admin dashboard:');
    console.log('npm run dev');
    console.log('\nThen visit: http://localhost:3001');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    if (error.code === 'permission-denied') {
      console.log('\n🔧 Make sure your Firebase Admin SDK is properly configured:');
      console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
      console.log('2. Generate a new private key');
      console.log('3. Add the private key to your .env.local file');
    }
  }
}

// Run the script
createAdminUser();
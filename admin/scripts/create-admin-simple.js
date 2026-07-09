const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const bcrypt = require('bcryptjs');

console.log('🔐 Creating SwipeIt Admin User (Simple Method)...\n');

// Firebase config (same as your mobile app)
const firebaseConfig = {
  apiKey: "AIzaSyASdYNMUTiDGg2vZo3ZtjnMLqrvViEVJ2g",
  authDomain: "liwach-19664.firebaseapp.com",
  projectId: "liwach-19664",
  storageBucket: "liwach-19664.firebasestorage.app",
  messagingSenderId: "725653447622",
  appId: "1:725653447622:web:a8b9c58e80f15b1ae988c7"
};

async function createAdminUser() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

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
    await setDoc(doc(db, 'admins', adminData.email), adminDoc);

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
      console.log('\n🔧 This might be due to Firestore security rules.');
      console.log('You can create the admin user manually in Firebase Console:');
      console.log('\n1. Go to: https://console.firebase.google.com/project/liwach-19664/firestore');
      console.log('2. Create a new collection called "admins"');
      console.log('3. Add a document with ID: admin@swipeit.com');
      console.log('4. Add these fields:');
      console.log('   - email: "admin@swipeit.com"');
      console.log('   - displayName: "SwipeIt Super Admin"');
      console.log('   - role: "super-admin"');
      console.log('   - permissions: ["*"]');
      console.log('   - hashedPassword: "$2a$12$your_hashed_password_here"');
      console.log('   - isActive: true');
      console.log('   - createdAt: (current timestamp)');
    }
  }
}

// Run the script
createAdminUser();
#!/usr/bin/env node

// Setup Clean Database - After cleanup, create minimal test data
// This creates just enough data to test the service offer system

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc
} = require('firebase/firestore');

// You'll need to add your Firebase config here
const firebaseConfig = {
  // Add your Firebase config from src/config/firebase.js
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample items for testing service offers
const SAMPLE_ITEMS = [
  {
    title: 'iPhone 12 Pro',
    description: 'Excellent condition iPhone 12 Pro, 128GB',
    price: 800,
    category: 'Electronics',
    condition: 'Excellent',
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500'],
    status: 'available',
    isActive: true,
    isVisible: true,
    isAvailable: true,
    location: 'Downtown',
    createdAt: serverTimestamp()
  },
  {
    title: 'MacBook Air M1',
    description: 'Like new MacBook Air with M1 chip, perfect for work',
    price: 1200,
    category: 'Electronics', 
    condition: 'Like New',
    images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500'],
    status: 'available',
    isActive: true,
    isVisible: true,
    isAvailable: true,
    location: 'Midtown',
    createdAt: serverTimestamp()
  },
  {
    title: 'Gaming Chair',
    description: 'Comfortable gaming chair, barely used',
    price: 200,
    category: 'Furniture',
    condition: 'Good',
    images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500'],
    status: 'available',
    isActive: true,
    isVisible: true,
    isAvailable: true,
    location: 'Uptown',
    createdAt: serverTimestamp()
  }
];

async function createSampleItems(userId, userName) {
  console.log(`📦 Creating sample items for user: ${userName}`);
  
  let createdCount = 0;
  
  for (const itemData of SAMPLE_ITEMS) {
    try {
      const itemWithUser = {
        ...itemData,
        userId: userId,
        userName: userName,
        userEmail: `${userName.toLowerCase().replace(' ', '')}@example.com`
      };
      
      const docRef = await addDoc(collection(db, 'items'), itemWithUser);
      console.log(`   ✅ Created: ${itemData.title} (${docRef.id})`);
      createdCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed to create ${itemData.title}:`, error.message);
    }
  }
  
  return createdCount;
}

async function setupCleanDatabase() {
  console.log('🏗️ Setting Up Clean Database with Sample Data');
  console.log('==============================================\n');
  
  try {
    // Get existing users to assign items to them
    const { getDocs } = require('firebase/firestore');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    if (usersSnapshot.empty) {
      console.log('👥 No users found. Please create user accounts first.');
      console.log('💡 Sign up in your app to create user accounts, then run this script.');
      return;
    }
    
    console.log(`👥 Found ${usersSnapshot.size} users`);
    
    let totalItems = 0;
    let userCount = 0;
    
    // Create sample items for each user (max 3 users to avoid clutter)
    for (const userDoc of usersSnapshot.docs.slice(0, 3)) {
      const userData = userDoc.data();
      const userName = userData.name || userData.displayName || `User ${userCount + 1}`;
      
      console.log(`\n👤 Setting up items for: ${userName}`);
      const itemsCreated = await createSampleItems(userDoc.id, userName);
      totalItems += itemsCreated;
      userCount++;
    }
    
    console.log('\n🎉 Clean Database Setup Complete!');
    console.log(`📊 Created ${totalItems} sample items`);
    console.log(`👥 For ${userCount} users`);
    console.log('\n✨ Your database is ready for testing service offers!');
    
    console.log('\n🧪 Next Steps:');
    console.log('1. Open your app');
    console.log('2. You should see the sample items on the home screen');
    console.log('3. Click on an item and test the Service button');
    console.log('4. Test the complete service offer workflow');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    throw error;
  }
}

// Run the setup
setupCleanDatabase()
  .then(() => {
    console.log('\n🏁 Setup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup script failed:', error);
    process.exit(1);
  });
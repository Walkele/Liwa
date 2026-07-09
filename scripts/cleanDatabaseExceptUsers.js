#!/usr/bin/env node

// Clean Database Script - Preserves Users Only
// This script will clean all collections except 'users' to give you a fresh start

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch,
  query,
  limit
} = require('firebase/firestore');

// You'll need to add your Firebase config here
const firebaseConfig = {
  // Add your Firebase config from src/config/firebase.js
  // This script needs to run with admin privileges
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections to clean (everything except users)
const COLLECTIONS_TO_CLEAN = [
  'items',
  'conversations', 
  'messages',
  'offers',
  'trades',
  'notifications',
  'serviceOffers',
  'acceptedServices',
  'counterOffers',
  'tradeHistory',
  'archivedItems'
];

async function cleanCollection(collectionName) {
  console.log(`🧹 Cleaning collection: ${collectionName}`);
  
  try {
    let deletedCount = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Get documents in batches of 100
      const q = query(collection(db, collectionName), limit(100));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      // Use batch delete for efficiency
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((docSnapshot) => {
        batch.delete(doc(db, collectionName, docSnapshot.id));
        deletedCount++;
      });
      
      await batch.commit();
      console.log(`   Deleted ${snapshot.docs.length} documents from ${collectionName}`);
      
      // If we got less than 100 docs, we're done
      if (snapshot.docs.length < 100) {
        hasMore = false;
      }
    }
    
    console.log(`✅ Cleaned ${collectionName}: ${deletedCount} documents deleted`);
    return deletedCount;
    
  } catch (error) {
    console.error(`❌ Error cleaning ${collectionName}:`, error.message);
    return 0;
  }
}

async function cleanDatabase() {
  console.log('🚀 Starting Database Cleanup (Preserving Users)');
  console.log('================================================\n');
  
  let totalDeleted = 0;
  
  // Clean each collection
  for (const collectionName of COLLECTIONS_TO_CLEAN) {
    const deleted = await cleanCollection(collectionName);
    totalDeleted += deleted;
    console.log(''); // Add spacing
  }
  
  // Check users collection (don't delete, just count)
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`👥 Users preserved: ${usersSnapshot.size} user accounts`);
  } catch (error) {
    console.log('👥 Users collection: Unable to count (may not exist yet)');
  }
  
  console.log('\n🎉 Database Cleanup Complete!');
  console.log(`📊 Total documents deleted: ${totalDeleted}`);
  console.log('👥 User accounts: PRESERVED');
  console.log('\n✨ Your database is now clean and ready for fresh testing!');
}

// Run the cleanup
cleanDatabase()
  .then(() => {
    console.log('\n🏁 Cleanup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup script failed:', error);
    process.exit(1);
  });
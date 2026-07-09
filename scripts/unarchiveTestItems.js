// Unarchive Test Items Script
// This script will unarchive some test items so you can test the service offer system

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  // This should match the config in src/config/firebase.js
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function unarchiveTestItems() {
  try {
    console.log('🔍 Finding archived items to unarchive...');
    
    // Find archived items
    const itemsQuery = query(
      collection(db, 'items'),
      where('status', '==', 'archived')
    );
    
    const snapshot = await getDocs(itemsQuery);
    console.log(`📦 Found ${snapshot.docs.length} archived items`);
    
    if (snapshot.docs.length === 0) {
      console.log('ℹ️ No archived items found to unarchive');
      return;
    }
    
    // Unarchive up to 3 items for testing
    const itemsToUnarchive = snapshot.docs.slice(0, 3);
    
    for (const itemDoc of itemsToUnarchive) {
      const itemData = itemDoc.data();
      
      console.log(`📝 Unarchiving item: ${itemData.title} (${itemDoc.id})`);
      
      await updateDoc(doc(db, 'items', itemDoc.id), {
        status: 'available',
        isActive: true,
        isAvailable: true,
        isVisible: true,
        updatedAt: new Date()
      });
      
      console.log(`✅ Unarchived: ${itemData.title}`);
    }
    
    console.log(`🎉 Successfully unarchived ${itemsToUnarchive.length} items!`);
    console.log('📱 You can now test the service offer system with these items');
    
  } catch (error) {
    console.error('❌ Error unarchiving items:', error);
  }
}

// Run the script
unarchiveTestItems();
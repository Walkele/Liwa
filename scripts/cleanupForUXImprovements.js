// Cleanup script for UX improvements testing
// Run this to clean data and experience the new features properly

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  query,
  where 
} from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  // Add your config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupForUXImprovements() {
  console.log('🧹 Starting UX improvements cleanup...');
  
  try {
    // 1. Clean up old bilateral confirmation documents
    console.log('📋 Cleaning bilateral confirmation documents...');
    const confirmationsQuery = query(collection(db, 'tradeStepConfirmations'));
    const confirmationsSnapshot = await getDocs(confirmationsQuery);
    
    const batch1 = writeBatch(db);
    confirmationsSnapshot.docs.forEach(doc => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();
    console.log(`✅ Deleted ${confirmationsSnapshot.size} old confirmation documents`);
    
    // 2. Reset items to proper active status
    console.log('📦 Resetting item statuses...');
    const itemsQuery = query(collection(db, 'items'));
    const itemsSnapshot = await getDocs(itemsQuery);
    
    const batch2 = writeBatch(db);
    itemsSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      
      // Reset all items to active status for testing
      batch2.update(docSnapshot.ref, {
        status: 'available',
        isActive: true,
        isAvailable: true,
        isVisible: true,
        // Remove archive fields
        archivedAt: null,
        archiveReason: null,
        tradeDetails: null,
        originalStatus: null
      });
    });
    await batch2.commit();
    console.log(`✅ Reset ${itemsSnapshot.size} items to active status`);
    
    // 3. Clean up old trade messages that might have inconsistent states
    console.log('💬 Cleaning trade messages...');
    const messagesQuery = query(
      collection(db, 'messages'),
      where('messageType', 'in', ['counter_offer', 'trade_proposal', 'bilateral_confirmation'])
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const batch3 = writeBatch(db);
    messagesSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      
      // Reset trade messages to clean state
      if (data.messageType === 'counter_offer' || data.messageType === 'trade_proposal') {
        batch3.update(docSnapshot.ref, {
          // Reset progression fields
          sellerCommitCompleted: false,
          contactExchangeUnlocked: false,
          currentStep: 'seller_commit',
          tradeStage: data.status === 'accepted' ? 'accepted' : 'pending',
          lastProgressUpdate: null,
          stepUnlocked: false
        });
      }
    });
    await batch3.commit();
    console.log(`✅ Cleaned ${messagesSnapshot.size} trade messages`);
    
    // 4. Remove old system messages that might be confusing
    console.log('🗑️ Removing old system messages...');
    const systemMessagesQuery = query(
      collection(db, 'messages'),
      where('messageType', 'in', ['bilateral_confirmation', 'contact_shared', 'trade_completion'])
    );
    const systemMessagesSnapshot = await getDocs(systemMessagesQuery);
    
    const batch4 = writeBatch(db);
    systemMessagesSnapshot.docs.forEach(doc => {
      batch4.delete(doc.ref);
    });
    await batch4.commit();
    console.log(`✅ Removed ${systemMessagesSnapshot.size} old system messages`);
    
    console.log('🎉 UX improvements cleanup completed!');
    console.log('\n📋 What was cleaned:');
    console.log('✅ Bilateral confirmation documents');
    console.log('✅ Item statuses reset to active');
    console.log('✅ Trade message states reset');
    console.log('✅ Old system messages removed');
    console.log('\n🚀 You can now test the new UX improvements with clean data!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupForUXImprovements();
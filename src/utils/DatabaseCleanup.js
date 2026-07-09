import { collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const cleanupDatabase = async () => {
  console.log('🧹 Starting database cleanup...');
  
  const collectionsToClean = [
    'acceptedOffers',
    'tradeProposals', 
    'tradeActivities',
    'offers',
    'conversations',
    'messages',
    'ratings',
    'swipes',
    'likes',
    'matches'
  ];

  let totalDeleted = 0;

  try {
    for (const collectionName of collectionsToClean) {
      console.log(`🗑️ Cleaning collection: ${collectionName}`);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      console.log(`📊 Found ${snapshot.docs.length} documents in ${collectionName}`);
      
      // Delete documents in batches to avoid overwhelming Firebase
      const batchSize = 10;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (doc) => {
            try {
              await deleteDoc(doc.ref);
              totalDeleted++;
            } catch (error) {
              console.error(`❌ Error deleting document ${doc.id}:`, error);
            }
          })
        );
        
        console.log(`✅ Deleted batch ${Math.floor(i/batchSize) + 1} from ${collectionName}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Finished cleaning ${collectionName}`);
    }
    
    console.log(`🎉 Database cleanup complete! Deleted ${totalDeleted} documents total.`);
    return { success: true, deletedCount: totalDeleted };
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    return { success: false, error: error.message };
  }
};

export const cleanupSpecificCollections = async (collections) => {
  console.log('🧹 Starting selective database cleanup...');
  
  let totalDeleted = 0;

  try {
    for (const collectionName of collections) {
      console.log(`🗑️ Cleaning collection: ${collectionName}`);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      console.log(`📊 Found ${snapshot.docs.length} documents in ${collectionName}`);
      
      for (const doc of snapshot.docs) {
        try {
          await deleteDoc(doc.ref);
          totalDeleted++;
        } catch (error) {
          console.error(`❌ Error deleting document ${doc.id}:`, error);
        }
      }
      
      console.log(`✅ Finished cleaning ${collectionName}`);
    }
    
    console.log(`🎉 Selective cleanup complete! Deleted ${totalDeleted} documents.`);
    return { success: true, deletedCount: totalDeleted };
    
  } catch (error) {
    console.error('❌ Error during selective cleanup:', error);
    return { success: false, error: error.message };
  }
};
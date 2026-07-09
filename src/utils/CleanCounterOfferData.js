import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class CleanCounterOfferData {
  
  // Clean only counter-offer related data (keeps everything else)
  static async cleanCounterOfferDataOnly() {
    try {
      console.log('🧹 Starting targeted counter-offer data cleanup...');
      let deletedCount = 0;
      
      // 1. Delete counter-offer messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('messageType', '==', 'counter_offer')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      console.log(`Found ${messagesSnapshot.docs.length} counter-offer messages to delete`);
      
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(doc(db, 'messages', messageDoc.id));
        deletedCount++;
      }
      
      // 2. Delete counter-offer documents from offers collection
      const offersQuery = query(
        collection(db, 'offers'),
        where('isCounterOffer', '==', true)
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      console.log(`Found ${offersSnapshot.docs.length} counter-offer documents to delete`);
      
      for (const offerDoc of offersSnapshot.docs) {
        await deleteDoc(doc(db, 'offers', offerDoc.id));
        deletedCount++;
      }
      
      console.log(`✅ Cleaned ${deletedCount} counter-offer related documents`);
      console.log('✅ All other data (items, users, conversations, trade proposals) preserved');
      
      return { 
        success: true, 
        deletedCount,
        message: `Cleaned ${deletedCount} counter-offer documents. Other data preserved.`
      };
      
    } catch (error) {
      console.error('❌ Error cleaning counter-offer data:', error);
      throw error;
    }
  }
  
  // Clean counter-offer data for a specific conversation only
  static async cleanCounterOfferDataForConversation(conversationId) {
    try {
      console.log('🧹 Cleaning counter-offer data for conversation:', conversationId);
      let deletedCount = 0;
      
      // Delete counter-offer messages for this conversation
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'counter_offer')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(doc(db, 'messages', messageDoc.id));
        deletedCount++;
      }
      
      console.log(`✅ Cleaned ${deletedCount} counter-offer messages for conversation`);
      
      return { 
        success: true, 
        deletedCount,
        message: `Cleaned ${deletedCount} counter-offer messages from this conversation.`
      };
      
    } catch (error) {
      console.error('❌ Error cleaning conversation counter-offer data:', error);
      throw error;
    }
  }
}
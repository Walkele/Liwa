import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fix existing counter-offers that were incorrectly marked as "countered"
 * This utility fixes counter-offers that were created before the bug fix
 */
export class FixExistingCounterOffers {
  
  /**
   * Fix counter-offers in a specific conversation
   */
  static async fixCounterOffersInConversation(conversationId) {
    try {
      console.log('🔧 Fixing counter-offers in conversation:', conversationId);
      
      // Find all counter-offers that were incorrectly marked as "countered"
      const counterOffersQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'counter_offer'),
        where('status', '==', 'countered')
      );
      
      const snapshot = await getDocs(counterOffersQuery);
      console.log(`🔍 Found ${snapshot.docs.length} counter-offers to potentially fix`);
      
      let fixedCount = 0;
      
      for (const counterOfferDoc of snapshot.docs) {
        const counterOffer = counterOfferDoc.data();
        
        // Check if this counter-offer should actually be pending
        // (i.e., it's the most recent counter-offer and hasn't been responded to)
        const isLatestCounterOffer = await this.isLatestCounterOffer(conversationId, counterOfferDoc.id, counterOffer.createdAt);
        
        if (isLatestCounterOffer) {
          // Fix this counter-offer by setting it to pending
          await updateDoc(doc(db, 'messages', counterOfferDoc.id), {
            status: 'pending'
          });
          
          console.log(`✅ Fixed counter-offer ${counterOfferDoc.id} - set to pending`);
          fixedCount++;
        } else {
          console.log(`⏭️ Skipping counter-offer ${counterOfferDoc.id} - not the latest`);
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount} counter-offers in conversation ${conversationId}`);
      return fixedCount;
      
    } catch (error) {
      console.error('❌ Error fixing counter-offers:', error);
      throw error;
    }
  }
  
  /**
   * Check if a counter-offer is the latest one in the conversation
   */
  static async isLatestCounterOffer(conversationId, counterOfferId, counterOfferCreatedAt) {
    try {
      // Find all trade messages after this counter-offer
      const laterMessagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', 'in', ['trade_proposal', 'counter_offer'])
      );
      
      const snapshot = await getDocs(laterMessagesQuery);
      
      // Check if there are any messages created after this counter-offer
      const counterOfferTime = counterOfferCreatedAt?.toDate?.() || counterOfferCreatedAt;
      
      for (const doc of snapshot.docs) {
        const msg = doc.data();
        const msgTime = msg.createdAt?.toDate?.() || msg.createdAt;
        
        // If we find a message created after this counter-offer, it's not the latest
        if (doc.id !== counterOfferId && msgTime > counterOfferTime) {
          return false;
        }
      }
      
      return true; // This is the latest counter-offer
      
    } catch (error) {
      console.error('❌ Error checking if counter-offer is latest:', error);
      return false;
    }
  }
  
  /**
   * Fix all counter-offers across all conversations (use with caution)
   */
  static async fixAllCounterOffers() {
    try {
      console.log('🔧 Starting global counter-offer fix...');
      
      // Find all counter-offers marked as "countered"
      const allCounterOffersQuery = query(
        collection(db, 'messages'),
        where('messageType', '==', 'counter_offer'),
        where('status', '==', 'countered')
      );
      
      const snapshot = await getDocs(allCounterOffersQuery);
      console.log(`🔍 Found ${snapshot.docs.length} counter-offers to check globally`);
      
      // Group by conversation
      const conversationGroups = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!conversationGroups[data.conversationId]) {
          conversationGroups[data.conversationId] = [];
        }
        conversationGroups[data.conversationId].push({ id: doc.id, data });
      });
      
      let totalFixed = 0;
      
      // Fix each conversation
      for (const conversationId of Object.keys(conversationGroups)) {
        const fixed = await this.fixCounterOffersInConversation(conversationId);
        totalFixed += fixed;
      }
      
      console.log(`🎉 Global fix complete! Fixed ${totalFixed} counter-offers across ${Object.keys(conversationGroups).length} conversations`);
      return totalFixed;
      
    } catch (error) {
      console.error('❌ Error in global counter-offer fix:', error);
      throw error;
    }
  }
}

// Quick fix function for immediate use
export const quickFixCounterOffers = async (conversationId) => {
  return await FixExistingCounterOffers.fixCounterOffersInConversation(conversationId);
};
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FixCounterOfferMessages {
  
  // Fix existing counter-offer messages that are missing targetUserId
  static async fixExistingCounterOfferMessages() {
    try {
      console.log('🔧 Starting to fix existing counter-offer messages...');
      
      // Find all counter-offer messages without targetUserId
      const messagesQuery = query(
        collection(db, 'messages'),
        where('messageType', '==', 'counter_offer')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      let fixedCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        
        // Skip if targetUserId is already set
        if (messageData.targetUserId) {
          continue;
        }
        
        console.log('🔍 Fixing message:', messageDoc.id);
        
        // Determine targetUserId from conversationId
        let targetUserId = null;
        const conversationId = messageData.conversationId;
        const senderId = messageData.senderId;
        
        if (conversationId && conversationId.includes('_')) {
          const parts = conversationId.split('_');
          if (parts.length >= 2) {
            // Find the user ID that's not the sender
            targetUserId = parts[0] === senderId ? parts[1] : parts[0];
          }
        }
        
        if (targetUserId) {
          await updateDoc(doc(db, 'messages', messageDoc.id), {
            targetUserId: targetUserId,
            status: messageData.status || 'active' // Ensure status is set
          });
          
          console.log(`✅ Fixed message ${messageDoc.id}: targetUserId = ${targetUserId}`);
          fixedCount++;
        } else {
          console.log(`❌ Could not determine targetUserId for message ${messageDoc.id}`);
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount} counter-offer messages`);
      return { success: true, fixedCount };
      
    } catch (error) {
      console.error('❌ Error fixing counter-offer messages:', error);
      throw error;
    }
  }
  
  // Fix a specific conversation's counter-offer messages
  static async fixCounterOfferMessagesForConversation(conversationId) {
    try {
      console.log('🔧 Fixing counter-offer messages for conversation:', conversationId);
      
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'counter_offer')
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      let fixedCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        
        // Skip if targetUserId is already set
        if (messageData.targetUserId) {
          continue;
        }
        
        // Determine targetUserId from conversationId
        let targetUserId = null;
        const senderId = messageData.senderId;
        
        if (conversationId.includes('_')) {
          const parts = conversationId.split('_');
          if (parts.length >= 2) {
            // Find the user ID that's not the sender
            targetUserId = parts[0] === senderId ? parts[1] : parts[0];
          }
        }
        
        if (targetUserId) {
          await updateDoc(doc(db, 'messages', messageDoc.id), {
            targetUserId: targetUserId,
            status: messageData.status || 'active'
          });
          
          console.log(`✅ Fixed message ${messageDoc.id}: targetUserId = ${targetUserId}`);
          fixedCount++;
        }
      }
      
      return { success: true, fixedCount };
      
    } catch (error) {
      console.error('❌ Error fixing conversation counter-offer messages:', error);
      throw error;
    }
  }
}
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fix counter-offer messages that have incorrect targetUserId
 */
export const fixCounterOfferTargetUserId = async (conversationId, correctTargetUserId) => {
  try {
    console.log('🔧 Fixing counter-offer targetUserId for conversation:', conversationId);
    
    // Find counter-offer messages with targetUserId = "system"
    const counterOffersQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      where('messageType', '==', 'counter_offer'),
      where('targetUserId', '==', 'system')
    );

    const snapshot = await getDocs(counterOffersQuery);
    
    if (snapshot.empty) {
      console.log('🔧 No counter-offers with system targetUserId found');
      return;
    }

    console.log(`🔧 Found ${snapshot.docs.length} counter-offers to fix`);

    // Update each counter-offer
    const updatePromises = snapshot.docs.map(async (docSnapshot) => {
      const messageRef = doc(db, 'messages', docSnapshot.id);
      await updateDoc(messageRef, {
        targetUserId: correctTargetUserId
      });
      
      console.log('🔧 Fixed counter-offer:', docSnapshot.id, 'targetUserId now:', correctTargetUserId);
    });

    await Promise.all(updatePromises);
    
    console.log('✅ All counter-offers fixed!');
    return true;
  } catch (error) {
    console.error('❌ Error fixing counter-offer targetUserId:', error);
    return false;
  }
};

/**
 * Debug function to show all messages in a conversation
 */
export const debugConversationMessages = async (conversationId) => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );

    const snapshot = await getDocs(messagesQuery);
    
    console.log(`🔍 Conversation ${conversationId} has ${snapshot.docs.length} messages:`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.messageType}:`, {
        id: doc.id,
        senderId: data.senderId,
        targetUserId: data.targetUserId,
        status: data.status,
        cashAmount: data.cashAmount || data.newTerms?.cashAmount,
        text: data.text
      });
    });
  } catch (error) {
    console.error('❌ Error debugging conversation:', error);
  }
};
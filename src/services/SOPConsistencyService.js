import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export class SOPConsistencyService {
  
  // Fix SOP inconsistencies across all conversations and messages
  static async fixSOPInconsistencies(userId) {
    try {
      console.log('🔧 Starting SOP consistency fix for user:', userId);
      
      const batch = writeBatch(db);
      let fixCount = 0;
      
      // Get all conversations for the user
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      
      const conversationsSnapshot = await getDocs(conversationsQuery);
      
      for (const conversationDoc of conversationsSnapshot.docs) {
        const conversationId = conversationDoc.id;
        
        // Get all messages for this conversation
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          ...doc.data()
        }));
        
        // Find system messages that need fixing
        const systemMessages = messages.filter(msg => 
          msg.isSystemMessage && 
          (msg.text?.includes('proposed a trade') || 
           msg.text?.includes('Cash Offer') ||
           msg.text?.includes('accepted!') ||
           msg.text?.includes('declined'))
        );
        
        for (const message of systemMessages) {
          let needsUpdate = false;
          const updates = {};
          
          // Fix trade proposal messages
          if (message.text?.includes('proposed a trade')) {
            if (!message.tradeStatus && !message.status) {
              updates.tradeStatus = 'pending';
              updates.status = 'pending';
              updates.messageType = 'trade_proposal';
              needsUpdate = true;
            }
          }
          
          // Fix cash offer messages
          if (message.text?.includes('Cash Offer')) {
            if (!message.status) {
              updates.status = 'pending';
              updates.messageType = 'cash_offer';
              needsUpdate = true;
            }
          }
          
          // Fix accepted messages
          if (message.text?.includes('accepted!')) {
            if (message.tradeStatus !== 'accepted' || message.status !== 'accepted') {
              updates.tradeStatus = 'accepted';
              updates.status = 'accepted';
              needsUpdate = true;
            }
          }
          
          // Fix declined messages
          if (message.text?.includes('declined')) {
            if (message.tradeStatus !== 'declined' || message.status !== 'declined') {
              updates.tradeStatus = 'declined';
              updates.status = 'declined';
              needsUpdate = true;
            }
          }
          
          if (needsUpdate) {
            batch.update(message.ref, {
              ...updates,
              fixedAt: serverTimestamp(),
              fixedBy: 'SOPConsistencyService'
            });
            fixCount++;
          }
        }
      }
      
      // Commit all fixes
      if (fixCount > 0) {
        await batch.commit();
        console.log(`✅ Fixed ${fixCount} SOP inconsistencies`);
      } else {
        console.log('✅ No SOP inconsistencies found');
      }
      
      return { success: true, fixCount };
      
    } catch (error) {
      console.error('❌ Error fixing SOP inconsistencies:', error);
      throw error;
    }
  }
  
  // Ensure message has proper status fields for UI consistency
  static async ensureMessageStatus(messageId, messageType, status) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }
      
      const messageData = messageDoc.data();
      const updates = {};
      
      // Ensure consistent status fields
      if (messageData.tradeStatus !== status) {
        updates.tradeStatus = status;
      }
      
      if (messageData.status !== status) {
        updates.status = status;
      }
      
      if (messageData.messageType !== messageType) {
        updates.messageType = messageType;
      }
      
      if (Object.keys(updates).length > 0) {
        updates.statusUpdatedAt = serverTimestamp();
        await updateDoc(messageRef, updates);
        console.log(`✅ Updated message status: ${messageId} -> ${status}`);
      }
      
      return { success: true, updated: Object.keys(updates).length > 0 };
      
    } catch (error) {
      console.error('❌ Error ensuring message status:', error);
      throw error;
    }
  }
  
  // Create system message with proper status fields
  static async createSystemMessage(conversationId, text, messageType, status, additionalData = {}) {
    try {
      const messageData = {
        conversationId,
        senderId: 'system',
        senderName: 'SwipeIt System',
        text,
        messageType,
        isSystemMessage: true,
        tradeStatus: status,
        status: status,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true,
        ...additionalData
      };
      
      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      console.log(`✅ Created system message: ${messageRef.id} with status: ${status}`);
      
      return { success: true, messageId: messageRef.id };
      
    } catch (error) {
      console.error('❌ Error creating system message:', error);
      throw error;
    }
  }
  
  // Update conversation status after trade action
  static async updateConversationStatus(conversationId, status, lastMessage) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      
      await updateDoc(conversationRef, {
        tradeStatus: status,
        lastMessage: lastMessage,
        lastMessageAt: serverTimestamp(),
        statusUpdatedAt: serverTimestamp()
      });
      
      console.log(`✅ Updated conversation status: ${conversationId} -> ${status}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating conversation status:', error);
      throw error;
    }
  }
  
  // Validate message consistency before rendering
  static validateMessageForUI(message) {
    const validation = {
      isValid: true,
      issues: [],
      shouldShowButtons: false,
      status: 'unknown'
    };
    
    // Check if it's a system message
    if (!message.isSystemMessage) {
      validation.status = 'user_message';
      return validation;
    }
    
    // Determine message type
    let messageType = 'unknown';
    if (message.text?.includes('proposed a trade') || message.messageType === 'trade_proposal') {
      messageType = 'trade_proposal';
    } else if (message.text?.includes('Cash Offer') || message.messageType === 'cash_offer') {
      messageType = 'cash_offer';
    }
    
    // Determine status from multiple sources
    let status = 'pending';
    if (message.text?.includes('accepted!')) {
      status = 'accepted';
    } else if (message.text?.includes('declined')) {
      status = 'declined';
    } else if (message.text?.includes('ITEMS LOCKED')) {
      status = 'locked';
    } else if (message.tradeStatus) {
      status = message.tradeStatus;
    } else if (message.status) {
      status = message.status;
    }
    
    // Check for inconsistencies
    if (message.tradeStatus && message.status && message.tradeStatus !== message.status) {
      validation.issues.push('Status field mismatch');
      validation.isValid = false;
    }
    
    // Determine if buttons should show
    validation.shouldShowButtons = (
      messageType === 'trade_proposal' || messageType === 'cash_offer'
    ) && status === 'pending';
    
    validation.status = status;
    validation.messageType = messageType;
    
    return validation;
  }
  
  // Fix specific conversation's message statuses
  static async fixConversationMessages(conversationId) {
    try {
      console.log('🔧 Fixing messages for conversation:', conversationId);
      
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      let fixCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const message = messageDoc.data();
        const validation = this.validateMessageForUI(message);
        
        if (!validation.isValid || validation.issues.length > 0) {
          const updates = {
            tradeStatus: validation.status,
            status: validation.status,
            messageType: validation.messageType,
            fixedAt: serverTimestamp(),
            fixedBy: 'SOPConsistencyService'
          };
          
          batch.update(messageDoc.ref, updates);
          fixCount++;
        }
      }
      
      if (fixCount > 0) {
        await batch.commit();
        console.log(`✅ Fixed ${fixCount} messages in conversation ${conversationId}`);
      }
      
      return { success: true, fixCount };
      
    } catch (error) {
      console.error('❌ Error fixing conversation messages:', error);
      throw error;
    }
  }
  
  // Get SOP state summary for debugging
  static async getSOPStateSummary(userId) {
    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      
      const conversationsSnapshot = await getDocs(conversationsQuery);
      const summary = {
        totalConversations: conversationsSnapshot.size,
        conversationStates: {},
        messageIssues: []
      };
      
      for (const conversationDoc of conversationsSnapshot.docs) {
        const conversationId = conversationDoc.id;
        const conversationData = conversationDoc.data();
        
        // Get messages for this conversation
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = messagesSnapshot.docs.map(doc => doc.data());
        
        const systemMessages = messages.filter(msg => msg.isSystemMessage);
        const proposalMessages = systemMessages.filter(msg => 
          msg.text?.includes('proposed a trade') || msg.text?.includes('Cash Offer')
        );
        
        summary.conversationStates[conversationId] = {
          itemTitle: conversationData.itemTitle,
          totalMessages: messages.length,
          systemMessages: systemMessages.length,
          proposalMessages: proposalMessages.length,
          lastStatus: conversationData.tradeStatus || 'unknown'
        };
        
        // Check for message issues
        for (const message of systemMessages) {
          const validation = this.validateMessageForUI(message);
          if (!validation.isValid) {
            summary.messageIssues.push({
              conversationId,
              messageId: message.id,
              issues: validation.issues
            });
          }
        }
      }
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error getting SOP state summary:', error);
      throw error;
    }
  }
}
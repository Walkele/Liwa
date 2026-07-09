import { doc, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ConversationLifecycleService {
  
  // Mark conversation as completed when trade is archived
  static async markConversationCompleted(conversationId, tradeDetails = {}) {
    try {
      console.log(`💬 Marking conversation ${conversationId} as completed`);
      
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        console.log('⚠️ Conversation not found, skipping completion');
        return { success: false, reason: 'conversation_not_found' };
      }
      
      const conversationData = conversationDoc.data();
      
      // Update conversation status
      await updateDoc(conversationRef, {
        status: 'completed',
        isActive: false,
        canSendMessages: false,
        completedAt: serverTimestamp(),
        completionReason: tradeDetails.reason || 'trade_completed',
        tradeDetails: {
          tradeId: tradeDetails.tradeId,
          itemIds: tradeDetails.itemIds || [],
          participants: tradeDetails.participants || [],
          tradeValue: tradeDetails.tradeValue,
          completedAt: tradeDetails.completedAt || serverTimestamp(),
          ...tradeDetails
        },
        lastUpdated: serverTimestamp()
      });
      
      // Add completion message to conversation
      await this.addCompletionMessage(conversationId, tradeDetails);
      
      console.log(`✅ Conversation ${conversationId} marked as completed`);
      
      return {
        success: true,
        conversationId,
        completedAt: new Date(),
        tradeDetails
      };
      
    } catch (error) {
      console.error(`❌ Error marking conversation as completed:`, error);
      throw error;
    }
  }
  
  // Add a system message indicating trade completion
  static async addCompletionMessage(conversationId, tradeDetails) {
    try {
      const completionMessage = this.generateCompletionMessage(tradeDetails);
      
      const messageData = {
        conversationId,
        senderId: 'system',
        senderName: 'SwipeIt System',
        text: completionMessage.text,
        type: 'system_completion',
        messageType: 'trade_completion',
        timestamp: serverTimestamp(),
        isSystemMessage: true,
        completionData: {
          reason: tradeDetails.reason || 'trade_completed',
          tradeId: tradeDetails.tradeId,
          itemTitles: tradeDetails.itemTitles || [],
          participants: tradeDetails.participants || [],
          tradeValue: tradeDetails.tradeValue,
          icon: completionMessage.icon,
          color: completionMessage.color
        },
        metadata: {
          canReply: false,
          isArchived: false,
          priority: 'high'
        }
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      console.log(`📨 Added completion message to conversation ${conversationId}`);
      
    } catch (error) {
      console.error('❌ Error adding completion message:', error);
    }
  }
  
  // Generate appropriate completion message based on trade details
  static generateCompletionMessage(tradeDetails) {
    const reason = tradeDetails.reason || 'trade_completed';
    
    switch (reason) {
      case 'trade_completed':
      case 'traded':
        return {
          text: `🎉 Trade Completed Successfully!\n\n` +
                `This conversation has been archived as the trade has been completed. ` +
                `You can still view this conversation history in your Messages, but no new messages can be sent.\n\n` +
                `Trade Details:\n` +
                `• Items: ${tradeDetails.itemTitles?.join(' ↔ ') || 'Items traded'}\n` +
                `• Completed: ${new Date().toLocaleDateString()}\n` +
                `• Status: Successfully Completed\n\n` +
                `Thank you for using SwipeIt! 🤝`,
          icon: '🎉',
          color: '#4CAF50'
        };
        
      case 'offer_accepted':
        return {
          text: `✅ Offer Accepted & Trade Completed!\n\n` +
                `This conversation has been archived as the offer has been accepted and completed. ` +
                `You can still view this conversation history, but no new messages can be sent.\n\n` +
                `Trade Details:\n` +
                `• Offer Amount: $${tradeDetails.tradeValue || 'N/A'}\n` +
                `• Item: ${tradeDetails.itemTitles?.[0] || 'Item sold'}\n` +
                `• Completed: ${new Date().toLocaleDateString()}\n\n` +
                `Thank you for using SwipeIt! 💰`,
          icon: '✅',
          color: '#4CAF50'
        };
        
      case 'trade_cancelled':
        return {
          text: `❌ Trade Cancelled\n\n` +
                `This conversation has been archived as the trade was cancelled. ` +
                `You can still view this conversation history for reference.\n\n` +
                `If you'd like to start a new trade, please create a new conversation.\n\n` +
                `Reason: ${tradeDetails.cancellationReason || 'Trade cancelled'}`,
          icon: '❌',
          color: '#FF4444'
        };
        
      case 'items_archived':
        return {
          text: `📦 Items Archived\n\n` +
                `This conversation has been archived as the related items are no longer available. ` +
                `You can still view this conversation history for reference.\n\n` +
                `Archive Reason: ${tradeDetails.archiveReason || 'Items no longer available'}`,
          icon: '📦',
          color: '#FF9800'
        };
        
      default:
        return {
          text: `📝 Conversation Archived\n\n` +
                `This conversation has been archived. You can still view the message history, ` +
                `but no new messages can be sent.\n\n` +
                `Reason: ${tradeDetails.reason || 'Conversation completed'}`,
          icon: '📝',
          color: '#666666'
        };
    }
  }
  
  // Reactivate conversation (admin function or special cases)
  static async reactivateConversation(conversationId, reason = 'admin_reactivation') {
    try {
      console.log(`🔄 Reactivating conversation ${conversationId}`);
      
      const conversationRef = doc(db, 'conversations', conversationId);
      
      await updateDoc(conversationRef, {
        status: 'active',
        isActive: true,
        canSendMessages: true,
        reactivatedAt: serverTimestamp(),
        reactivationReason: reason,
        lastUpdated: serverTimestamp()
      });
      
      // Add reactivation message
      const messageData = {
        conversationId,
        senderId: 'system',
        senderName: 'SwipeIt System',
        text: `🔄 Conversation Reactivated\n\nThis conversation has been reactivated. You can now send messages again.\n\nReason: ${reason}`,
        type: 'system_reactivation',
        timestamp: serverTimestamp(),
        isSystemMessage: true,
        metadata: {
          canReply: true,
          isArchived: false,
          priority: 'medium'
        }
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      console.log(`✅ Conversation ${conversationId} reactivated`);
      
      return {
        success: true,
        conversationId,
        reactivatedAt: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Error reactivating conversation:`, error);
      throw error;
    }
  }
  
  // Get conversation status and metadata
  static async getConversationStatus(conversationId) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        // For new conversations that don't exist yet, return active status
        return { 
          exists: false,
          status: 'active',
          isActive: true,
          canSendMessages: true
        };
      }
      
      const data = conversationDoc.data();
      
      return {
        exists: true,
        status: data.status || 'active',
        isActive: data.isActive !== false,
        canSendMessages: data.canSendMessages !== false,
        completedAt: data.completedAt,
        completionReason: data.completionReason,
        tradeDetails: data.tradeDetails,
        lastUpdated: data.lastUpdated
      };
      
    } catch (error) {
      console.error('❌ Error getting conversation status:', error);
      // Return active status on error to allow messaging
      return { 
        exists: false, 
        error: error.message,
        status: 'active',
        isActive: true,
        canSendMessages: true
      };
    }
  }
  
  // Archive multiple conversations (for bulk operations)
  static async archiveConversationsForTrade(tradeId, tradeDetails) {
    try {
      console.log(`📦 Archiving conversations for trade ${tradeId}`);
      
      // This would typically query for conversations related to the trade
      // For now, we'll handle individual conversations
      
      const results = [];
      
      if (tradeDetails.conversationIds && tradeDetails.conversationIds.length > 0) {
        for (const conversationId of tradeDetails.conversationIds) {
          try {
            const result = await this.markConversationCompleted(conversationId, {
              ...tradeDetails,
              tradeId,
              reason: 'trade_completed'
            });
            results.push(result);
          } catch (error) {
            console.error(`Failed to archive conversation ${conversationId}:`, error);
            results.push({
              success: false,
              conversationId,
              error: error.message
            });
          }
        }
      }
      
      console.log(`✅ Archived ${results.filter(r => r.success).length} conversations for trade ${tradeId}`);
      
      return {
        success: true,
        tradeId,
        archivedConversations: results.filter(r => r.success).length,
        failedConversations: results.filter(r => !r.success).length,
        results
      };
      
    } catch (error) {
      console.error('❌ Error archiving conversations for trade:', error);
      throw error;
    }
  }
}

export default ConversationLifecycleService;
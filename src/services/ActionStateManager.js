import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ActionStateManager {
  
  // Track which actions have been taken to prevent duplicates
  static actionStates = new Map();
  
  // Mark an action as taken
  static markActionTaken(conversationId, actionType, messageId) {
    const key = `${conversationId}_${actionType}_${messageId}`;
    this.actionStates.set(key, {
      taken: true,
      timestamp: Date.now(),
      actionType,
      messageId
    });
    
    console.log(`🔒 Action marked as taken: ${actionType} for message ${messageId}`);
  }
  
  // Check if an action has been taken
  static isActionTaken(conversationId, actionType, messageId) {
    const key = `${conversationId}_${actionType}_${messageId}`;
    const state = this.actionStates.get(key);
    
    if (state) {
      // Clear old actions after 5 minutes
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      if (state.timestamp < fiveMinutesAgo) {
        this.actionStates.delete(key);
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  // Hide old buttons by updating message status
  static async hideOldButtons(conversationId, messageId, actionType) {
    try {
      // Update the message to hide buttons
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        await updateDoc(messageRef, {
          buttonsHidden: true,
          actionTaken: actionType,
          actionTakenAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
        
        console.log(`✅ Buttons hidden for message ${messageId}`);
      }
    } catch (error) {
      console.error('Error hiding buttons:', error);
    }
  }
  
  // Clean interface by hiding all old action buttons
  static async cleanInterface(conversationId, messages) {
    try {
      const updatePromises = messages
        .filter(msg => 
          (msg.messageType === 'counter_offer' || msg.messageType === 'trade_proposal') &&
          msg.status && 
          msg.status !== 'pending' &&
          !msg.buttonsHidden
        )
        .map(msg => this.hideOldButtons(conversationId, msg.id, 'auto_cleanup'));
      
      await Promise.all(updatePromises);
      console.log(`🧹 Interface cleaned for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error cleaning interface:', error);
    }
  }
  
  // Get current actionable item (only one at a time)
  static getCurrentActionableItem(messages, currentUserId) {
    // Find the most recent actionable item
    const sortedMessages = [...messages].sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime;
    });
    
    // Look for pending counter-offers first (highest priority)
    const pendingCounterOffer = sortedMessages.find(msg => 
      msg.messageType === 'counter_offer' && 
      msg.targetUserId === currentUserId &&
      (!msg.status || msg.status === 'pending' || msg.status === 'active') &&
      !msg.buttonsHidden &&
      !this.isActionTaken(msg.conversationId, 'counter_offer_response', msg.id)
    );
    
    if (pendingCounterOffer) {
      return {
        type: 'counter_offer_response',
        message: pendingCounterOffer,
        priority: 'high'
      };
    }
    
    // Look for pending trade proposals
    const pendingTradeProposal = sortedMessages.find(msg => 
      msg.messageType === 'trade_proposal' && 
      msg.targetUserId === currentUserId &&
      (!msg.status || msg.status === 'pending') &&
      !msg.buttonsHidden &&
      !this.isActionTaken(msg.conversationId, 'trade_proposal_response', msg.id)
    );
    
    if (pendingTradeProposal) {
      return {
        type: 'trade_proposal_response',
        message: pendingTradeProposal,
        priority: 'medium'
      };
    }
    
    return null;
  }
  
  // Process action and clean up
  static async processAction(conversationId, actionType, messageId, actionHandler) {
    try {
      // Check if action already taken
      if (this.isActionTaken(conversationId, actionType, messageId)) {
        throw new Error('Action already taken');
      }
      
      // Mark action as taken immediately to prevent double-clicks
      this.markActionTaken(conversationId, actionType, messageId);
      
      // Execute the action
      const result = await actionHandler();
      
      // Hide buttons after successful action
      await this.hideOldButtons(conversationId, messageId, actionType);
      
      return result;
    } catch (error) {
      // Remove the action state if it failed
      const key = `${conversationId}_${actionType}_${messageId}`;
      this.actionStates.delete(key);
      throw error;
    }
  }
  
  // Should show buttons for a message
  static shouldShowButtons(message, currentUserId) {
    // Don't show if buttons are explicitly hidden
    if (message.buttonsHidden) return false;
    
    // Don't show if action already taken
    if (this.isActionTaken(message.conversationId, 'counter_offer_response', message.id)) return false;
    
    // Don't show if message has been processed
    if (message.status && message.status !== 'pending' && message.status !== 'active') return false;
    
    // Don't show if not for current user
    if (message.targetUserId !== currentUserId) return false;
    
    return true;
  }
  
  // Clear all action states (for testing/debugging)
  static clearAllActionStates() {
    this.actionStates.clear();
    console.log('🧹 All action states cleared');
  }
}

export default ActionStateManager;
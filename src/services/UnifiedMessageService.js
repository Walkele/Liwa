import { doc, addDoc, collection, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class UnifiedMessageService {
  
  // Standardized message types
  static MESSAGE_TYPES = {
    TRADE_PROPOSAL: 'trade_proposal',
    CASH_OFFER: 'cash_offer',
    BARTER_PROPOSAL: 'barter_proposal',
    COUNTER_OFFER: 'counter_offer',
    BUNDLE_OFFER: 'bundle_offer',
    SYSTEM: 'system'
  };

  // Standardized status values
  static STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  };

  // Create standardized system message
  static async createSystemMessage(conversationId, text, messageType, status, additionalData = {}) {
    try {
      const messageData = {
        conversationId,
        text,
        messageType,
        status,
        tradeStatus: status, // Duplicate for backward compatibility
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        senderId: 'system',
        senderName: 'SwipeIt',
        read: false,
        delivered: true,
        ...additionalData
      };

      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      console.log('✅ Standardized system message created:', messageRef.id);
      
      return messageRef.id;
    } catch (error) {
      console.error('❌ Error creating system message:', error);
      throw error;
    }
  }

  // Validate message for UI rendering
  static validateMessageForUI(message) {
    const isTradeProposalMessage = message.messageType === this.MESSAGE_TYPES.TRADE_PROPOSAL;
    const isCashOfferMessage = message.messageType === this.MESSAGE_TYPES.CASH_OFFER;
    const isProposalMessage = isTradeProposalMessage || isCashOfferMessage;
    
    // Check if the proposal has been declined or accepted
    const isDeclined = (
      message.status === this.STATUS.DECLINED ||
      message.tradeStatus === this.STATUS.DECLINED ||
      message.text.includes('declined') ||
      message.text.includes('❌')
    );
    
    const isAccepted = (
      message.status === this.STATUS.ACCEPTED ||
      message.tradeStatus === this.STATUS.ACCEPTED ||
      message.text.includes('accepted') ||
      message.text.includes('✅')
    );
    
    const isExpiredOrCancelled = (
      message.status === this.STATUS.EXPIRED ||
      message.status === this.STATUS.CANCELLED ||
      message.tradeStatus === this.STATUS.EXPIRED ||
      message.tradeStatus === this.STATUS.CANCELLED ||
      message.text.includes('LOCKED') ||
      message.text.includes('Trade cannot proceed') ||
      message.text.includes('no longer available')
    );
    
    // Only show buttons if it's a proposal message and it's still pending (not declined, accepted, or expired)
    const isPending = (
      (!message.status || message.status === this.STATUS.PENDING) &&
      (!message.tradeStatus || message.tradeStatus === this.STATUS.PENDING) &&
      !isDeclined &&
      !isAccepted &&
      !isExpiredOrCancelled
    );
    
    return {
      isProposalMessage,
      isPending,
      isDeclined,
      isAccepted,
      isExpiredOrCancelled,
      shouldShowButtons: isProposalMessage && isPending
    };
  }

  // Create trade proposal acceptance message
  static async createTradeAcceptanceMessage(conversationId, otherUserName, tradeProposalId) {
    return await this.createSystemMessage(
      conversationId,
      `✅ Trade proposal accepted! Please coordinate the exchange with ${otherUserName}.`,
      this.MESSAGE_TYPES.TRADE_PROPOSAL,
      this.STATUS.ACCEPTED,
      { tradeProposalId }
    );
  }

  // Create trade proposal decline message
  static async createTradeDeclineMessage(conversationId, tradeProposalId) {
    return await this.createSystemMessage(
      conversationId,
      `❌ Trade proposal declined.`,
      this.MESSAGE_TYPES.TRADE_PROPOSAL,
      this.STATUS.DECLINED,
      { tradeProposalId }
    );
  }

  // Create cash offer acceptance message
  static async createCashOfferAcceptanceMessage(conversationId, offerAmount, otherUserName, offerId) {
    return await this.createSystemMessage(
      conversationId,
      `💰 Cash offer of ${offerAmount} accepted! Please coordinate payment and pickup with ${otherUserName}.`,
      this.MESSAGE_TYPES.CASH_OFFER,
      this.STATUS.ACCEPTED,
      { offerId }
    );
  }

  // Create cash offer decline message
  static async createCashOfferDeclineMessage(conversationId, offerAmount, offerId) {
    return await this.createSystemMessage(
      conversationId,
      `❌ Cash offer of ${offerAmount} declined.`,
      this.MESSAGE_TYPES.CASH_OFFER,
      this.STATUS.DECLINED,
      { offerId }
    );
  }

  // Create item unavailable message
  static async createItemUnavailableMessage(conversationId) {
    return await this.createSystemMessage(
      conversationId,
      `❌ Trade cannot proceed - one or both items are no longer available.`,
      this.MESSAGE_TYPES.SYSTEM,
      this.STATUS.CANCELLED
    );
  }

  // Counter-offer system messages
  static async createCounterOfferMessage(conversationId, counterOfferId, counterOfferData, userId) {
    try {
      // Determine target user from conversation ID pattern
      // ConversationId format: "userId1_userId2_itemId"
      let targetUserId = null;
      
      try {
        // Try to get from conversation document first
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationDoc = await getDoc(conversationRef);
        const conversationData = conversationDoc.data();
        
        if (conversationData?.participants) {
          targetUserId = conversationData.participants.find(p => p !== userId);
          console.log('✅ Found targetUserId from conversation participants:', targetUserId);
        }
      } catch (error) {
        console.log('⚠️ Could not get participants from conversation doc:', error.message);
      }
      
      // Fallback: Parse from conversation ID if participants not found
      if (!targetUserId && conversationId.includes('_')) {
        const parts = conversationId.split('_');
        if (parts.length >= 2) {
          // Find the user ID that's not the current user
          targetUserId = parts[0] === userId ? parts[1] : parts[0];
          console.log('✅ Found targetUserId from conversation ID parsing:', targetUserId);
        }
      }
      
      // Final fallback: Use the route params or context if available
      if (!targetUserId) {
        console.log('⚠️ Could not determine targetUserId, counter-offer buttons may not work');
      }
      
      const messageData = {
        conversationId,
        messageType: 'counter_offer',
        counterOfferId,
        senderId: userId,
        targetUserId: targetUserId, // This should now be set correctly
        isSystemMessage: true,
        status: 'active', // Set initial status as active
        
        // Counter-offer details
        counterType: counterOfferData.counterType,
        originalTerms: counterOfferData.originalTerms,
        newTerms: counterOfferData.newTerms,
        reason: counterOfferData.reason || '',
        
        // User identification (for ChatScreen logic)
        proposerUserId: userId, // The user making the counter-offer
        
        // Display text
        text: this.generateCounterOfferText(counterOfferData),
        
        // Metadata
        createdAt: serverTimestamp(),
        read: false,
        delivered: true,
        
        // Action buttons
        hasActionButtons: true,
        actionButtons: [
          {
            id: 'accept_counter',
            text: 'Accept Counter-Offer',
            type: 'accept',
            style: 'primary'
          },
          {
            id: 'decline_counter',
            text: 'Decline',
            type: 'decline',
            style: 'secondary'
          },
          {
            id: 'make_counter',
            text: 'Make Counter-Offer',
            type: 'counter',
            style: 'outline'
          }
        ]
      };

      console.log('📝 Creating counter-offer message with targetUserId:', targetUserId);

      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation
      const conversationUpdateRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationUpdateRef, {
        lastMessage: messageData.text,
        lastMessageAt: serverTimestamp(),
        hasActiveCounterOffer: true,
        latestCounterOfferId: counterOfferId
      });

      return { success: true, messageId: messageRef.id };
      
    } catch (error) {
      console.error('❌ Error creating counter-offer message:', error);
      throw error;
    }
  }

  static async createCounterOfferAcceptanceMessage(conversationId, counterOfferId, userId) {
    return await this.createSystemMessage(
      conversationId,
      '✅ Counter-offer accepted! Trade is now active.',
      this.MESSAGE_TYPES.COUNTER_OFFER,
      this.STATUS.ACCEPTED,
      { counterOfferId }
    );
  }

  static async createCounterOfferDeclineMessage(conversationId, counterOfferId, reason, userId) {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    return await this.createSystemMessage(
      conversationId,
      `❌ Counter-offer declined.${reasonText}`,
      this.MESSAGE_TYPES.COUNTER_OFFER,
      this.STATUS.DECLINED,
      { counterOfferId, declineReason: reason }
    );
  }

  // Waitlist system messages
  static async createWaitlistAddedMessage(conversationId, itemTitle, queuePosition) {
    return await this.createSystemMessage(
      conversationId,
      `📝 Added to waitlist for "${itemTitle}". You're #${queuePosition} in line.`,
      this.MESSAGE_TYPES.SYSTEM,
      'waitlist_added',
      { itemTitle, queuePosition }
    );
  }

  static async createWaitlistPromotedMessage(conversationId, itemTitle) {
    return await this.createSystemMessage(
      conversationId,
      `🎉 Great news! "${itemTitle}" is now available. Your backup offer has been promoted!`,
      this.MESSAGE_TYPES.SYSTEM,
      'waitlist_promoted',
      { 
        itemTitle,
        hasActionButtons: true,
        actionButtons: [
          {
            id: 'view_item',
            text: 'View Item',
            type: 'view',
            style: 'primary'
          },
          {
            id: 'make_offer',
            text: 'Make Formal Offer',
            type: 'offer',
            style: 'primary'
          }
        ]
      }
    );
  }

  // Safety handshake messages
  static async createSafetyCodesGeneratedMessage(conversationId, tradeId) {
    return await this.createSystemMessage(
      conversationId,
      '🔐 Safety verification codes have been generated for your meeting. Check your notifications for your unique code.',
      this.MESSAGE_TYPES.SYSTEM,
      'safety_codes_generated',
      { 
        tradeId,
        hasActionButtons: true,
        actionButtons: [
          {
            id: 'verify_safety',
            text: 'Verify Safety Code',
            type: 'safety_verify',
            style: 'primary'
          },
          {
            id: 'safety_tips',
            text: 'Safety Tips',
            type: 'info',
            style: 'outline'
          }
        ]
      }
    );
  }

  static async createSafetyVerifiedMessage(conversationId, allVerified) {
    const text = allVerified 
      ? '✅ Safety verification complete! Both parties verified. You can now proceed with the exchange.'
      : '✅ Your safety code has been verified. Waiting for the other party.';
      
    return await this.createSystemMessage(
      conversationId,
      text,
      this.MESSAGE_TYPES.SYSTEM,
      'safety_verified',
      { allVerified }
    );
  }

  // Helper: Generate counter-offer text
  static generateCounterOfferText(counterOfferData) {
    const { counterType, newTerms, reason } = counterOfferData;
    
    let text = '🔄 Counter-offer received: ';
    
    switch (counterType) {
      case 'price_adjustment':
        text += `Adjusted to $${newTerms.cashAmount}`;
        break;
      case 'item_addition':
        text += `Added ${newTerms.additionalItems?.length || 0} additional item(s)`;
        break;
      case 'cash_modification':
        text += `Cash amount changed to $${newTerms.cashAmount}`;
        break;
      default:
        text += 'Terms modified';
    }
    
    if (reason) {
      text += `. Reason: ${reason}`;
    }
    
    return text;
  }
}
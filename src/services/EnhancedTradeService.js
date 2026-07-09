import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';
import { TrustScoreService } from './TrustScoreService';

export class EnhancedTradeService {
  
  // Trade action types
  static TRADE_ACTIONS = {
    INITIAL_OFFER: 'initial_offer',
    COUNTER_OFFER: 'counter_offer',
    ADD_BOOT: 'add_boot',
    ACCEPT_OFFER: 'accept_offer',
    DECLINE_OFFER: 'decline_offer',
    MODIFY_TERMS: 'modify_terms',
    REQUEST_MEETUP: 'request_meetup'
  };

  // Boot (cash addition) types
  static BOOT_TYPES = {
    CASH: 'cash',
    POINTS: 'points',
    SERVICE: 'service'
  };

  // Create initial trade offer
  static async createTradeOffer(offerData) {
    try {
      console.log('🔄 Creating enhanced trade offer...');
      
      const {
        proposerUserId,
        targetUserId,
        proposerItemId,
        targetItemId,
        message,
        bootAmount = 0,
        bootType = null,
        bootPayer = null,
        terms = {}
      } = offerData;

      // Validate users and items exist
      await this.validateTradeParticipants(proposerUserId, targetUserId, proposerItemId, targetItemId);

      // Create conversation if it doesn't exist
      const conversationId = await this.getOrCreateConversation(proposerUserId, targetUserId);

      // Create trade offer document
      const tradeOfferData = {
        conversationId,
        proposerUserId,
        targetUserId,
        proposerItemId,
        targetItemId,
        status: 'pending',
        type: this.TRADE_ACTIONS.INITIAL_OFFER,
        
        // Offer details
        message: message || '',
        bootAmount,
        bootType,
        bootPayer,
        terms,
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        
        // Action history
        actionHistory: [{
          action: this.TRADE_ACTIONS.INITIAL_OFFER,
          userId: proposerUserId,
          timestamp: serverTimestamp(),
          data: { message, bootAmount, bootType }
        }]
      };

      const tradeOfferRef = await addDoc(collection(db, 'trade_offers'), tradeOfferData);

      // Add system message to conversation
      await this.addTradeActionMessage(conversationId, {
        type: 'trade_offer',
        tradeOfferId: tradeOfferRef.id,
        action: this.TRADE_ACTIONS.INITIAL_OFFER,
        proposerUserId,
        targetUserId,
        proposerItemId,
        targetItemId,
        bootAmount,
        bootType,
        message
      });

      // Send notification
      await NotificationService.notifyTradeOfferReceived(
        targetUserId,
        proposerUserId,
        proposerItemId,
        targetItemId,
        tradeOfferRef.id
      );

      console.log('✅ Trade offer created:', tradeOfferRef.id);
      return tradeOfferRef.id;

    } catch (error) {
      console.error('Error creating trade offer:', error);
      throw error;
    }
  }

  // Create counter offer
  static async createCounterOffer(originalOfferId, counterOfferData) {
    try {
      console.log('🔄 Creating counter offer for:', originalOfferId);
      
      const {
        counterUserId,
        newProposerItemId,
        newTargetItemId,
        message,
        bootAmount = 0,
        bootType = null,
        bootPayer = null,
        terms = {}
      } = counterOfferData;

      // Get original offer
      const originalOfferDoc = await getDoc(doc(db, 'trade_offers', originalOfferId));
      if (!originalOfferDoc.exists()) {
        throw new Error('Original offer not found');
      }

      const originalOffer = originalOfferDoc.data();

      // Create counter offer
      const counterOfferData_final = {
        ...originalOffer,
        id: undefined, // Remove original ID
        parentOfferId: originalOfferId,
        type: this.TRADE_ACTIONS.COUNTER_OFFER,
        
        // Updated offer details
        proposerUserId: counterUserId,
        targetUserId: originalOffer.proposerUserId,
        proposerItemId: newProposerItemId || originalOffer.targetItemId,
        targetItemId: newTargetItemId || originalOffer.proposerItemId,
        
        message: message || '',
        bootAmount,
        bootType,
        bootPayer,
        terms,
        
        // Reset status and timestamps
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Add to action history
        actionHistory: [
          ...originalOffer.actionHistory,
          {
            action: this.TRADE_ACTIONS.COUNTER_OFFER,
            userId: counterUserId,
            timestamp: serverTimestamp(),
            data: { message, bootAmount, bootType, newProposerItemId, newTargetItemId }
          }
        ]
      };

      const counterOfferRef = await addDoc(collection(db, 'trade_offers'), counterOfferData_final);

      // Update original offer status
      await updateDoc(doc(db, 'trade_offers', originalOfferId), {
        status: 'countered',
        counterOfferId: counterOfferRef.id,
        updatedAt: serverTimestamp()
      });

      // Add system message
      await this.addTradeActionMessage(originalOffer.conversationId, {
        type: 'counter_offer',
        tradeOfferId: counterOfferRef.id,
        originalOfferId,
        action: this.TRADE_ACTIONS.COUNTER_OFFER,
        proposerUserId: counterUserId,
        targetUserId: originalOffer.proposerUserId,
        proposerItemId: newProposerItemId || originalOffer.targetItemId,
        targetItemId: newTargetItemId || originalOffer.proposerItemId,
        bootAmount,
        bootType,
        message
      });

      // Send notification
      await NotificationService.notifyCounterOffer(
        originalOffer.proposerUserId,
        counterUserId,
        originalOffer.proposerItemId,
        bootAmount,
        counterOfferRef.id
      );

      console.log('✅ Counter offer created:', counterOfferRef.id);
      return counterOfferRef.id;

    } catch (error) {
      console.error('Error creating counter offer:', error);
      throw error;
    }
  }

  // Add boot (cash/points/service) to existing offer
  static async addBootToOffer(offerId, bootData) {
    try {
      console.log('💰 Adding boot to offer:', offerId);
      
      const {
        userId,
        bootAmount,
        bootType,
        message = ''
      } = bootData;

      // Get current offer
      const offerDoc = await getDoc(doc(db, 'trade_offers', offerId));
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }

      const offer = offerDoc.data();

      // Validate user is participant
      if (![offer.proposerUserId, offer.targetUserId].includes(userId)) {
        throw new Error('User not authorized to modify this offer');
      }

      // Update offer with boot
      const updatedOffer = {
        bootAmount: (offer.bootAmount || 0) + bootAmount,
        bootType: bootType,
        bootPayer: userId,
        updatedAt: serverTimestamp(),
        actionHistory: [
          ...offer.actionHistory,
          {
            action: this.TRADE_ACTIONS.ADD_BOOT,
            userId,
            timestamp: serverTimestamp(),
            data: { bootAmount, bootType, message }
          }
        ]
      };

      await updateDoc(doc(db, 'trade_offers', offerId), updatedOffer);

      // Add system message
      await this.addTradeActionMessage(offer.conversationId, {
        type: 'boot_added',
        tradeOfferId: offerId,
        action: this.TRADE_ACTIONS.ADD_BOOT,
        userId,
        bootAmount,
        bootType,
        message
      });

      // Notify other participant
      const otherUserId = offer.proposerUserId === userId ? offer.targetUserId : offer.proposerUserId;
      await NotificationService.notifyBootAdded(otherUserId, userId, bootAmount, bootType, offerId);

      console.log('✅ Boot added successfully');
      return true;

    } catch (error) {
      console.error('Error adding boot:', error);
      throw error;
    }
  }

  // Accept trade offer
  static async acceptTradeOffer(offerId, acceptingUserId) {
    try {
      console.log('✅ Accepting trade offer:', offerId);
      
      const offerDoc = await getDoc(doc(db, 'trade_offers', offerId));
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }

      const offer = offerDoc.data();

      // Validate user is the target
      if (offer.targetUserId !== acceptingUserId) {
        throw new Error('Only the target user can accept this offer');
      }

      // Update offer status
      await updateDoc(doc(db, 'trade_offers', offerId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        actionHistory: [
          ...offer.actionHistory,
          {
            action: this.TRADE_ACTIONS.ACCEPT_OFFER,
            userId: acceptingUserId,
            timestamp: serverTimestamp(),
            data: {}
          }
        ]
      });

      // Create active trade
      const tradeId = await this.createActiveTrade(offer);

      // Add system message
      await this.addTradeActionMessage(offer.conversationId, {
        type: 'offer_accepted',
        tradeOfferId: offerId,
        tradeId,
        action: this.TRADE_ACTIONS.ACCEPT_OFFER,
        userId: acceptingUserId
      });

      // Send notification
      await NotificationService.notifyOfferAccepted(
        offer.proposerUserId,
        acceptingUserId,
        offer.proposerItemId,
        offer.bootAmount || 0,
        tradeId
      );

      // Update user response time
      await TrustScoreService.updateResponseTime(acceptingUserId, this.calculateResponseTime(offer.createdAt));

      console.log('✅ Trade offer accepted, active trade created:', tradeId);
      return tradeId;

    } catch (error) {
      console.error('Error accepting trade offer:', error);
      throw error;
    }
  }

  // Decline trade offer
  static async declineTradeOffer(offerId, decliningUserId, reason = '') {
    try {
      console.log('❌ Declining trade offer:', offerId);
      
      const offerDoc = await getDoc(doc(db, 'trade_offers', offerId));
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }

      const offer = offerDoc.data();

      // Validate user is the target
      if (offer.targetUserId !== decliningUserId) {
        throw new Error('Only the target user can decline this offer');
      }

      // Update offer status
      await updateDoc(doc(db, 'trade_offers', offerId), {
        status: 'declined',
        declinedAt: serverTimestamp(),
        declineReason: reason,
        updatedAt: serverTimestamp(),
        actionHistory: [
          ...offer.actionHistory,
          {
            action: this.TRADE_ACTIONS.DECLINE_OFFER,
            userId: decliningUserId,
            timestamp: serverTimestamp(),
            data: { reason }
          }
        ]
      });

      // Add system message
      await this.addTradeActionMessage(offer.conversationId, {
        type: 'offer_declined',
        tradeOfferId: offerId,
        action: this.TRADE_ACTIONS.DECLINE_OFFER,
        userId: decliningUserId,
        reason
      });

      // Send notification
      await NotificationService.notifyOfferDeclined(
        offer.proposerUserId,
        decliningUserId,
        offer.proposerItemId,
        reason
      );

      // Update user response time
      await TrustScoreService.updateResponseTime(decliningUserId, this.calculateResponseTime(offer.createdAt));

      console.log('✅ Trade offer declined');
      return true;

    } catch (error) {
      console.error('Error declining trade offer:', error);
      throw error;
    }
  }

  // Get or create conversation between two users
  static async getOrCreateConversation(user1Id, user2Id) {
    try {
      // Check if conversation already exists
      const existingConversationQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user1Id)
      );
      
      const snapshot = await getDocs(existingConversationQuery);
      
      for (const doc of snapshot.docs) {
        const conversation = doc.data();
        if (conversation.participants.includes(user2Id)) {
          return doc.id;
        }
      }

      // Create new conversation
      const conversationData = {
        participants: [user1Id, user2Id],
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: '',
        unreadCount: {
          [user1Id]: 0,
          [user2Id]: 0
        }
      };

      const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);
      return conversationRef.id;

    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  // Add trade action message to conversation
  static async addTradeActionMessage(conversationId, actionData) {
    try {
      const messageData = {
        conversationId,
        type: 'system',
        subType: actionData.type,
        senderId: 'system',
        senderName: 'SwipeIt',
        text: this.generateActionMessage(actionData),
        actionData,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update conversation last message
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: messageData.text,
        lastMessageAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error adding trade action message:', error);
    }
  }

  // Generate human-readable action message
  static generateActionMessage(actionData) {
    const { type, action, bootAmount, bootType, message } = actionData;
    
    switch (type) {
      case 'trade_offer':
        let baseMessage = '🔄 New trade proposal';
        if (bootAmount > 0) {
          baseMessage += ` with ${bootAmount} ${bootType} boot`;
        }
        if (message) {
          baseMessage += `\n"${message}"`;
        }
        return baseMessage;
        
      case 'counter_offer':
        return `🔄 Counter offer proposed${bootAmount > 0 ? ` with ${bootAmount} ${bootType} boot` : ''}${message ? `\n"${message}"` : ''}`;
        
      case 'boot_added':
        return `💰 Added ${bootAmount} ${bootType} to the trade${message ? `\n"${message}"` : ''}`;
        
      case 'offer_accepted':
        return '✅ Trade offer accepted! Proceeding to meetup coordination.';
        
      case 'offer_declined':
        return `❌ Trade offer declined${actionData.reason ? `: ${actionData.reason}` : ''}`;
        
      default:
        return `Trade action: ${action}`;
    }
  }

  // Create active trade from accepted offer
  static async createActiveTrade(offer) {
    try {
      const tradeData = {
        participants: [offer.proposerUserId, offer.targetUserId],
        items: [offer.proposerItemId, offer.targetItemId],
        bootAmount: offer.bootAmount || 0,
        bootType: offer.bootType,
        bootPayer: offer.bootPayer,
        terms: offer.terms || {},
        
        status: 'accepted',
        phase: 'coordination',
        
        conversationId: offer.conversationId,
        originalOfferId: offer.id,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Meetup coordination
        meetupProposed: false,
        meetupAccepted: false,
        meetupLocation: null,
        meetupTime: null,
        
        // QR verification
        qrCodesGenerated: false,
        verificationCodes: {},
        verificationComplete: false
      };

      const tradeRef = await addDoc(collection(db, 'active_trades'), tradeData);
      return tradeRef.id;

    } catch (error) {
      console.error('Error creating active trade:', error);
      throw error;
    }
  }

  // Validate trade participants and items
  static async validateTradeParticipants(proposerUserId, targetUserId, proposerItemId, targetItemId) {
    // Check users exist
    const proposerDoc = await getDoc(doc(db, 'users', proposerUserId));
    const targetDoc = await getDoc(doc(db, 'users', targetUserId));
    
    if (!proposerDoc.exists() || !targetDoc.exists()) {
      throw new Error('One or more users not found');
    }

    // Check items exist and are available
    const proposerItemDoc = await getDoc(doc(db, 'items', proposerItemId));
    const targetItemDoc = await getDoc(doc(db, 'items', targetItemId));
    
    if (!proposerItemDoc.exists() || !targetItemDoc.exists()) {
      throw new Error('One or more items not found');
    }

    const proposerItem = proposerItemDoc.data();
    const targetItem = targetItemDoc.data();

    if (proposerItem.status !== 'available' || targetItem.status !== 'available') {
      throw new Error('One or more items are not available for trading');
    }

    if (proposerItem.userId !== proposerUserId || targetItem.userId !== targetUserId) {
      throw new Error('Item ownership mismatch');
    }

    return true;
  }

  // Calculate response time in hours
  static calculateResponseTime(offerCreatedAt) {
    const now = new Date();
    const created = offerCreatedAt.toDate ? offerCreatedAt.toDate() : new Date(offerCreatedAt);
    const diffMs = now - created;
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }

  // Get active trade offers for conversation
  static async getActiveTradeOffers(conversationId) {
    try {
      const offersQuery = query(
        collection(db, 'trade_offers'),
        where('conversationId', '==', conversationId),
        where('status', 'in', ['pending', 'accepted']),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(offersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('Error getting active trade offers:', error);
      return [];
    }
  }

  // Listen to trade offer updates
  static subscribeToTradeOffers(conversationId, callback) {
    const offersQuery = query(
      collection(db, 'trade_offers'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(offersQuery, (snapshot) => {
      const offers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(offers);
    });
  }
}

export default EnhancedTradeService;
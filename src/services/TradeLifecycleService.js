import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemLockingService } from './ItemLockingService';
import { NotificationService } from './notificationService';
import { SecurityService } from './SecurityService';

export class TradeLifecycleService {
  
  // Trade lifecycle states
  static TRADE_STATES = {
    OFFER_PENDING: 'offer_pending',
    OFFER_ACCEPTED: 'offer_accepted', 
    MULTIPLE_OFFERS_ACCEPTED: 'multiple_offers_accepted',
    COMMITMENT_PENDING: 'commitment_pending',
    BOTH_COMMITTED: 'both_committed',
    ITEMS_LOCKED: 'items_locked',
    IN_PROGRESS: 'in_progress',
    DELIVERY_PENDING: 'delivery_pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed',
    PENALIZED: 'penalized'
  };

  // Commitment timeout (24 hours)
  static COMMITMENT_TIMEOUT = 24 * 60 * 60 * 1000;
  
  // Accept offer and handle multiple offers scenario
  static async acceptOffer(offerId, sellerId) {
    try {
      console.log('✅ Accepting offer:', offerId);
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify seller can accept
      if (offerData.sellerId !== sellerId) {
        throw new Error('You are not authorized to accept this offer');
      }
      
      // Check for other accepted offers for this item
      const existingAcceptedOffers = await this.getAcceptedOffersForItem(offerData.itemId);
      
      if (existingAcceptedOffers.length > 0) {
        // Multiple offers scenario
        await this.handleMultipleAcceptedOffers(offerData, existingAcceptedOffers);
      } else {
        // First accepted offer
        await this.handleFirstAcceptedOffer(offerData);
      }
      
      // Update offer status
      await updateDoc(offerRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: sellerId,
        tradeState: existingAcceptedOffers.length > 0 ? 
          this.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED : 
          this.TRADE_STATES.OFFER_ACCEPTED
      });
      
      // Create trade lifecycle record
      await this.createTradeLifecycleRecord(offerData, existingAcceptedOffers.length > 0);
      
      // Notify buyer
      await NotificationService.notifyOfferAccepted(
        offerData.buyerId,
        offerData.sellerName,
        offerData.itemTitle,
        offerData.offerAmount,
        offerId
      );
      
      console.log('✅ Offer accepted successfully');
      return {
        offerId,
        hasMultipleOffers: existingAcceptedOffers.length > 0,
        tradeState: existingAcceptedOffers.length > 0 ? 
          this.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED : 
          this.TRADE_STATES.OFFER_ACCEPTED
      };
      
    } catch (error) {
      console.error('❌ Error accepting offer:', error);
      throw error;
    }
  }
  
  // Handle first accepted offer
  static async handleFirstAcceptedOffer(offerData) {
    try {
      // Start commitment timer
      await this.startCommitmentTimer(offerData.itemId, offerData.id);
      
      // Update conversation with acceptance
      await this.updateConversationWithTradeState(
        offerData.conversationId,
        this.TRADE_STATES.OFFER_ACCEPTED,
        `Offer of $${offerData.offerAmount} accepted! Both parties have 24 hours to commit.`
      );
      
    } catch (error) {
      console.error('Error handling first accepted offer:', error);
      throw error;
    }
  }
  
  // Handle multiple accepted offers scenario
  static async handleMultipleAcceptedOffers(newOfferData, existingOffers) {
    try {
      console.log('🔄 Handling multiple accepted offers scenario');
      
      // Notify all parties about multiple offers
      const allOffers = [...existingOffers, newOfferData];
      
      for (const offer of allOffers) {
        await this.updateConversationWithTradeState(
          offer.conversationId,
          this.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED,
          `Multiple offers accepted! Seller will choose one to commit to within 24 hours.`
        );
        
        // Notify buyers about competition
        await NotificationService.notifyMultipleOffersAccepted(
          offer.buyerId,
          offer.sellerName,
          offer.itemTitle,
          allOffers.length
        );
      }
      
      // Start commitment selection timer
      await this.startCommitmentSelectionTimer(newOfferData.itemId, allOffers);
      
    } catch (error) {
      console.error('Error handling multiple offers:', error);
      throw error;
    }
  }
  
  // Commit to specific offer (when multiple offers are accepted)
  static async commitToOffer(offerId, sellerId) {
    try {
      console.log('🤝 Committing to offer:', offerId);
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify seller can commit
      if (offerData.sellerId !== sellerId) {
        throw new Error('You are not authorized to commit to this offer');
      }
      
      // Check if commitment window is still open
      const commitmentDeadline = new Date(offerData.acceptedAt.toDate().getTime() + this.COMMITMENT_TIMEOUT);
      if (new Date() > commitmentDeadline) {
        throw new Error('Commitment window has expired');
      }
      
      // Lock the item
      await ItemLockingService.lockItemForTrade(
        offerData.itemId,
        sellerId,
        offerId,
        'seller_committed'
      );
      
      // Update offer with seller commitment
      await updateDoc(offerRef, {
        sellerCommitted: true,
        sellerCommittedAt: serverTimestamp(),
        tradeState: this.TRADE_STATES.COMMITMENT_PENDING
      });
      
      // Reject other accepted offers for this item
      await this.rejectOtherAcceptedOffers(offerData.itemId, offerId);
      
      // Update conversation
      await this.updateConversationWithTradeState(
        offerData.conversationId,
        this.TRADE_STATES.COMMITMENT_PENDING,
        `Seller committed to your offer! Waiting for buyer commitment.`
      );
      
      // Notify buyer to commit
      await NotificationService.notifySellerCommitted(
        offerData.buyerId,
        offerData.sellerName,
        offerData.itemTitle,
        offerData.offerAmount
      );
      
      // Start buyer commitment timer
      await this.startBuyerCommitmentTimer(offerId);
      
      console.log('✅ Seller committed to offer');
      return { success: true, tradeState: this.TRADE_STATES.COMMITMENT_PENDING };
      
    } catch (error) {
      console.error('❌ Error committing to offer:', error);
      throw error;
    }
  }
  
  // Buyer commits to the trade
  static async buyerCommitToTrade(offerId, buyerId) {
    try {
      console.log('🤝 Buyer committing to trade:', offerId);
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify buyer can commit
      if (offerData.buyerId !== buyerId) {
        throw new Error('You are not authorized to commit to this trade');
      }
      
      // Check if seller has committed
      if (!offerData.sellerCommitted) {
        throw new Error('Seller has not committed yet');
      }
      
      // Update offer with buyer commitment
      await updateDoc(offerRef, {
        buyerCommitted: true,
        buyerCommittedAt: serverTimestamp(),
        tradeState: this.TRADE_STATES.BOTH_COMMITTED,
        bothCommittedAt: serverTimestamp()
      });
      
      // Create active trade record
      await this.createActiveTradeRecord(offerData);
      
      // Update conversation
      await this.updateConversationWithTradeState(
        offerData.conversationId,
        this.TRADE_STATES.BOTH_COMMITTED,
        `Both parties committed! Trade is now active. Proceed with exchange.`
      );
      
      // Notify both parties
      await NotificationService.notifyBothCommitted(
        offerData.sellerId,
        offerData.buyerId,
        offerData.itemTitle,
        offerData.offerAmount
      );
      
      console.log('✅ Both parties committed to trade');
      return { success: true, tradeState: this.TRADE_STATES.BOTH_COMMITTED };
      
    } catch (error) {
      console.error('❌ Error buyer committing to trade:', error);
      throw error;
    }
  }
  
  // Mark trade as completed by one party
  static async markTradeCompleted(tradeId, userId, completionProof = null) {
    try {
      console.log('✅ Marking trade completed by user:', userId);
      
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Verify user is participant
      if (!tradeData.participants.includes(userId)) {
        throw new Error('You are not a participant in this trade');
      }
      
      const isSellerCompleting = userId === tradeData.sellerId;
      const completionField = isSellerCompleting ? 'sellerCompleted' : 'buyerCompleted';
      const completionTimeField = isSellerCompleting ? 'sellerCompletedAt' : 'buyerCompletedAt';
      
      // Update completion status
      const updateData = {
        [completionField]: true,
        [completionTimeField]: serverTimestamp()
      };
      
      if (completionProof) {
        updateData[`${isSellerCompleting ? 'seller' : 'buyer'}CompletionProof`] = completionProof;
      }
      
      // Check if both parties have completed
      const otherPartyCompleted = isSellerCompleting ? tradeData.buyerCompleted : tradeData.sellerCompleted;
      
      if (otherPartyCompleted) {
        // Both completed - finalize trade
        updateData.tradeState = this.TRADE_STATES.COMPLETED;
        updateData.completedAt = serverTimestamp();
        
        await this.finalizeCompletedTrade(tradeData);
      } else {
        // Waiting for other party
        updateData.tradeState = this.TRADE_STATES.DELIVERY_PENDING;
      }
      
      await updateDoc(tradeRef, updateData);
      
      // Update conversation
      const message = otherPartyCompleted ? 
        'Trade completed by both parties! 🎉' :
        `Trade marked as completed by ${isSellerCompleting ? 'seller' : 'buyer'}. Waiting for confirmation from other party.`;
        
      await this.updateConversationWithTradeState(
        tradeData.conversationId,
        updateData.tradeState,
        message
      );
      
      // Notify other party
      const otherUserId = isSellerCompleting ? tradeData.buyerId : tradeData.sellerId;
      await NotificationService.notifyTradeCompleted(
        otherUserId,
        isSellerCompleting ? tradeData.sellerName : tradeData.buyerName,
        tradeData.itemTitle,
        otherPartyCompleted
      );
      
      console.log('✅ Trade completion marked');
      return { 
        success: true, 
        tradeState: updateData.tradeState,
        bothCompleted: otherPartyCompleted 
      };
      
    } catch (error) {
      console.error('❌ Error marking trade completed:', error);
      throw error;
    }
  }
  
  // Penalize user for not delivering
  static async penalizeUser(userId, tradeId, reason, severity = 'minor') {
    try {
      console.log('⚠️ Penalizing user:', userId, 'for trade:', tradeId);
      
      const penaltyData = {
        userId,
        tradeId,
        reason,
        severity, // minor, major, severe
        penalizedAt: serverTimestamp(),
        status: 'active'
      };
      
      // Add penalty record
      await addDoc(collection(db, 'userPenalties'), penaltyData);
      
      // Update user's penalty score
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentPenalties = userData.penaltyScore || 0;
        const penaltyPoints = this.getPenaltyPoints(severity);
        
        await updateDoc(userRef, {
          penaltyScore: currentPenalties + penaltyPoints,
          lastPenaltyAt: serverTimestamp(),
          totalPenalties: (userData.totalPenalties || 0) + 1
        });
        
        // Check if user should be suspended
        if (currentPenalties + penaltyPoints >= 100) {
          await this.suspendUser(userId, 'excessive_penalties');
        }
      }
      
      // Log penalty activity
      await SecurityService.logUserAction(userId, 'penalty_applied', {
        tradeId,
        reason,
        severity,
        penaltyPoints: this.getPenaltyPoints(severity)
      });
      
      console.log('✅ User penalized successfully');
      return { success: true, penaltyPoints: this.getPenaltyPoints(severity) };
      
    } catch (error) {
      console.error('❌ Error penalizing user:', error);
      throw error;
    }
  }
  
  // Get penalty points based on severity
  static getPenaltyPoints(severity) {
    const points = {
      minor: 10,
      major: 25,
      severe: 50
    };
    return points[severity] || 10;
  }
  
  // Suspend user account
  static async suspendUser(userId, reason) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        accountStatus: 'suspended',
        suspendedAt: serverTimestamp(),
        suspensionReason: reason
      });
      
      // Notify user of suspension
      await NotificationService.notifyAccountSuspended(userId, reason);
      
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  }
  
  // Create trade lifecycle record
  static async createTradeLifecycleRecord(offerData, hasMultipleOffers) {
    try {
      const lifecycleData = {
        offerId: offerData.id,
        itemId: offerData.itemId,
        itemTitle: offerData.itemTitle,
        sellerId: offerData.sellerId,
        sellerName: offerData.sellerName,
        buyerId: offerData.buyerId,
        buyerName: offerData.buyerName,
        offerAmount: offerData.offerAmount,
        tradeState: hasMultipleOffers ? 
          this.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED : 
          this.TRADE_STATES.OFFER_ACCEPTED,
        createdAt: serverTimestamp(),
        participants: [offerData.sellerId, offerData.buyerId],
        conversationId: offerData.conversationId,
        hasMultipleOffers,
        commitmentDeadline: new Date(Date.now() + this.COMMITMENT_TIMEOUT)
      };
      
      await setDoc(doc(db, 'tradeLifecycles', offerData.id), lifecycleData);
      
    } catch (error) {
      console.error('Error creating trade lifecycle record:', error);
    }
  }
  
  // Get accepted offers for an item
  static async getAcceptedOffersForItem(itemId) {
    try {
      const offersQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(offersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting accepted offers:', error);
      return [];
    }
  }
  
  // Reject other accepted offers
  static async rejectOtherAcceptedOffers(itemId, selectedOfferId) {
    try {
      const acceptedOffers = await this.getAcceptedOffersForItem(itemId);
      
      for (const offer of acceptedOffers) {
        if (offer.id !== selectedOfferId) {
          await updateDoc(doc(db, 'offers', offer.id), {
            status: 'auto_rejected',
            rejectedAt: serverTimestamp(),
            rejectionReason: 'seller_committed_to_other_offer'
          });
          
          // Notify rejected buyers
          await NotificationService.notifyOfferRejected(
            offer.buyerId,
            offer.sellerName,
            offer.itemTitle,
            'Seller committed to another offer'
          );
        }
      }
      
    } catch (error) {
      console.error('Error rejecting other offers:', error);
    }
  }
  
  // Update conversation with trade state
  static async updateConversationWithTradeState(conversationId, tradeState, message) {
    try {
      if (!conversationId) return;
      
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        tradeState,
        lastMessage: message,
        lastMessageAt: serverTimestamp()
      });
      
      // Add system message
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: 'system',
        senderName: 'SwipeIt',
        text: message,
        messageType: 'trade_state_update',
        tradeState,
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
      
    } catch (error) {
      console.error('Error updating conversation with trade state:', error);
    }
  }
  
  // Start commitment timer
  static async startCommitmentTimer(itemId, offerId) {
    try {
      // This would typically be handled by a cloud function
      // For now, we'll create a timer record
      await addDoc(collection(db, 'commitmentTimers'), {
        itemId,
        offerId,
        startedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + this.COMMITMENT_TIMEOUT),
        status: 'active'
      });
      
    } catch (error) {
      console.error('Error starting commitment timer:', error);
    }
  }
  
  // Start commitment selection timer for multiple offers
  static async startCommitmentSelectionTimer(itemId, offers) {
    try {
      await addDoc(collection(db, 'commitmentSelectionTimers'), {
        itemId,
        offerIds: offers.map(o => o.id),
        startedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + this.COMMITMENT_TIMEOUT),
        status: 'active'
      });
      
    } catch (error) {
      console.error('Error starting commitment selection timer:', error);
    }
  }
  
  // Start buyer commitment timer
  static async startBuyerCommitmentTimer(offerId) {
    try {
      await addDoc(collection(db, 'buyerCommitmentTimers'), {
        offerId,
        startedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + this.COMMITMENT_TIMEOUT),
        status: 'active'
      });
      
    } catch (error) {
      console.error('Error starting buyer commitment timer:', error);
    }
  }
  
  // Create active trade record
  static async createActiveTradeRecord(offerData) {
    try {
      const tradeData = {
        offerId: offerData.id,
        itemId: offerData.itemId,
        itemTitle: offerData.itemTitle,
        sellerId: offerData.sellerId,
        sellerName: offerData.sellerName,
        buyerId: offerData.buyerId,
        buyerName: offerData.buyerName,
        offerAmount: offerData.offerAmount,
        tradeState: this.TRADE_STATES.BOTH_COMMITTED,
        participants: [offerData.sellerId, offerData.buyerId],
        conversationId: offerData.conversationId,
        createdAt: serverTimestamp(),
        sellerCompleted: false,
        buyerCompleted: false
      };
      
      await setDoc(doc(db, 'activeTrades', offerData.id), tradeData);
      
    } catch (error) {
      console.error('Error creating active trade record:', error);
    }
  }
  
  // Finalize completed trade
  static async finalizeCompletedTrade(tradeData) {
    try {
      // Unlock item and mark as sold
      await ItemLockingService.unlockItem(
        tradeData.itemId,
        tradeData.sellerId,
        'trade_completed'
      );
      
      // Update user statistics
      await this.updateUserTradeStats(tradeData.sellerId, true);
      await this.updateUserTradeStats(tradeData.buyerId, false);
      
      // Archive trade
      await addDoc(collection(db, 'completedTrades'), {
        ...tradeData,
        archivedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error finalizing completed trade:', error);
    }
  }
  
  // Update user trade statistics
  static async updateUserTradeStats(userId, isSeller) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updates = {
          totalTrades: (userData.totalTrades || 0) + 1,
          lastTradeAt: serverTimestamp()
        };
        
        if (isSeller) {
          updates.totalSales = (userData.totalSales || 0) + 1;
        } else {
          updates.totalPurchases = (userData.totalPurchases || 0) + 1;
        }
        
        await updateDoc(userRef, updates);
      }
      
    } catch (error) {
      console.error('Error updating user trade stats:', error);
    }
  }
  
  // Get user's trade lifecycle status
  static async getUserTradeLifecycles(userId) {
    try {
      const lifecyclesQuery = query(
        collection(db, 'tradeLifecycles'),
        where('participants', 'array-contains', userId)
      );
      
      const snapshot = await getDocs(lifecyclesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting user trade lifecycles:', error);
      return [];
    }
  }
}
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemLockingService } from './ItemLockingService';
import { NotificationService } from './notificationService';
import { BlindReviewService } from './BlindReviewService';
import { OfferComparisonService } from './OfferComparisonService';

export class LiwaSOPService {
  
  // Liwa Standard Operating Procedures
  static SOP_STATES = {
    // Phase 1: Offer Management
    OFFER_MADE: 'offer_made',
    OFFER_RECEIVED: 'offer_received',
    OFFER_ACCEPTED: 'offer_accepted',
    MULTIPLE_OFFERS: 'multiple_offers',
    
    // Phase 2: Commitment (Liwa SOP - Items lock ONLY after both commit)
    SELLER_COMMITTED: 'seller_committed',
    BUYER_COMMITTED: 'buyer_committed', 
    BOTH_COMMITTED: 'both_committed',
    ITEMS_LOCKED: 'items_locked',
    
    // Phase 3: Exchange Process
    CONTACT_EXCHANGED: 'contact_exchanged',
    MEETING_ARRANGED: 'meeting_arranged',
    EXCHANGE_IN_PROGRESS: 'exchange_in_progress',
    
    // Phase 4: Completion
    SELLER_CONFIRMED: 'seller_confirmed',
    BUYER_CONFIRMED: 'buyer_confirmed',
    TRADE_COMPLETED: 'trade_completed',
    
    // Phase 5: Issues
    TRADE_CANCELLED: 'trade_cancelled',
    TRADE_DISPUTED: 'trade_disputed',
    USER_PENALIZED: 'user_penalized'
  };

  // Liwa SOP: Accept trade proposal (creates offer record)
  static async acceptTradeProposalSOP(tradeProposalId, accepterUserId, proposalData) {
    try {
      console.log('📋 Liwa SOP: Accepting trade proposal (creating offer record)');
      
      // Create offer record from trade proposal
      const offerData = {
        // Basic offer info
        sellerId: proposalData.targetUserId, // Person who owns the target item
        buyerId: proposalData.proposerUserId, // Person who made the proposal
        itemId: proposalData.targetItemId,
        itemTitle: proposalData.targetItemTitle,
        
        // Trade-specific info
        proposerItemId: proposalData.proposerItemId,
        proposerItemTitle: proposalData.proposerItemTitle,
        tradeType: 'item_trade',
        
        // Offer details
        offerAmount: 0, // No cash in item trades
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        
        // SOP state
        sopState: this.SOP_STATES.OFFER_ACCEPTED,
        commitmentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        
        // Metadata
        conversationId: proposalData.conversationId,
        tradeProposalId: tradeProposalId,
        participants: [proposalData.proposerUserId, proposalData.targetUserId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Create the offer record
      const offerRef = await addDoc(collection(db, 'offers'), offerData);
      const offerId = offerRef.id;
      
      // Create SOP tracking record
      await this.createSOPRecord({
        ...offerData,
        id: offerId
      }, false);
      
      // Update conversation with SOP state
      await this.updateConversationSOPState(
        proposalData.conversationId,
        this.SOP_STATES.OFFER_ACCEPTED,
        `Trade proposal accepted! Both parties have 24 hours to commit. Items will be locked only after both commit.`
      );
      
      // Notify the proposer
      await NotificationService.notifyTradeProposalAccepted(
        proposalData.proposerUserId,
        proposalData.targetUserName || 'User',
        proposalData.proposerItemTitle,
        proposalData.targetItemTitle,
        offerId
      );
      
      console.log('✅ Liwa SOP: Trade proposal accepted, offer record created');
      return {
        success: true,
        offerId: offerId,
        sopState: this.SOP_STATES.OFFER_ACCEPTED,
        itemsLocked: false // Liwa SOP: No locking until both commit
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error accepting trade proposal:', error);
      throw error;
    }
  }

  // Liwa SOP: Accept offer (items NOT locked yet)
  static async acceptOfferSOP(offerId, sellerId) {
    try {
      console.log('📋 Liwa SOP: Accepting offer (no locking yet)');
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify seller authorization
      if (offerData.sellerId !== sellerId) {
        throw new Error('Unauthorized to accept this offer');
      }
      
      // Check for existing accepted offers (Liwa allows multiple)
      const existingOffers = await this.getAcceptedOffersForItem(offerData.itemId);
      
      // Update offer status (NO LOCKING YET - Liwa SOP)
      await updateDoc(offerRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        sopState: existingOffers.length > 0 ? 
          this.SOP_STATES.MULTIPLE_OFFERS : 
          this.SOP_STATES.OFFER_ACCEPTED,
        commitmentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      
      // Create SOP tracking record
      await this.createSOPRecord(offerData, existingOffers.length > 0);
      
      // Update conversation with SOP state
      await this.updateConversationSOPState(
        offerData.conversationId,
        existingOffers.length > 0 ? this.SOP_STATES.MULTIPLE_OFFERS : this.SOP_STATES.OFFER_ACCEPTED,
        existingOffers.length > 0 ? 
          `Multiple offers accepted! Seller has 24 hours to commit to one.` :
          `Offer accepted! Both parties have 24 hours to commit. Items will be locked only after both commit.`
      );
      
      // Notify buyer
      await NotificationService.notifyOfferAccepted(
        offerData.buyerId,
        offerData.sellerName,
        offerData.itemTitle,
        offerData.offerAmount,
        offerId
      );
      
      console.log('✅ Liwa SOP: Offer accepted (items remain unlocked)');
      return {
        success: true,
        sopState: existingOffers.length > 0 ? this.SOP_STATES.MULTIPLE_OFFERS : this.SOP_STATES.OFFER_ACCEPTED,
        itemsLocked: false // Liwa SOP: No locking until both commit
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error accepting offer:', error);
      throw error;
    }
  }
  
  // Liwa SOP: Seller commits to specific offer (still no locking)
  static async sellerCommitSOP(offerId, sellerId) {
    try {
      console.log('🤝 Liwa SOP: Seller committing (no locking yet)');
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify seller authorization
      if (offerData.sellerId !== sellerId) {
        throw new Error('Unauthorized to commit to this offer');
      }
      
      // Check commitment deadline
      if (offerData.commitmentDeadline && new Date() > offerData.commitmentDeadline.toDate()) {
        throw new Error('Commitment deadline has passed');
      }
      
      // Update offer with seller commitment (NO LOCKING YET)
      await updateDoc(offerRef, {
        sellerCommitted: true,
        sellerCommittedAt: serverTimestamp(),
        sopState: this.SOP_STATES.SELLER_COMMITTED
      });
      
      // Reject other accepted offers for this item
      await this.rejectOtherOffersSOP(offerData.itemId, offerId);
      
      // Update conversation
      await this.updateConversationSOPState(
        offerData.conversationId,
        this.SOP_STATES.SELLER_COMMITTED,
        `Seller committed! Waiting for buyer commitment. Items will lock when both parties commit.`
      );
      
      // Notify buyer to commit
      await NotificationService.notifySellerCommitted(
        offerData.buyerId,
        offerData.sellerName,
        offerData.itemTitle,
        offerData.offerAmount
      );
      
      console.log('✅ Liwa SOP: Seller committed (items still unlocked)');
      return {
        success: true,
        sopState: this.SOP_STATES.SELLER_COMMITTED,
        itemsLocked: false // Still no locking until buyer commits
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error seller committing:', error);
      throw error;
    }
  }
  
  // Liwa SOP: Buyer commits - NOW items get locked
  static async buyerCommitSOP(offerId, buyerId) {
    try {
      console.log('🔒 Liwa SOP: Buyer committing - ITEMS WILL NOW LOCK');
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify buyer authorization
      if (offerData.buyerId !== buyerId) {
        throw new Error('Unauthorized to commit to this trade');
      }
      
      // Verify seller has committed
      if (!offerData.sellerCommitted) {
        throw new Error('Seller must commit first');
      }
      
      // Liwa SOP: NOW LOCK THE ITEM (both parties committed)
      await ItemLockingService.lockItemForTrade(
        offerData.itemId,
        offerData.sellerId,
        offerId,
        'both_parties_committed'
      );
      
      // Update offer with buyer commitment and locked status
      await updateDoc(offerRef, {
        buyerCommitted: true,
        buyerCommittedAt: serverTimestamp(),
        bothCommittedAt: serverTimestamp(),
        itemLocked: true,
        itemLockedAt: serverTimestamp(),
        sopState: this.SOP_STATES.ITEMS_LOCKED
      });
      
      // Create active trade record
      await this.createActiveTradeRecordSOP(offerData);
      
      // Update conversation
      await this.updateConversationSOPState(
        offerData.conversationId,
        this.SOP_STATES.ITEMS_LOCKED,
        `🔒 Both parties committed! Item is now locked. Proceed with contact exchange and meeting arrangement.`
      );
      
      // Notify both parties
      await NotificationService.notifyBothCommitted(
        offerData.sellerId,
        offerData.buyerId,
        offerData.itemTitle,
        offerData.offerAmount
      );
      
      console.log('✅ Liwa SOP: Both committed - ITEM NOW LOCKED');
      return {
        success: true,
        sopState: this.SOP_STATES.ITEMS_LOCKED,
        itemsLocked: true // NOW items are locked
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error buyer committing:', error);
      throw error;
    }
  }
  
  // Liwa SOP: Progress trade through exchange phases
  static async progressTradeSOP(tradeId, userId, newState, metadata = {}) {
    try {
      console.log(`📈 Liwa SOP: Progressing trade to ${newState}`);
      
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Verify user authorization
      if (!tradeData.participants.includes(userId)) {
        throw new Error('Unauthorized to update this trade');
      }
      
      // Update trade state
      const updateData = {
        sopState: newState,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: userId,
        ...metadata
      };
      
      // Add state-specific data
      switch (newState) {
        case this.SOP_STATES.CONTACT_EXCHANGED:
          updateData.contactExchangedAt = serverTimestamp();
          break;
        case this.SOP_STATES.MEETING_ARRANGED:
          updateData.meetingArrangedAt = serverTimestamp();
          break;
        case this.SOP_STATES.EXCHANGE_IN_PROGRESS:
          updateData.exchangeStartedAt = serverTimestamp();
          break;
      }
      
      await updateDoc(tradeRef, updateData);
      
      // Update conversation
      const stateMessages = {
        [this.SOP_STATES.CONTACT_EXCHANGED]: 'Contact information exchanged. Arrange your meeting!',
        [this.SOP_STATES.MEETING_ARRANGED]: 'Meeting arranged. Proceed with the exchange!',
        [this.SOP_STATES.EXCHANGE_IN_PROGRESS]: 'Exchange in progress. Mark as completed when done.'
      };
      
      await this.updateConversationSOPState(
        tradeData.conversationId,
        newState,
        stateMessages[newState] || `Trade updated to ${newState}`
      );
      
      console.log(`✅ Liwa SOP: Trade progressed to ${newState}`);
      return { success: true, sopState: newState };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error progressing trade:', error);
      throw error;
    }
  }

  // Liwa SOP: Share contact information
  static async shareContactInfoSOP(offerId, contactData) {
    try {
      console.log('📞 Liwa SOP: Sharing contact information');
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify user authorization
      if (!offerData.participants || !offerData.participants.includes(contactData.userId)) {
        throw new Error('Unauthorized to share contact for this trade');
      }
      
      // Update offer with contact information
      const contactUpdate = {
        [`contactInfo.${contactData.userId}`]: {
          ...contactData,
          sharedAt: serverTimestamp()
        },
        sopState: this.SOP_STATES.CONTACT_EXCHANGED,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(offerRef, contactUpdate);
      
      // Update conversation with contact sharing message
      const contactMethods = [];
      if (contactData.phoneNumber) contactMethods.push(`📞 ${contactData.phoneNumber}`);
      if (contactData.email) contactMethods.push(`📧 ${contactData.email}`);
      
      const contactMessage = `📞 ${contactData.userName} shared contact info:\n${contactMethods.join('\n')}` +
        (contactData.preferredContact ? `\n\nPreferred: ${contactData.preferredContact}` : '') +
        (contactData.additionalNotes ? `\n\nNotes: ${contactData.additionalNotes}` : '');
      
      await this.updateConversationSOPState(
        offerData.conversationId,
        this.SOP_STATES.CONTACT_EXCHANGED,
        contactMessage
      );
      
      // Notify the other party
      const otherUserId = offerData.sellerId === contactData.userId ? 
        offerData.buyerId : offerData.sellerId;
      
      await NotificationService.notifyContactShared(
        otherUserId,
        contactData.userName,
        contactMethods.join(', '),
        offerData.itemTitle
      );
      
      console.log('✅ Liwa SOP: Contact information shared successfully');
      return {
        success: true,
        sopState: this.SOP_STATES.CONTACT_EXCHANGED,
        contactData: contactData
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error sharing contact:', error);
      throw error;
    }
  }

  // Liwa SOP: Schedule meeting location and time
  static async scheduleMeetingSOP(offerId, meetingData) {
    try {
      console.log('📍 Liwa SOP: Scheduling meeting location');
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify trade is in correct state for meeting scheduling
      if (offerData.sopState !== this.SOP_STATES.BOTH_COMMITTED && 
          offerData.sopState !== this.SOP_STATES.CONTACT_EXCHANGED) {
        throw new Error('Trade must be committed before scheduling meeting');
      }
      
      // Update offer with meeting information
      await updateDoc(offerRef, {
        meetingLocation: meetingData.location,
        meetingDateTime: meetingData.dateTime,
        meetingNotes: meetingData.notes,
        safeZoneId: meetingData.safeZoneId,
        scheduledBy: meetingData.scheduledBy,
        scheduledAt: meetingData.scheduledAt,
        sopState: this.SOP_STATES.MEETING_ARRANGED,
        updatedAt: serverTimestamp()
      });
      
      // Update conversation with meeting details
      await this.updateConversationSOPState(
        offerData.conversationId,
        this.SOP_STATES.MEETING_ARRANGED,
        `📍 Meeting scheduled for ${meetingData.dateTime.toLocaleDateString()} at ${meetingData.dateTime.toLocaleTimeString()}\n` +
        `Location: ${meetingData.location.name}\n` +
        `${meetingData.notes ? `Notes: ${meetingData.notes}` : ''}`
      );
      
      // Notify the other party
      const otherUserId = offerData.sellerId === meetingData.scheduledBy ? 
        offerData.buyerId : offerData.sellerId;
      
      await NotificationService.notifyMeetingScheduled(
        otherUserId,
        meetingData.location.name,
        meetingData.dateTime,
        offerData.itemTitle
      );
      
      console.log('✅ Liwa SOP: Meeting scheduled successfully');
      return {
        success: true,
        sopState: this.SOP_STATES.MEETING_ARRANGED,
        meetingData: meetingData
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error scheduling meeting:', error);
      throw error;
    }
  }
  
  // Liwa SOP: Complete trade (unlock items)
  static async completeTradeSOP(tradeId, userId, completionProof = null) {
    try {
      console.log('🎉 Liwa SOP: Completing trade - UNLOCKING ITEMS');
      
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Verify user authorization
      if (!tradeData.participants.includes(userId)) {
        throw new Error('Unauthorized to complete this trade');
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
      
      // Check if both parties completed
      const otherPartyCompleted = isSellerCompleting ? tradeData.buyerCompleted : tradeData.sellerCompleted;
      
      if (otherPartyCompleted) {
        // Both completed - finalize trade
        updateData.sopState = this.SOP_STATES.TRADE_COMPLETED;
        updateData.completedAt = serverTimestamp();
        
        // Liwa SOP: UNLOCK ITEM (trade completed)
        await ItemLockingService.unlockItem(
          tradeData.itemId,
          tradeData.sellerId,
          'trade_completed_successfully'
        );
        
        // Update item status to sold
        await updateDoc(doc(db, 'items', tradeData.itemId), {
          status: 'sold',
          soldAt: serverTimestamp(),
          soldTo: tradeData.buyerId,
          finalPrice: tradeData.offerAmount
        });
        
        // Update user statistics
        await this.updateUserStatsSOP(tradeData.sellerId, tradeData.buyerId, tradeData.offerAmount);
        
      } else {
        // Waiting for other party
        updateData.sopState = isSellerCompleting ? 
          this.SOP_STATES.SELLER_CONFIRMED : 
          this.SOP_STATES.BUYER_CONFIRMED;
      }
      
      await updateDoc(tradeRef, updateData);
      
      // Update conversation
      const message = otherPartyCompleted ? 
        '🎉 Trade completed by both parties! Item unlocked and marked as sold.' :
        `Trade marked as completed by ${isSellerCompleting ? 'seller' : 'buyer'}. Waiting for other party confirmation.`;
        
      await this.updateConversationSOPState(
        tradeData.conversationId,
        updateData.sopState,
        message
      );
      
      console.log('✅ Liwa SOP: Trade completion processed');
      return {
        success: true,
        sopState: updateData.sopState,
        bothCompleted: otherPartyCompleted,
        itemUnlocked: otherPartyCompleted
      };
      
    } catch (error) {
      console.error('❌ Liwa SOP Error completing trade:', error);
      throw error;
    }
  }
  
  // Helper: Get accepted offers for item
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
  
  // Helper: Reject other offers when seller commits
  static async rejectOtherOffersSOP(itemId, selectedOfferId) {
    try {
      const acceptedOffers = await this.getAcceptedOffersForItem(itemId);
      
      for (const offer of acceptedOffers) {
        if (offer.id !== selectedOfferId) {
          await updateDoc(doc(db, 'offers', offer.id), {
            status: 'auto_rejected',
            rejectedAt: serverTimestamp(),
            rejectionReason: 'seller_committed_to_other_offer',
            sopState: this.SOP_STATES.TRADE_CANCELLED
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
  
  // Helper: Find offer ID for conversation
  static async findOfferIdForConversation(conversationId) {
    try {
      console.log('🔍 Finding offer ID for conversation:', conversationId);
      
      // Query offers collection for this conversation
      const offersQuery = query(
        collection(db, 'offers'),
        where('conversationId', '==', conversationId),
        where('status', '==', 'accepted'),
        orderBy('acceptedAt', 'desc'),
        limit(1)
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      
      if (!offersSnapshot.empty) {
        const offerDoc = offersSnapshot.docs[0];
        console.log('✅ Found offer ID:', offerDoc.id);
        return {
          offerId: offerDoc.id,
          offerData: offerDoc.data()
        };
      }
      
      console.log('❌ No offer found for conversation');
      return null;
      
    } catch (error) {
      console.error('❌ Error finding offer ID:', error);
      return null;
    }
  }

  // Helper: Create SOP tracking record
  static async createSOPRecord(offerData, hasMultipleOffers) {
    try {
      const sopData = {
        offerId: offerData.id,
        itemId: offerData.itemId,
        itemTitle: offerData.itemTitle,
        sellerId: offerData.sellerId,
        sellerName: offerData.sellerName,
        buyerId: offerData.buyerId,
        buyerName: offerData.buyerName,
        offerAmount: offerData.offerAmount,
        sopState: hasMultipleOffers ? this.SOP_STATES.MULTIPLE_OFFERS : this.SOP_STATES.OFFER_ACCEPTED,
        createdAt: serverTimestamp(),
        participants: [offerData.sellerId, offerData.buyerId],
        conversationId: offerData.conversationId,
        hasMultipleOffers,
        itemLocked: false, // Liwa SOP: Not locked until both commit
        commitmentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      
      await setDoc(doc(db, 'sopRecords', offerData.id), sopData);
      
    } catch (error) {
      console.error('Error creating SOP record:', error);
    }
  }
  
  // Helper: Create active trade record
  static async createActiveTradeRecordSOP(offerData) {
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
        sopState: this.SOP_STATES.ITEMS_LOCKED,
        participants: [offerData.sellerId, offerData.buyerId],
        conversationId: offerData.conversationId,
        createdAt: serverTimestamp(),
        itemLocked: true,
        itemLockedAt: serverTimestamp(),
        sellerCompleted: false,
        buyerCompleted: false
      };
      
      await setDoc(doc(db, 'activeTrades', offerData.id), tradeData);
      
    } catch (error) {
      console.error('Error creating active trade record:', error);
    }
  }
  
  // Helper: Update conversation with SOP state
  static async updateConversationSOPState(conversationId, sopState, message) {
    try {
      if (!conversationId) return;
      
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        sopState,
        lastMessage: message,
        lastMessageAt: serverTimestamp()
      });
      
      // Add system message
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: 'system',
        senderName: 'Liwa',
        text: message,
        messageType: 'sop_update',
        sopState,
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
      
    } catch (error) {
      console.error('Error updating conversation SOP state:', error);
    }
  }
  
  // Helper: Update user statistics
  static async updateUserStatsSOP(sellerId, buyerId, amount) {
    try {
      // Update seller stats
      const sellerRef = doc(db, 'users', sellerId);
      const sellerDoc = await getDoc(sellerRef);
      
      if (sellerDoc.exists()) {
        const sellerData = sellerDoc.data();
        await updateDoc(sellerRef, {
          totalSales: (sellerData.totalSales || 0) + 1,
          totalEarnings: (sellerData.totalEarnings || 0) + amount,
          lastSaleAt: serverTimestamp()
        });
      }
      
      // Update buyer stats
      const buyerRef = doc(db, 'users', buyerId);
      const buyerDoc = await getDoc(buyerRef);
      
      if (buyerDoc.exists()) {
        const buyerData = buyerDoc.data();
        await updateDoc(buyerRef, {
          totalPurchases: (buyerData.totalPurchases || 0) + 1,
          totalSpent: (buyerData.totalSpent || 0) + amount,
          lastPurchaseAt: serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }
  
  // Get SOP state info for UI
  static getSOPStateInfo(sopState) {
    const states = {
      [this.SOP_STATES.OFFER_MADE]: {
        icon: '📤',
        color: '#2196F3',
        title: 'Offer Made',
        description: 'Waiting for seller response'
      },
      [this.SOP_STATES.OFFER_ACCEPTED]: {
        icon: '✅',
        color: '#4CAF50',
        title: 'Offer Accepted',
        description: 'Both parties have 24h to commit'
      },
      [this.SOP_STATES.MULTIPLE_OFFERS]: {
        icon: '🔄',
        color: '#FF9500',
        title: 'Multiple Offers',
        description: 'Seller choosing within 24h'
      },
      [this.SOP_STATES.SELLER_COMMITTED]: {
        icon: '🤝',
        color: '#2196F3',
        title: 'Seller Committed',
        description: 'Waiting for buyer commitment'
      },
      [this.SOP_STATES.ITEMS_LOCKED]: {
        icon: '🔒',
        color: '#4CAF50',
        title: 'Items Locked',
        description: 'Both committed - proceed with exchange'
      },
      [this.SOP_STATES.CONTACT_EXCHANGED]: {
        icon: '📞',
        color: '#2196F3',
        title: 'Contact Exchanged',
        description: 'Arrange your meeting'
      },
      [this.SOP_STATES.MEETING_ARRANGED]: {
        icon: '📅',
        color: '#FF9500',
        title: 'Meeting Arranged',
        description: 'Proceed with exchange'
      },
      [this.SOP_STATES.EXCHANGE_IN_PROGRESS]: {
        icon: '🚚',
        color: '#2196F3',
        title: 'Exchange in Progress',
        description: 'Mark completed when done'
      },
      [this.SOP_STATES.TRADE_COMPLETED]: {
        icon: '🎉',
        color: '#4CAF50',
        title: 'Trade Completed',
        description: 'Successfully finished!'
      }
    };
    
    return states[sopState] || {
      icon: '❓',
      color: '#666',
      title: 'Unknown State',
      description: 'Contact support'
    };
  }

  // Liwa SOP: Check if reviews are needed after trade completion
  static async checkReviewEligibility(offerId, userId) {
    try {
      console.log('🔍 Checking review eligibility for completed trade');
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        return { eligible: false, reason: 'Trade not found' };
      }
      
      const offerData = offerDoc.data();
      
      // Check if trade is completed
      if (offerData.sopState !== 'trade_completed') {
        return { eligible: false, reason: 'Trade must be completed first' };
      }
      
      // Check if user is a participant
      if (!offerData.participants || !offerData.participants.includes(userId)) {
        return { eligible: false, reason: 'User not authorized for this trade' };
      }
      
      // Check if review already submitted
      const existingReview = await BlindReviewService.getExistingReview(offerId, userId);
      if (existingReview) {
        return { eligible: false, reason: 'Review already submitted' };
      }
      
      // Get other participant info
      const otherUserId = offerData.participants.find(id => id !== userId);
      
      return {
        eligible: true,
        tradeId: offerId,
        otherUserId: otherUserId,
        qrVerified: offerData.qrVerified || false,
        completionMethod: offerData.completionMethod || 'manual'
      };
      
    } catch (error) {
      console.error('❌ Error checking review eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }
}
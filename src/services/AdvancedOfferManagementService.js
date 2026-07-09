import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class AdvancedOfferManagementService {
  // Offer states
  static OFFER_STATES = {
    PENDING: 'pending',
    REJECTED: 'rejected',
    ACCEPTED: 'accepted',
    EXPIRED: 'expired',
    WITHDRAWN: 'withdrawn',
    VOIDED: 'voided',
    COMPLETED: 'completed'
  };

  // Anti-spam limits
  static REJECTION_LIMIT = 3;
  static THROTTLE_HOURS = 24;
  static OFFER_EXPIRY_HOURS = 72;
  static RESPONSE_TIMEOUT_HOURS = 24;

  // Calculate offer value for comparison
  static calculateOfferValue(offer) {
    let totalValue = offer.cashAmount || 0;
    
    // Add estimated value of offered items
    if (offer.offeredItems && offer.offeredItems.length > 0) {
      totalValue += offer.offeredItems.reduce((sum, item) => {
        return sum + (item.estimatedValue || 0);
      }, 0);
    }
    
    return totalValue;
  }

  // Validate if new offer is "better" than previous rejected offer
  static async validateBetterOffer(userId, itemId, newOffer) {
    try {
      // Get the most recent rejected offer from this user for this item
      const offersRef = collection(db, 'offers');
      const q = query(
        offersRef,
        where('buyerId', '==', userId),
        where('itemId', '==', itemId),
        where('status', '==', this.OFFER_STATES.REJECTED),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { isValid: true, reason: 'No previous rejected offers' };
      }
      
      const lastRejectedOffer = snapshot.docs[0].data();
      const lastOfferValue = this.calculateOfferValue(lastRejectedOffer);
      const newOfferValue = this.calculateOfferValue(newOffer);
      
      if (newOfferValue <= lastOfferValue) {
        return {
          isValid: false,
          reason: 'New offer must have higher value than previous rejected offer',
          previousValue: lastOfferValue,
          newValue: newOfferValue
        };
      }
      
      return { isValid: true, reason: 'Offer value increased' };
    } catch (error) {
      console.error('Error validating better offer:', error);
      throw error;
    }
  }

  // Check if user is throttled from making offers
  static async checkOfferThrottle(userId, itemId) {
    try {
      const offersRef = collection(db, 'offers');
      const q = query(
        offersRef,
        where('buyerId', '==', userId),
        where('itemId', '==', itemId),
        where('status', '==', this.OFFER_STATES.REJECTED),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.size >= this.REJECTION_LIMIT) {
        const lastRejection = snapshot.docs[0].data();
        const rejectionTime = lastRejection.updatedAt.toDate();
        const throttleEndTime = new Date(rejectionTime.getTime() + (this.THROTTLE_HOURS * 60 * 60 * 1000));
        
        if (new Date() < throttleEndTime) {
          return {
            isThrottled: true,
            throttleEndTime,
            rejectionCount: snapshot.size
          };
        }
      }
      
      return { isThrottled: false };
    } catch (error) {
      console.error('Error checking offer throttle:', error);
      throw error;
    }
  }

  // Submit a new offer with all validations
  static async submitOffer(offerData) {
    try {
      return await runTransaction(db, async (transaction) => {
        const { buyerId, itemId, sellerId } = offerData;
        
        // 1. Check if user is throttled
        const throttleCheck = await this.checkOfferThrottle(buyerId, itemId);
        if (throttleCheck.isThrottled) {
          throw new Error(`You've been throttled. Try again after ${throttleCheck.throttleEndTime.toLocaleString()}`);
        }
        
        // 2. Check if item is still available
        const itemRef = doc(db, 'items', itemId);
        const itemSnapshot = await transaction.get(itemRef);
        
        if (!itemSnapshot.exists()) {
          throw new Error('Item no longer exists');
        }
        
        const item = itemSnapshot.data();
        if (item.status !== 'available') {
          throw new Error('Item is no longer available');
        }
        
        // 3. Check for existing active offer from this user
        const offersRef = collection(db, 'offers');
        const activeOfferQuery = query(
          offersRef,
          where('buyerId', '==', buyerId),
          where('itemId', '==', itemId),
          where('status', '==', this.OFFER_STATES.PENDING)
        );
        
        const activeOfferSnapshot = await getDocs(activeOfferQuery);
        if (!activeOfferSnapshot.empty) {
          throw new Error('You already have an active offer for this item');
        }
        
        // 4. Validate "better offer" requirement
        const betterOfferCheck = await this.validateBetterOffer(buyerId, itemId, offerData);
        if (!betterOfferCheck.isValid) {
          throw new Error(betterOfferCheck.reason);
        }
        
        // 5. Validate bundle items availability
        if (offerData.offeredItems && offerData.offeredItems.length > 0) {
          for (const offeredItem of offerData.offeredItems) {
            const offeredItemRef = doc(db, 'items', offeredItem.id);
            const offeredItemSnapshot = await transaction.get(offeredItemRef);
            
            if (!offeredItemSnapshot.exists() || offeredItemSnapshot.data().status !== 'available') {
              throw new Error(`Offered item "${offeredItem.title}" is no longer available`);
            }
          }
        }
        
        // 6. Create the offer
        const newOfferRef = doc(collection(db, 'offers'));
        const offerToCreate = {
          ...offerData,
          id: newOfferRef.id,
          status: this.OFFER_STATES.PENDING,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + (this.OFFER_EXPIRY_HOURS * 60 * 60 * 1000)),
          offerValue: this.calculateOfferValue(offerData),
          rejectionCount: 0
        };
        
        transaction.set(newOfferRef, offerToCreate);
        
        // 7. Create system message in conversation
        await this.createOfferSystemMessage(transaction, {
          conversationId: offerData.conversationId,
          offerId: newOfferRef.id,
          type: 'offer_submitted',
          offerData: offerToCreate
        });
        
        return {
          success: true,
          offerId: newOfferRef.id,
          offer: offerToCreate
        };
      });
    } catch (error) {
      console.error('Error submitting offer:', error);
      throw error;
    }
  }

  // Reject an offer and enable "better offer" flow
  static async rejectOffer(offerId, sellerId, rejectionReason = '') {
    try {
      return await runTransaction(db, async (transaction) => {
        const offerRef = doc(db, 'offers', offerId);
        const offerSnapshot = await transaction.get(offerRef);
        
        if (!offerSnapshot.exists()) {
          throw new Error('Offer not found');
        }
        
        const offer = offerSnapshot.data();
        
        if (offer.sellerId !== sellerId) {
          throw new Error('Unauthorized to reject this offer');
        }
        
        if (offer.status !== this.OFFER_STATES.PENDING) {
          throw new Error('Offer is not in pending state');
        }
        
        // Update offer status
        const updatedOffer = {
          ...offer,
          status: this.OFFER_STATES.REJECTED,
          rejectionReason,
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rejectionCount: (offer.rejectionCount || 0) + 1
        };
        
        transaction.update(offerRef, updatedOffer);
        
        // Create system message
        await this.createOfferSystemMessage(transaction, {
          conversationId: offer.conversationId,
          offerId,
          type: 'offer_rejected',
          rejectionReason,
          offerData: updatedOffer
        });
        
        return {
          success: true,
          offer: updatedOffer,
          canMakeBetterOffer: updatedOffer.rejectionCount < this.REJECTION_LIMIT
        };
      });
    } catch (error) {
      console.error('Error rejecting offer:', error);
      throw error;
    }
  }

  // Accept an offer and void all other offers for the item
  static async acceptOffer(offerId, sellerId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const offerRef = doc(db, 'offers', offerId);
        const offerSnapshot = await transaction.get(offerRef);
        
        if (!offerSnapshot.exists()) {
          throw new Error('Offer not found');
        }
        
        const offer = offerSnapshot.data();
        
        if (offer.sellerId !== sellerId) {
          throw new Error('Unauthorized to accept this offer');
        }
        
        if (offer.status !== this.OFFER_STATES.PENDING) {
          throw new Error('Offer is not in pending state');
        }
        
        // 1. Update the accepted offer
        const acceptedOffer = {
          ...offer,
          status: this.OFFER_STATES.ACCEPTED,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        transaction.update(offerRef, acceptedOffer);
        
        // 2. Update item status to pending
        const itemRef = doc(db, 'items', offer.itemId);
        transaction.update(itemRef, {
          status: 'pending',
          pendingOfferId: offerId,
          updatedAt: serverTimestamp()
        });
        
        // 3. Void all other pending offers for this item
        const otherOffersQuery = query(
          collection(db, 'offers'),
          where('itemId', '==', offer.itemId),
          where('status', '==', this.OFFER_STATES.PENDING)
        );
        
        const otherOffersSnapshot = await getDocs(otherOffersQuery);
        const voidPromises = [];
        
        otherOffersSnapshot.docs.forEach(doc => {
          if (doc.id !== offerId) {
            const otherOffer = doc.data();
            transaction.update(doc.ref, {
              status: this.OFFER_STATES.VOIDED,
              voidedAt: serverTimestamp(),
              voidReason: 'Item no longer available - accepted different offer',
              updatedAt: serverTimestamp()
            });
            
            // Create system message for voided offers
            voidPromises.push(
              this.createOfferSystemMessage(transaction, {
                conversationId: otherOffer.conversationId,
                offerId: doc.id,
                type: 'offer_voided',
                offerData: otherOffer
              })
            );
          }
        });
        
        // 4. Create system message for accepted offer
        await this.createOfferSystemMessage(transaction, {
          conversationId: offer.conversationId,
          offerId,
          type: 'offer_accepted',
          offerData: acceptedOffer
        });
        
        // Wait for all void messages
        await Promise.all(voidPromises);
        
        return {
          success: true,
          offer: acceptedOffer,
          voidedOffersCount: otherOffersSnapshot.size - 1
        };
      });
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  }

  // Withdraw an offer (buyer action)
  static async withdrawOffer(offerId, buyerId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const offerRef = doc(db, 'offers', offerId);
        const offerSnapshot = await transaction.get(offerRef);
        
        if (!offerSnapshot.exists()) {
          throw new Error('Offer not found');
        }
        
        const offer = offerSnapshot.data();
        
        if (offer.buyerId !== buyerId) {
          throw new Error('Unauthorized to withdraw this offer');
        }
        
        if (offer.status !== this.OFFER_STATES.PENDING) {
          throw new Error('Can only withdraw pending offers');
        }
        
        // Update offer status
        const withdrawnOffer = {
          ...offer,
          status: this.OFFER_STATES.WITHDRAWN,
          withdrawnAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        transaction.update(offerRef, withdrawnOffer);
        
        // Create system message
        await this.createOfferSystemMessage(transaction, {
          conversationId: offer.conversationId,
          offerId,
          type: 'offer_withdrawn',
          offerData: withdrawnOffer
        });
        
        return {
          success: true,
          offer: withdrawnOffer
        };
      });
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      throw error;
    }
  }

  // Create system messages for offer actions
  static async createOfferSystemMessage(transaction, messageData) {
    const { conversationId, offerId, type, offerData, rejectionReason } = messageData;
    
    const messagesRef = collection(db, 'messages');
    const messageRef = doc(messagesRef);
    
    let messageText = '';
    let messageType = 'system';
    
    switch (type) {
      case 'offer_submitted':
        messageText = this.generateOfferSubmittedMessage(offerData);
        break;
      case 'offer_rejected':
        messageText = `Offer rejected${rejectionReason ? `: ${rejectionReason}` : ''}. You can send a better offer to continue negotiating.`;
        break;
      case 'offer_accepted':
        messageText = 'Offer accepted! 🎉 Let\'s arrange the exchange.';
        break;
      case 'offer_withdrawn':
        messageText = 'Offer has been withdrawn.';
        break;
      case 'offer_voided':
        messageText = 'This offer is no longer valid - the item has been traded with someone else.';
        break;
      case 'offer_expired':
        messageText = 'This offer has expired. You can submit a new offer if still interested.';
        break;
    }
    
    const systemMessage = {
      id: messageRef.id,
      conversationId,
      senderId: 'system',
      messageType,
      text: messageText,
      offerId,
      offerAction: type,
      offerData: {
        ...offerData,
        createdAt: offerData.createdAt || serverTimestamp(),
        updatedAt: offerData.updatedAt || serverTimestamp()
      },
      createdAt: serverTimestamp(),
      isSystemMessage: true
    };
    
    transaction.set(messageRef, systemMessage);
    
    // Update conversation last message
    const conversationRef = doc(db, 'conversations', conversationId);
    transaction.update(conversationRef, {
      lastMessage: messageText,
      lastMessageAt: serverTimestamp(),
      lastMessageType: 'system'
    });
  }

  // Generate offer submitted message
  static generateOfferSubmittedMessage(offerData) {
    let message = 'New offer submitted: ';
    
    if (offerData.offeredItems && offerData.offeredItems.length > 0) {
      const itemNames = offerData.offeredItems.map(item => item.title).join(', ');
      message += itemNames;
      
      if (offerData.cashAmount > 0) {
        message += ` + $${offerData.cashAmount}`;
      }
    } else if (offerData.cashAmount > 0) {
      message += `$${offerData.cashAmount}`;
    }
    
    return message;
  }

  // Get offer history for an item
  static async getOfferHistory(itemId, userId = null) {
    try {
      const offersRef = collection(db, 'offers');
      let q = query(
        offersRef,
        where('itemId', '==', itemId),
        orderBy('createdAt', 'desc')
      );
      
      if (userId) {
        q = query(
          offersRef,
          where('itemId', '==', itemId),
          where('buyerId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting offer history:', error);
      throw error;
    }
  }

  // Check if user can make an offer
  static async canMakeOffer(userId, itemId) {
    try {
      // Check throttle
      const throttleCheck = await this.checkOfferThrottle(userId, itemId);
      if (throttleCheck.isThrottled) {
        return {
          canMake: false,
          reason: 'throttled',
          throttleEndTime: throttleCheck.throttleEndTime
        };
      }
      
      // Check for existing active offer
      const offersRef = collection(db, 'offers');
      const activeOfferQuery = query(
        offersRef,
        where('buyerId', '==', userId),
        where('itemId', '==', itemId),
        where('status', '==', this.OFFER_STATES.PENDING)
      );
      
      const activeOfferSnapshot = await getDocs(activeOfferQuery);
      if (!activeOfferSnapshot.empty) {
        return {
          canMake: false,
          reason: 'active_offer_exists',
          activeOfferId: activeOfferSnapshot.docs[0].id
        };
      }
      
      return { canMake: true };
    } catch (error) {
      console.error('Error checking if can make offer:', error);
      throw error;
    }
  }

  // Expire old offers (to be run periodically)
  static async expireOldOffers() {
    try {
      const now = new Date();
      const offersRef = collection(db, 'offers');
      const expiredQuery = query(
        offersRef,
        where('status', '==', this.OFFER_STATES.PENDING),
        where('expiresAt', '<', now)
      );
      
      const expiredSnapshot = await getDocs(expiredQuery);
      const batch = writeBatch(db);
      
      expiredSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: this.OFFER_STATES.EXPIRED,
          expiredAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      if (expiredSnapshot.size > 0) {
        await batch.commit();
      }
      
      return {
        success: true,
        expiredCount: expiredSnapshot.size
      };
    } catch (error) {
      console.error('Error expiring old offers:', error);
      throw error;
    }
  }

  // Handle ghosting protection (seller can cancel acceptance if buyer doesn't respond)
  static async handleGhostingProtection(offerId, sellerId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const offerRef = doc(db, 'offers', offerId);
        const offerSnapshot = await transaction.get(offerRef);
        
        if (!offerSnapshot.exists()) {
          throw new Error('Offer not found');
        }
        
        const offer = offerSnapshot.data();
        
        if (offer.sellerId !== sellerId) {
          throw new Error('Unauthorized');
        }
        
        if (offer.status !== this.OFFER_STATES.ACCEPTED) {
          throw new Error('Offer is not in accepted state');
        }
        
        // Check if enough time has passed
        const acceptedTime = offer.acceptedAt.toDate();
        const timeoutTime = new Date(acceptedTime.getTime() + (this.RESPONSE_TIMEOUT_HOURS * 60 * 60 * 1000));
        
        if (new Date() < timeoutTime) {
          throw new Error('Cannot cancel yet - buyer still has time to respond');
        }
        
        // Cancel the acceptance and reopen item
        transaction.update(offerRef, {
          status: this.OFFER_STATES.EXPIRED,
          cancelledAt: serverTimestamp(),
          cancelReason: 'Buyer did not respond within 24 hours',
          updatedAt: serverTimestamp()
        });
        
        // Reopen the item
        const itemRef = doc(db, 'items', offer.itemId);
        transaction.update(itemRef, {
          status: 'available',
          pendingOfferId: null,
          updatedAt: serverTimestamp()
        });
        
        // Create system message
        await this.createOfferSystemMessage(transaction, {
          conversationId: offer.conversationId,
          offerId,
          type: 'offer_expired',
          offerData: offer
        });
        
        return {
          success: true,
          message: 'Offer cancelled due to buyer non-response. Item is now available again.'
        };
      });
    } catch (error) {
      console.error('Error handling ghosting protection:', error);
      throw error;
    }
  }
}
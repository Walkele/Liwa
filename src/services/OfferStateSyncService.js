import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
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

export class OfferStateSyncService {
  // Synchronize offer states across all UI components
  static async syncOfferStates(itemId) {
    try {
      console.log(`🔄 Syncing offer states for item: ${itemId}`);
      
      return await runTransaction(db, async (transaction) => {
        // Get all offers for this item
        const offersQuery = query(
          collection(db, 'offers'),
          where('itemId', '==', itemId),
          orderBy('createdAt', 'desc')
        );
        const offersSnapshot = await getDocs(offersQuery);
        
        const offers = offersSnapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          ...doc.data()
        }));
        
        // Get item document
        const itemRef = doc(db, 'items', itemId);
        const itemSnapshot = await transaction.get(itemRef);
        
        if (!itemSnapshot.exists()) {
          throw new Error('Item not found');
        }
        
        const item = itemSnapshot.data();
        let itemNeedsUpdate = false;
        const itemUpdates = {};
        
        // Process each offer and ensure state consistency
        for (const offer of offers) {
          const offerUpdates = {};
          let needsUpdate = false;
          
          // Fix missing timestamps based on status
          if (offer.status === 'rejected' && !offer.rejectedAt) {
            offerUpdates.rejectedAt = serverTimestamp();
            offerUpdates.updatedAt = serverTimestamp();
            needsUpdate = true;
          }
          
          if (offer.status === 'accepted' && !offer.acceptedAt) {
            offerUpdates.acceptedAt = serverTimestamp();
            offerUpdates.updatedAt = serverTimestamp();
            needsUpdate = true;
          }
          
          if (offer.status === 'withdrawn' && !offer.withdrawnAt) {
            offerUpdates.withdrawnAt = serverTimestamp();
            offerUpdates.updatedAt = serverTimestamp();
            needsUpdate = true;
          }
          
          // Fix inconsistent states
          if (offer.rejectedAt && offer.status === 'pending') {
            offerUpdates.status = 'rejected';
            offerUpdates.updatedAt = serverTimestamp();
            needsUpdate = true;
          }
          
          if (offer.acceptedAt && offer.status === 'pending') {
            offerUpdates.status = 'accepted';
            offerUpdates.updatedAt = serverTimestamp();
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            transaction.update(offer.ref, offerUpdates);
          }
        }
        
        // Update item status based on offers
        const activeOffers = offers.filter(o => o.status === 'pending');
        const acceptedOffers = offers.filter(o => o.status === 'accepted');
        
        if (acceptedOffers.length > 0) {
          // Item should be pending if there's an accepted offer
          if (item.status !== 'pending') {
            itemUpdates.status = 'pending';
            itemUpdates.pendingOfferId = acceptedOffers[0].id;
            itemNeedsUpdate = true;
          }
        } else if (activeOffers.length === 0 && item.status === 'pending') {
          // Item should be available if no active/accepted offers
          itemUpdates.status = 'available';
          itemUpdates.pendingOfferId = null;
          itemNeedsUpdate = true;
        }
        
        if (itemNeedsUpdate) {
          itemUpdates.updatedAt = serverTimestamp();
          transaction.update(itemRef, itemUpdates);
        }
        
        return {
          success: true,
          offersProcessed: offers.length,
          itemUpdated: itemNeedsUpdate
        };
      });
    } catch (error) {
      console.error('Error syncing offer states:', error);
      throw error;
    }
  }

  // Get current offer status for a user on an item
  static async getUserOfferStatus(userId, itemId) {
    try {
      const offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userId),
        where('itemId', '==', itemId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      
      if (offersSnapshot.empty) {
        return {
          hasOffer: false,
          canMakeOffer: true,
          status: null,
          lastOffer: null
        };
      }
      
      const lastOffer = {
        id: offersSnapshot.docs[0].id,
        ...offersSnapshot.docs[0].data()
      };
      
      // Determine what actions are available
      let canMakeOffer = false;
      let canMakeBetterOffer = false;
      let canWithdraw = false;
      
      switch (lastOffer.status) {
        case 'pending':
          canWithdraw = true;
          break;
        case 'rejected':
          canMakeBetterOffer = true;
          // Check if user is throttled
          const rejectionCount = lastOffer.rejectionCount || 0;
          if (rejectionCount >= 3) {
            const rejectedAt = lastOffer.rejectedAt?.toDate();
            const throttleEndTime = new Date(rejectedAt.getTime() + (24 * 60 * 60 * 1000));
            if (new Date() < throttleEndTime) {
              canMakeBetterOffer = false;
            }
          }
          break;
        case 'accepted':
        case 'completed':
          // No actions available
          break;
        case 'expired':
        case 'withdrawn':
        case 'voided':
          canMakeOffer = true;
          break;
      }
      
      return {
        hasOffer: true,
        canMakeOffer,
        canMakeBetterOffer,
        canWithdraw,
        status: lastOffer.status,
        lastOffer,
        rejectionCount: lastOffer.rejectionCount || 0
      };
    } catch (error) {
      console.error('Error getting user offer status:', error);
      throw error;
    }
  }

  // Update UI state based on offer status
  static getUIState(offerStatus, isOwner = false) {
    if (isOwner) {
      // Item owner UI states
      switch (offerStatus?.status) {
        case 'pending':
          return {
            showAcceptReject: true,
            buttonText: 'Respond to Offer',
            buttonColor: '#FF6B6B',
            statusText: 'Offer Pending',
            statusColor: '#FF9800'
          };
        case 'accepted':
          return {
            showAcceptReject: false,
            buttonText: 'Arrange Meetup',
            buttonColor: '#4CAF50',
            statusText: 'Offer Accepted',
            statusColor: '#4CAF50'
          };
        default:
          return {
            showAcceptReject: false,
            buttonText: 'No Active Offers',
            buttonColor: '#CCC',
            statusText: 'Available',
            statusColor: '#4CAF50'
          };
      }
    } else {
      // Buyer UI states
      if (!offerStatus?.hasOffer) {
        return {
          showMakeOffer: true,
          buttonText: 'Make Offer',
          buttonColor: '#FF6B6B',
          statusText: 'Available',
          statusColor: '#4CAF50'
        };
      }
      
      switch (offerStatus.status) {
        case 'pending':
          return {
            showMakeOffer: false,
            showWithdraw: true,
            buttonText: 'Withdraw Offer',
            buttonColor: '#FF9800',
            statusText: 'Offer Pending',
            statusColor: '#FF9800'
          };
        case 'rejected':
          return {
            showMakeOffer: false,
            showBetterOffer: offerStatus.canMakeBetterOffer,
            buttonText: offerStatus.canMakeBetterOffer ? 'Make Better Offer' : 'Throttled (24h)',
            buttonColor: offerStatus.canMakeBetterOffer ? '#FF6B6B' : '#CCC',
            statusText: 'Offer Rejected',
            statusColor: '#F44336',
            rejectionReason: offerStatus.lastOffer?.rejectionReason
          };
        case 'accepted':
          return {
            showMakeOffer: false,
            buttonText: 'Arrange Meetup',
            buttonColor: '#4CAF50',
            statusText: 'Offer Accepted',
            statusColor: '#4CAF50'
          };
        case 'expired':
        case 'withdrawn':
        case 'voided':
          return {
            showMakeOffer: true,
            buttonText: 'Make New Offer',
            buttonColor: '#FF6B6B',
            statusText: 'Available',
            statusColor: '#4CAF50'
          };
        default:
          return {
            showMakeOffer: true,
            buttonText: 'Make Offer',
            buttonColor: '#FF6B6B',
            statusText: 'Available',
            statusColor: '#4CAF50'
          };
      }
    }
  }

  // Validate better offer requirements
  static async validateBetterOffer(userId, itemId, newOfferValue) {
    try {
      const offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userId),
        where('itemId', '==', itemId),
        where('status', '==', 'rejected'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      
      if (offersSnapshot.empty) {
        return { isValid: true, reason: 'No previous rejected offers' };
      }
      
      const lastRejectedOffer = offersSnapshot.docs[0].data();
      const lastOfferValue = this.calculateOfferValue(lastRejectedOffer);
      
      if (newOfferValue <= lastOfferValue) {
        return {
          isValid: false,
          reason: `New offer ($${newOfferValue}) must be higher than previous rejected offer ($${lastOfferValue})`,
          previousValue: lastOfferValue,
          newValue: newOfferValue,
          minimumRequired: lastOfferValue + 1
        };
      }
      
      return { 
        isValid: true, 
        reason: 'Offer value increased',
        previousValue: lastOfferValue,
        newValue: newOfferValue,
        improvement: newOfferValue - lastOfferValue
      };
    } catch (error) {
      console.error('Error validating better offer:', error);
      throw error;
    }
  }

  // Calculate total offer value
  static calculateOfferValue(offer) {
    let totalValue = offer.cashAmount || 0;
    
    if (offer.offeredItems && offer.offeredItems.length > 0) {
      totalValue += offer.offeredItems.reduce((sum, item) => {
        return sum + (item.estimatedValue || 0);
      }, 0);
    }
    
    return totalValue;
  }

  // Create system message for offer state changes
  static async createOfferStateMessage(conversationId, messageType, offerData) {
    try {
      const messagesRef = collection(db, 'messages');
      const messageRef = doc(messagesRef);
      
      let messageText = '';
      let messageColor = '#666';
      
      switch (messageType) {
        case 'offer_submitted':
          messageText = `New offer submitted: ${this.formatOfferSummary(offerData)}`;
          messageColor = '#FF6B6B';
          break;
        case 'offer_rejected':
          messageText = `Offer rejected${offerData.rejectionReason ? `: ${offerData.rejectionReason}` : ''}. You can make a better offer to continue negotiating.`;
          messageColor = '#F44336';
          break;
        case 'offer_accepted':
          messageText = 'Offer accepted! 🎉 Time to arrange the exchange.';
          messageColor = '#4CAF50';
          break;
        case 'offer_withdrawn':
          messageText = 'Offer has been withdrawn.';
          messageColor = '#FF9800';
          break;
        case 'better_offer_submitted':
          messageText = `Updated offer: ${this.formatOfferSummary(offerData)} (improved by $${offerData.improvement || 0})`;
          messageColor = '#FF6B6B';
          break;
      }
      
      const systemMessage = {
        id: messageRef.id,
        conversationId,
        senderId: 'system',
        messageType: 'system',
        text: messageText,
        offerData,
        messageColor,
        createdAt: serverTimestamp(),
        isSystemMessage: true,
        offerAction: messageType
      };
      
      await setDoc(messageRef, systemMessage);
      
      // Update conversation last message
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        lastMessageType: 'system'
      });
      
      return systemMessage;
    } catch (error) {
      console.error('Error creating offer state message:', error);
      throw error;
    }
  }

  // Format offer summary for messages
  static formatOfferSummary(offerData) {
    let summary = '';
    
    if (offerData.offeredItems && offerData.offeredItems.length > 0) {
      const itemNames = offerData.offeredItems.map(item => item.title).join(', ');
      summary += itemNames;
      
      if (offerData.cashAmount > 0) {
        summary += ` + $${offerData.cashAmount}`;
      }
    } else if (offerData.cashAmount > 0) {
      summary += `$${offerData.cashAmount}`;
    }
    
    return summary || 'No items or cash offered';
  }

  // Fix all inconsistent offer states in the database
  static async fixAllOfferStates() {
    try {
      console.log('🔧 Fixing all inconsistent offer states...');
      
      const offersRef = collection(db, 'offers');
      const offersSnapshot = await getDocs(offersRef);
      
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      for (const offerDoc of offersSnapshot.docs) {
        const offer = offerDoc.data();
        const updates = {};
        let needsUpdate = false;
        
        // Fix status based on timestamps
        if (offer.rejectedAt && offer.status === 'pending') {
          updates.status = 'rejected';
          updates.updatedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (offer.acceptedAt && offer.status === 'pending') {
          updates.status = 'accepted';
          updates.updatedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (offer.withdrawnAt && offer.status === 'pending') {
          updates.status = 'withdrawn';
          updates.updatedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        // Fix missing timestamps
        if (offer.status === 'rejected' && !offer.rejectedAt) {
          updates.rejectedAt = serverTimestamp();
          updates.updatedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (offer.status === 'accepted' && !offer.acceptedAt) {
          updates.acceptedAt = serverTimestamp();
          updates.updatedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          batch.update(offerDoc.ref, updates);
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Fixed ${fixedCount} inconsistent offer states`);
      return { success: true, fixedCount };
    } catch (error) {
      console.error('Error fixing all offer states:', error);
      throw error;
    }
  }
}
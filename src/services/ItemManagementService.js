import { doc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ItemManagementService {
  
  // Item Status Management
  static async lockItem(itemId, userId, reason = 'manual_lock') {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: 'locked',
        lockedBy: userId,
        lockedAt: new Date(),
        lockReason: reason
      });
      
      // Cancel all pending offers and trade proposals for this item
      await this.cancelPendingActions(itemId, reason);
      
      return { success: true };
    } catch (error) {
      console.error('Error locking item:', error);
      return { success: false, error: error.message };
    }
  }

  static async unlockItem(itemId) {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: 'available',
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
        unlockedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error unlocking item:', error);
      return { success: false, error: error.message };
    }
  }

  static async archiveItem(itemId, userId, reason = 'user_archived') {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: 'archived',
        archivedBy: userId,
        archivedAt: new Date(),
        archiveReason: reason
      });
      
      // Cancel all pending actions
      await this.cancelPendingActions(itemId, 'item_archived');
      
      return { success: true };
    } catch (error) {
      console.error('Error archiving item:', error);
      return { success: false, error: error.message };
    }
  }

  static async markAsSold(itemId, buyerId = null, salePrice = null) {
    try {
      const updateData = {
        status: 'sold',
        soldAt: new Date(),
        soldPrice: salePrice
      };
      
      if (buyerId) {
        updateData.soldTo = buyerId;
      }
      
      await updateDoc(doc(db, 'items', itemId), updateData);
      
      // Cancel all pending actions
      await this.cancelPendingActions(itemId, 'item_sold');
      
      return { success: true };
    } catch (error) {
      console.error('Error marking item as sold:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel all pending offers and trade proposals
  static async cancelPendingActions(itemId, reason) {
    try {
      // Cancel pending offers
      const offersQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId),
        where('status', '==', 'pending')
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      const offerUpdates = offersSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason
        })
      );
      
      // Cancel pending trade proposals
      const proposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('targetItemId', '==', itemId),
        where('status', '==', 'pending')
      );
      
      const proposalsSnapshot = await getDocs(proposalsQuery);
      const proposalUpdates = proposalsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason
        })
      );
      
      await Promise.all([...offerUpdates, ...proposalUpdates]);
      
    } catch (error) {
      console.error('Error cancelling pending actions:', error);
    }
  }

  // Conflict Resolution
  static async handleMultipleOffers(itemId, acceptedOfferId) {
    try {
      // Get all pending offers for this item
      const offersQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(offersQuery);
      const updates = [];
      
      snapshot.docs.forEach(doc => {
        if (doc.id === acceptedOfferId) {
          // Accept the chosen offer
          updates.push(updateDoc(doc.ref, {
            status: 'accepted',
            acceptedAt: new Date()
          }));
        } else {
          // Auto-reject all other offers
          updates.push(updateDoc(doc.ref, {
            status: 'auto_rejected',
            rejectedAt: new Date(),
            rejectionReason: 'other_offer_accepted'
          }));
        }
      });
      
      await Promise.all(updates);
      
      // Lock the item for the accepted buyer
      const acceptedOffer = snapshot.docs.find(doc => doc.id === acceptedOfferId);
      if (acceptedOffer) {
        await this.lockItem(itemId, acceptedOffer.data().buyerId, 'offer_accepted');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error handling multiple offers:', error);
      return { success: false, error: error.message };
    }
  }

  // User Action Validation
  static async validateUserAction(userId, itemId, actionType) {
    try {
      const validations = {
        canOffer: true,
        canTrade: true,
        canMessage: true,
        reasons: []
      };

      // Check existing offers
      const offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userId),
        where('itemId', '==', itemId),
        where('status', 'in', ['pending', 'accepted'])
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      if (!offersSnapshot.empty) {
        validations.canOffer = false;
        validations.reasons.push('You already have a pending or accepted offer for this item');
      }

      // Check existing trade proposals
      const proposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userId),
        where('targetItemId', '==', itemId),
        where('status', 'in', ['pending', 'accepted'])
      );
      
      const proposalsSnapshot = await getDocs(proposalsQuery);
      if (!proposalsSnapshot.empty) {
        validations.canTrade = false;
        validations.reasons.push('You already have a pending or accepted trade proposal for this item');
      }

      return validations;
    } catch (error) {
      console.error('Error validating user action:', error);
      return {
        canOffer: false,
        canTrade: false,
        canMessage: true,
        reasons: ['Error validating action']
      };
    }
  }

  // Cleanup expired offers/proposals
  static async cleanupExpiredActions() {
    try {
      const expirationTime = new Date();
      expirationTime.setDate(expirationTime.getDate() - 7); // 7 days ago

      // Expire old pending offers
      const expiredOffersQuery = query(
        collection(db, 'offers'),
        where('status', '==', 'pending'),
        where('createdAt', '<', expirationTime)
      );
      
      const expiredOffersSnapshot = await getDocs(expiredOffersQuery);
      const offerUpdates = expiredOffersSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'expired',
          expiredAt: new Date()
        })
      );

      // Expire old pending trade proposals
      const expiredProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('status', '==', 'pending'),
        where('createdAt', '<', expirationTime)
      );
      
      const expiredProposalsSnapshot = await getDocs(expiredProposalsQuery);
      const proposalUpdates = expiredProposalsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'expired',
          expiredAt: new Date()
        })
      );

      await Promise.all([...offerUpdates, ...proposalUpdates]);
      
      return { 
        success: true, 
        expiredOffers: expiredOffersSnapshot.size,
        expiredProposals: expiredProposalsSnapshot.size
      };
    } catch (error) {
      console.error('Error cleaning up expired actions:', error);
      return { success: false, error: error.message };
    }
  }

  // Get item status with all related actions
  static async getItemStatus(itemId) {
    try {
      // Get pending offers
      const offersQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId),
        where('status', 'in', ['pending', 'accepted'])
      );
      const offersSnapshot = await getDocs(offersQuery);
      
      // Get pending trade proposals
      const proposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('targetItemId', '==', itemId),
        where('status', 'in', ['pending', 'accepted'])
      );
      const proposalsSnapshot = await getDocs(proposalsQuery);
      
      return {
        pendingOffers: offersSnapshot.size,
        pendingTradeProposals: proposalsSnapshot.size,
        offers: offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        tradeProposals: proposalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
    } catch (error) {
      console.error('Error getting item status:', error);
      return {
        pendingOffers: 0,
        pendingTradeProposals: 0,
        offers: [],
        tradeProposals: []
      };
    }
  }
}
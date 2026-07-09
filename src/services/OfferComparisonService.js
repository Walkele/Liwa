import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Offer Comparison Service
 * 
 * Implements a sophisticated offer management system inspired by:
 * - eBay: Offer/counter-offer system with time limits
 * - Mercari: Make offer feature with seller approval
 * - StockX: Bid/ask system with transparency
 * 
 * Item States:
 * - available: Item is fully available for all offers
 * - soft_locked: Item has active negotiation but can receive other offers with penalties
 * - hard_locked: Item is committed to a specific trade (after both parties commit)
 * - sold: Item has been successfully traded
 */
export class OfferComparisonService {
  
  static ITEM_STATES = {
    AVAILABLE: 'available',
    SOFT_LOCKED: 'soft_locked',
    HARD_LOCKED: 'hard_locked',
    SOLD: 'sold'
  };

  static PENALTIES = {
    SOFT_LOCK_NEGOTIATION: {
      trustScoreImpact: -2,
      description: 'Negotiating on soft-locked item'
    },
    OUTBID_SOFT_LOCK: {
      trustScoreImpact: 0,
      bonus: +5,
      description: 'Successfully outbid on soft-locked item'
    },
    CANCEL_SOFT_LOCK: {
      trustScoreImpact: -3,
      description: 'Cancelling soft-locked negotiation'
    }
  };

  /**
   * Get all offers for a specific item
   */
  static async getItemOffers(itemId) {
    try {
      const offersRef = collection(db, 'offers');
      const q = query(
        offersRef,
        where('itemId', '==', itemId),
        where('status', 'in', ['pending', 'counter_offered', 'accepted'])
      );
      
      const snapshot = await getDocs(q);
      const offers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return this.rankOffers(offers);
    } catch (error) {
      console.error('Error getting item offers:', error);
      throw error;
    }
  }

  /**
   * Rank offers by attractiveness (value, cash amount, item match)
   */
  static rankOffers(offers) {
    return offers.sort((a, b) => {
      // Priority: cash amount > item value > recency
      const aScore = this.calculateOfferScore(a);
      const bScore = this.calculateOfferScore(b);
      return bScore - aScore;
    });
  }

  /**
   * Calculate offer score for ranking
   */
  static calculateOfferScore(offer) {
    let score = 0;
    
    // Cash offers get higher score
    if (offer.cashAmount) {
      score += offer.cashAmount * 10;
    }
    
    // Item trades get moderate score
    if (offer.offerType === 'item') {
      score += (offer.estimatedValue || 0) * 8;
    }
    
    // Recent offers get slight boost
    if (offer.createdAt) {
      const daysSinceCreation = (Date.now() - offer.createdAt.toDate()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceCreation);
    }
    
    // Accepted offers get highest priority
    if (offer.status === 'accepted') {
      score += 1000;
    }
    
    return score;
  }

  /**
   * Soft lock an item when trade proposal is accepted
   */
  static async softLockItem(itemId, tradeId, lockedByUserId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: this.ITEM_STATES.SOFT_LOCKED,
        lockedBy: lockedByUserId,
        lockedAt: serverTimestamp(),
        lockedByTrade: tradeId,
        previousStatus: 'available'
      });
      
      console.log(`Item ${itemId} soft-locked by user ${lockedByUserId}`);
    } catch (error) {
      console.error('Error soft-locking item:', error);
      throw error;
    }
  }

  /**
   * Hard lock an item when both parties commit
   */
  static async hardLockItem(itemId, tradeId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: this.ITEM_STATES.HARD_LOCKED,
        lockedAt: serverTimestamp(),
        previousStatus: this.ITEM_STATES.SOFT_LOCKED
      });
      
      console.log(`Item ${itemId} hard-locked for trade ${tradeId}`);
    } catch (error) {
      console.error('Error hard-locking item:', error);
      throw error;
    }
  }

  /**
   * Unlock item when trade is cancelled
   */
  static async unlockItem(itemId, cancelReason, cancelStage) {
    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: this.ITEM_STATES.AVAILABLE,
        lockedBy: null,
        lockedAt: null,
        lockedByTrade: null,
        cancelReason,
        cancelStage,
        unlockedAt: serverTimestamp()
      });
      
      console.log(`Item ${itemId} unlocked due to: ${cancelReason}`);
    } catch (error) {
      console.error('Error unlocking item:', error);
      throw error;
    }
  }

  /**
   * Mark item as sold after successful trade
   */
  static async markItemSold(itemId, tradeId, buyerId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: this.ITEM_STATES.SOLD,
        soldAt: serverTimestamp(),
        soldTo: buyerId,
        soldInTrade: tradeId
      });
      
      console.log(`Item ${itemId} sold to user ${buyerId}`);
    } catch (error) {
      console.error('Error marking item sold:', error);
      throw error;
    }
  }

  /**
   * Check if item is available for new offers
   */
  static async checkItemAvailability(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        return { available: false, reason: 'Item not found' };
      }
      
      const item = itemSnap.data();
      const status = item.status || this.ITEM_STATES.AVAILABLE;
      
      if (status === this.ITEM_STATES.SOLD) {
        return { available: false, reason: 'Item already sold' };
      }
      
      if (status === this.ITEM_STATES.HARD_LOCKED) {
        return { available: false, reason: 'Item committed to active trade' };
      }
      
      if (status === this.ITEM_STATES.SOFT_LOCKED) {
        return { 
          available: true, 
          softLocked: true,
          lockedBy: item.lockedBy,
          penalty: this.PENALTIES.SOFT_LOCK_NEGOTIATION
        };
      }
      
      return { available: true, softLocked: false };
    } catch (error) {
      console.error('Error checking item availability:', error);
      throw error;
    }
  }

  /**
   * Get offer comparison data for user
   */
  static async getOfferComparisonData(userId, itemId) {
    try {
      const offers = await this.getItemOffers(itemId);
      const availability = await this.checkItemAvailability(itemId);
      
      return {
        offers,
        availability,
        userOffers: offers.filter(o => o.senderId === userId),
        topOffer: offers[0] || null,
        offerCount: offers.length
      };
    } catch (error) {
      console.error('Error getting offer comparison data:', error);
      throw error;
    }
  }

  /**
   * Listen to item status changes
   */
  static listenToItemStatus(itemId, callback) {
    const itemRef = doc(db, 'items', itemId);
    return onSnapshot(itemRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });
  }

  /**
   * Create a competing offer on soft-locked item
   */
  static async createCompetingOffer(itemId, offerData, userId) {
    try {
      const availability = await this.checkItemAvailability(itemId);
      
      if (!availability.available) {
        throw new Error(availability.reason);
      }
      
      // Apply penalty for soft-locked negotiation
      let penaltyInfo = null;
      if (availability.softLocked) {
        penaltyInfo = this.PENALTIES.SOFT_LOCK_NEGOTIATION;
      }
      
      const offerRef = await addDoc(collection(db, 'offers'), {
        ...offerData,
        itemId,
        senderId: userId,
        status: 'pending',
        createdAt: serverTimestamp(),
        isCompetingOffer: availability.softLocked,
        competingWithUserId: availability.lockedBy,
        penaltyApplied: penaltyInfo
      });
      
      console.log(`Competing offer created: ${offerRef.id}`);
      return { offerId: offerRef.id, penaltyInfo };
    } catch (error) {
      console.error('Error creating competing offer:', error);
      throw error;
    }
  }

  /**
   * Accept new offer and cancel soft-locked trade
   */
  static async acceptCompetingOffer(newOfferId, softLockedTradeId, userId) {
    try {
      // Update the new offer to accepted
      const newOfferRef = doc(db, 'offers', newOfferId);
      await updateDoc(newOfferRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        outbidPreviousTrade: softLockedTradeId
      });
      
      // Cancel the soft-locked trade
      const tradeRef = doc(db, 'trades', softLockedTradeId);
      await updateDoc(tradeRef, {
        status: 'outbid',
        outbidByOffer: newOfferId,
        outbidAt: serverTimestamp(),
        outbidReason: 'Better offer received'
      });
      
      // Unlock the item
      const tradeSnap = await getDoc(tradeRef);
      const tradeData = tradeSnap.data();
      await this.unlockItem(tradeData.itemId, 'Outbid by better offer', 'soft_locked');
      
      // Apply bonus for outbidding
      const bonusInfo = this.PENALTIES.OUTBID_SOFT_LOCK;
      
      console.log(`Offer ${newOfferId} accepted, soft-locked trade ${softLockedTradeId} cancelled`);
      return { success: true, bonusInfo };
    } catch (error) {
      console.error('Error accepting competing offer:', error);
      throw error;
    }
  }
}

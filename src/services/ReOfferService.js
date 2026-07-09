import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ReOfferService {
  
  // Re-offer cooldown periods (in hours)
  static COOLDOWN_PERIODS = {
    FIRST_DECLINE: 2,    // 2 hours after first decline
    SECOND_DECLINE: 6,   // 6 hours after second decline
    THIRD_DECLINE: 24,   // 24 hours after third decline
    MAX_DECLINE: 72      // 72 hours after 4+ declines
  };

  // Re-offer attempt limits
  static MAX_ATTEMPTS = {
    PER_DAY: 3,
    PER_WEEK: 10,
    TOTAL: 20
  };

  // Check if user can make a re-offer
  static async canMakeReOffer(itemId, userId) {
    try {
      console.log('🔍 Checking re-offer eligibility for item:', itemId, 'user:', userId);
      
      // Get all previous offers for this item by this user
      const offersQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId),
        where('buyerId', '==', userId)
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      const offers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (offers.length === 0) {
        return {
          canOffer: true,
          reason: 'first_offer',
          cooldownEnds: null,
          attemptsRemaining: this.MAX_ATTEMPTS.TOTAL
        };
      }
      
      // Count declined offers
      const declinedOffers = offers.filter(offer => offer.status === 'declined');
      const totalAttempts = offers.length;
      
      // Check if user has exceeded maximum attempts
      if (totalAttempts >= this.MAX_ATTEMPTS.TOTAL) {
        return {
          canOffer: false,
          reason: 'max_attempts_exceeded',
          cooldownEnds: null,
          attemptsRemaining: 0
        };
      }
      
      // Get the most recent declined offer
      const lastDeclinedOffer = declinedOffers
        .sort((a, b) => b.declinedAt?.toDate() - a.declinedAt?.toDate())[0];
      
      if (!lastDeclinedOffer || !lastDeclinedOffer.declinedAt) {
        return {
          canOffer: true,
          reason: 'no_recent_decline',
          cooldownEnds: null,
          attemptsRemaining: this.MAX_ATTEMPTS.TOTAL - totalAttempts
        };
      }
      
      // Calculate cooldown period based on decline count
      const declineCount = declinedOffers.length;
      let cooldownHours;
      
      if (declineCount === 1) {
        cooldownHours = this.COOLDOWN_PERIODS.FIRST_DECLINE;
      } else if (declineCount === 2) {
        cooldownHours = this.COOLDOWN_PERIODS.SECOND_DECLINE;
      } else if (declineCount === 3) {
        cooldownHours = this.COOLDOWN_PERIODS.THIRD_DECLINE;
      } else {
        cooldownHours = this.COOLDOWN_PERIODS.MAX_DECLINE;
      }
      
      // Check if cooldown period has passed
      const lastDeclineTime = lastDeclinedOffer.declinedAt.toDate();
      const cooldownEndTime = new Date(lastDeclineTime.getTime() + (cooldownHours * 60 * 60 * 1000));
      const now = new Date();
      
      const canOffer = now >= cooldownEndTime;
      
      return {
        canOffer: canOffer,
        reason: canOffer ? 'cooldown_expired' : 'cooldown_active',
        cooldownEnds: canOffer ? null : cooldownEndTime,
        cooldownHours: cooldownHours,
        declineCount: declineCount,
        attemptsRemaining: this.MAX_ATTEMPTS.TOTAL - totalAttempts,
        lastDeclineTime: lastDeclineTime
      };
      
    } catch (error) {
      console.error('❌ Error checking re-offer eligibility:', error);
      return {
        canOffer: false,
        reason: 'error',
        cooldownEnds: null,
        attemptsRemaining: 0
      };
    }
  }

  // Get formatted cooldown time remaining
  static getCooldownTimeRemaining(cooldownEnds) {
    if (!cooldownEnds) return null;
    
    const now = new Date();
    const timeRemaining = cooldownEnds.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return null;
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Create a re-offer with improved terms
  static async createReOffer(itemId, userId, offerData, previousOfferValue) {
    try {
      console.log('🔄 Creating re-offer with improved terms');
      
      // Validate that the new offer is better than the previous one
      const newOfferValue = offerData.cashAmount || 0;
      const improvementRequired = Math.max(5, previousOfferValue * 0.05); // At least $5 or 5% improvement
      
      if (newOfferValue <= previousOfferValue + improvementRequired) {
        throw new Error(`Re-offer must be at least ${(previousOfferValue + improvementRequired).toFixed(2)} (${improvementRequired.toFixed(2)} improvement required)`);
      }
      
      // Create the improved offer
      const { OfferManagementService } = await import('./OfferManagementService');
      
      const enhancedOfferData = {
        ...offerData,
        isReOffer: true,
        previousOfferValue: previousOfferValue,
        improvementAmount: newOfferValue - previousOfferValue,
        reOfferReason: offerData.reOfferReason || 'Improved offer after consideration'
      };
      
      const result = await OfferManagementService.createOffer(
        offerData.sellerId,
        userId,
        enhancedOfferData
      );
      
      console.log('✅ Re-offer created successfully:', result.offerId);
      
      return {
        success: true,
        offerId: result.offerId,
        conversationId: result.conversationId,
        improvementAmount: newOfferValue - previousOfferValue
      };
      
    } catch (error) {
      console.error('❌ Error creating re-offer:', error);
      throw error;
    }
  }

  // Update item availability after decline
  static async updateItemAvailabilityAfterDecline(itemId) {
    try {
      console.log('🔄 Updating item availability after decline:', itemId);
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        
        // Only update if item is currently locked or pending
        if (itemData.status === 'locked' || itemData.status === 'pending') {
          await updateDoc(itemRef, {
            status: 'available',
            updatedAt: serverTimestamp(),
            lastDeclineAt: serverTimestamp()
          });
          
          console.log('✅ Item status updated to available after decline');
        }
      }
    } catch (error) {
      console.error('❌ Error updating item availability after decline:', error);
    }
  }
}
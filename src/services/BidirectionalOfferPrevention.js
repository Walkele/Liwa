import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export class BidirectionalOfferPrevention {
  
  // Check if there's already an active offer in the opposite direction
  static async checkBidirectionalConflict(userAId, userBId, itemAId, itemBId) {
    try {
      console.log('🔍 Checking bidirectional offer conflict:', {
        userA: userAId,
        userB: userBId,
        itemA: itemAId,
        itemB: itemBId
      });

      // Check for existing offers from User B to User A for any items
      const existingOffersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userBId),
        where('sellerId', '==', userAId),
        where('status', 'in', ['pending', 'accepted'])
      );

      const existingOffersSnapshot = await getDocs(existingOffersQuery);
      const existingOffers = existingOffersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Check for existing trade proposals from User B to User A
      const existingTradeProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userBId),
        where('targetUserId', '==', userAId),
        where('status', 'in', ['pending', 'accepted'])
      );

      const existingTradeProposalsSnapshot = await getDocs(existingTradeProposalsQuery);
      const existingTradeProposals = existingTradeProposalsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      const hasConflict = existingOffers.length > 0 || existingTradeProposals.length > 0;

      if (hasConflict) {
        console.log('⚠️ Bidirectional offer conflict detected:', {
          existingOffers: existingOffers.length,
          existingTradeProposals: existingTradeProposals.length
        });

        return {
          hasConflict: true,
          conflictType: existingOffers.length > 0 ? 'cash_offer' : 'trade_proposal',
          existingOffers,
          existingTradeProposals,
          message: this.generateConflictMessage(existingOffers, existingTradeProposals)
        };
      }

      return {
        hasConflict: false,
        conflictType: null,
        existingOffers: [],
        existingTradeProposals: [],
        message: null
      };

    } catch (error) {
      console.error('❌ Error checking bidirectional conflict:', error);
      return {
        hasConflict: false,
        conflictType: null,
        existingOffers: [],
        existingTradeProposals: [],
        message: null
      };
    }
  }

  // Generate user-friendly conflict message
  static generateConflictMessage(existingOffers, existingTradeProposals) {
    if (existingOffers.length > 0) {
      const offer = existingOffers[0];
      return `This user has already made a $${offer.offerAmount} cash offer for one of your items. Please respond to their offer first before making your own offer.`;
    }

    if (existingTradeProposals.length > 0) {
      const proposal = existingTradeProposals[0];
      return `This user has already proposed a trade (${proposal.proposerItemTitle} ↔ ${proposal.targetItemTitle}). Please respond to their trade proposal first before making your own offer.`;
    }

    return 'There is already an active offer between you and this user. Please resolve the existing offer first.';
  }

  // Check for specific item conflicts
  static async checkItemSpecificConflict(userAId, userBId, itemId) {
    try {
      // Check if User B has already made offers for this specific item
      const itemOffersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userBId),
        where('itemId', '==', itemId),
        where('status', 'in', ['pending', 'accepted'])
      );

      const itemOffersSnapshot = await getDocs(itemOffersQuery);
      const itemOffers = itemOffersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Check if User B has already proposed trades for this specific item
      const itemTradeProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userBId),
        where('targetItemId', '==', itemId),
        where('status', 'in', ['pending', 'accepted'])
      );

      const itemTradeProposalsSnapshot = await getDocs(itemTradeProposalsQuery);
      const itemTradeProposals = itemTradeProposalsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      const hasItemConflict = itemOffers.length > 0 || itemTradeProposals.length > 0;

      return {
        hasConflict: hasItemConflict,
        conflictType: itemOffers.length > 0 ? 'cash_offer' : 'trade_proposal',
        existingOffers: itemOffers,
        existingTradeProposals: itemTradeProposals,
        message: hasItemConflict ? 
          'This user has already made an offer for this item. Only one active offer per item per user is allowed.' : 
          null
      };

    } catch (error) {
      console.error('❌ Error checking item-specific conflict:', error);
      return {
        hasConflict: false,
        conflictType: null,
        existingOffers: [],
        existingTradeProposals: [],
        message: null
      };
    }
  }

  // Get all active offers between two users
  static async getActiveOffersBetweenUsers(userAId, userBId) {
    try {
      // Get offers from A to B
      const offersAToBQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userAId),
        where('sellerId', '==', userBId),
        where('status', 'in', ['pending', 'accepted'])
      );

      // Get offers from B to A
      const offersBToAQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userBId),
        where('sellerId', '==', userAId),
        where('status', 'in', ['pending', 'accepted'])
      );

      // Get trade proposals from A to B
      const tradeProposalsAToBQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userAId),
        where('targetUserId', '==', userBId),
        where('status', 'in', ['pending', 'accepted'])
      );

      // Get trade proposals from B to A
      const tradeProposalsBToAQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userBId),
        where('targetUserId', '==', userAId),
        where('status', 'in', ['pending', 'accepted'])
      );

      const [
        offersAToBSnapshot,
        offersBToASnapshot,
        tradeProposalsAToBSnapshot,
        tradeProposalsBToASnapshot
      ] = await Promise.all([
        getDocs(offersAToBQuery),
        getDocs(offersBToAQuery),
        getDocs(tradeProposalsAToBQuery),
        getDocs(tradeProposalsBToAQuery)
      ]);

      return {
        offersAToB: offersAToBSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        offersBToA: offersBToASnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        tradeProposalsAToB: tradeProposalsAToBSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        tradeProposalsBToA: tradeProposalsBToASnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };

    } catch (error) {
      console.error('❌ Error getting active offers between users:', error);
      return {
        offersAToB: [],
        offersBToA: [],
        tradeProposalsAToB: [],
        tradeProposalsBToA: []
      };
    }
  }

  // Validate if a new offer can be made
  static async validateNewOffer(buyerId, sellerId, itemId, offerType = 'cash') {
    try {
      console.log('🔍 Validating new offer:', {
        buyerId,
        sellerId,
        itemId,
        offerType
      });

      // Check for bidirectional conflicts
      const bidirectionalConflict = await this.checkBidirectionalConflict(
        buyerId, 
        sellerId, 
        itemId, 
        null
      );

      if (bidirectionalConflict.hasConflict) {
        return {
          canMakeOffer: false,
          reason: 'bidirectional_conflict',
          message: bidirectionalConflict.message,
          conflictDetails: bidirectionalConflict
        };
      }

      // Check for item-specific conflicts
      const itemConflict = await this.checkItemSpecificConflict(
        sellerId, // Note: reversed because we're checking if seller has offers for buyer's items
        buyerId,
        itemId
      );

      if (itemConflict.hasConflict) {
        return {
          canMakeOffer: false,
          reason: 'item_specific_conflict',
          message: itemConflict.message,
          conflictDetails: itemConflict
        };
      }

      return {
        canMakeOffer: true,
        reason: 'no_conflict',
        message: 'Offer can be made',
        conflictDetails: null
      };

    } catch (error) {
      console.error('❌ Error validating new offer:', error);
      return {
        canMakeOffer: false,
        reason: 'validation_error',
        message: 'Unable to validate offer. Please try again.',
        conflictDetails: null
      };
    }
  }

  // Get user-friendly explanation for offer restrictions
  static getOfferRestrictionExplanation(conflictType, existingOffers, existingTradeProposals) {
    const explanations = {
      title: 'One-Direction Trading Policy',
      subtitle: 'To maintain fair and organized trading, only one active offer is allowed between users at a time.',
      reasons: [
        '🔄 Prevents circular trading conflicts',
        '📋 Keeps negotiations organized and clear',
        '⚖️ Ensures fair trading practices',
        '🎯 Reduces confusion for both parties'
      ],
      nextSteps: []
    };

    if (existingOffers.length > 0) {
      const offer = existingOffers[0];
      explanations.nextSteps = [
        `💰 Respond to the existing $${offer.offerAmount} cash offer first`,
        '✅ Accept, decline, or counter the current offer',
        '🔄 After resolution, you can make your own offer'
      ];
    } else if (existingTradeProposals.length > 0) {
      const proposal = existingTradeProposals[0];
      explanations.nextSteps = [
        `🔄 Respond to the existing trade proposal first`,
        `📦 ${proposal.proposerItemTitle} ↔ ${proposal.targetItemTitle}`,
        '✅ Accept, decline, or counter the current proposal',
        '🔄 After resolution, you can make your own offer'
      ];
    }

    return explanations;
  }
}
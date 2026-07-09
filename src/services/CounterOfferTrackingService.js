import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

class CounterOfferTrackingService {
  static MAX_COUNTER_OFFERS = 4;

  /**
   * Get counter-offer count for a conversation
   */
  static async getCounterOfferCount(conversationId) {
    try {
      const counterOffersQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'counter_offer'),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(counterOffersQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting counter-offer count:', error);
      return 0;
    }
  }

  /**
   * Get all offers and counter-offers for a conversation in chronological order
   */
  static async getOfferHistory(conversationId) {
    try {
      const offersQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', 'in', ['trade_proposal', 'counter_offer']),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(offersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting offer history:', error);
      return [];
    }
  }

  /**
   * Check if more counter-offers are allowed
   */
  static async canMakeCounterOffer(conversationId) {
    const count = await this.getCounterOfferCount(conversationId);
    return count < this.MAX_COUNTER_OFFERS;
  }

  /**
   * Get the current active offer (latest pending offer)
   */
  static async getCurrentOffer(conversationId) {
    try {
      const offersQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', 'in', ['trade_proposal', 'counter_offer']),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(offersQuery);
      if (snapshot.empty) return null;

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    } catch (error) {
      console.error('Error getting current offer:', error);
      return null;
    }
  }

  /**
   * Validate counter-offer to ensure it makes economic sense
   */
  static validateCounterOffer(originalOffer, counterAmount, offerHistory = []) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 1. Basic validation
    if (!counterAmount || counterAmount <= 0) {
      validation.isValid = false;
      validation.errors.push('Counter-offer amount must be greater than 0');
      return validation;
    }

    const originalAmount = originalOffer.newTerms?.cashAmount || originalOffer.cashAmount || 0;
    
    if (originalAmount <= 0) {
      validation.warnings.push('Original offer amount not found, skipping economic validation');
      return validation;
    }

    // 2. Prevent identical offers
    if (counterAmount === originalAmount) {
      validation.isValid = false;
      validation.errors.push('Counter-offer cannot be identical to the current offer');
      validation.suggestions.push('Try a different amount to show genuine negotiation');
      return validation;
    }

    // 3. Check for reasonable negotiation range (10-50% difference)
    const percentageDifference = Math.abs((counterAmount - originalAmount) / originalAmount) * 100;
    
    if (percentageDifference < 5) {
      validation.warnings.push('Very small difference from original offer - consider a more meaningful counter');
      validation.suggestions.push(`Try at least ${originalAmount > counterAmount ? 
        Math.floor(originalAmount * 0.9) : Math.ceil(originalAmount * 1.1)}`);
    }

    if (percentageDifference > 75) {
      validation.warnings.push('Large difference from original offer - this might be rejected');
      validation.suggestions.push('Consider a more moderate counter-offer to keep negotiations going');
    }

    // 4. Check negotiation direction and progress
    if (offerHistory.length > 0) {
      const lastOffer = offerHistory[offerHistory.length - 1];
      const lastAmount = lastOffer.newTerms?.cashAmount || lastOffer.cashAmount || 0;
      
      // Check if we're moving in the right direction
      const isSellerCountering = originalOffer.senderId !== originalOffer.targetUserId;
      
      if (isSellerCountering) {
        // Seller should generally counter higher
        if (counterAmount < lastAmount && counterAmount < originalAmount) {
          validation.warnings.push('As the seller, consider countering higher than previous offers');
        }
      } else {
        // Buyer should generally counter lower or meet in middle
        if (counterAmount > lastAmount && counterAmount > originalAmount) {
          validation.warnings.push('As the buyer, consider countering closer to the middle ground');
        }
      }

      // 5. Check for ping-pong pattern (going back to previous amounts)
      const previousAmounts = offerHistory.map(offer => offer.newTerms?.cashAmount || offer.cashAmount);
      if (previousAmounts.includes(counterAmount)) {
        validation.isValid = false;
        validation.errors.push('Cannot return to a previously offered amount');
        validation.suggestions.push('Try a new amount that shows progress in negotiation');
        return validation;
      }

      // 6. Check for convergence (offers getting closer)
      if (offerHistory.length >= 2) {
        const secondLastAmount = offerHistory[offerHistory.length - 2].newTerms?.cashAmount || 
                                offerHistory[offerHistory.length - 2].cashAmount || 0;
        
        const previousGap = Math.abs(lastAmount - secondLastAmount);
        const currentGap = Math.abs(counterAmount - lastAmount);
        
        if (currentGap > previousGap) {
          validation.warnings.push('Offers are moving further apart - consider meeting in the middle');
          const middleGround = Math.round((lastAmount + originalAmount) / 2);
          validation.suggestions.push(`Try ${middleGround} to find middle ground`);
        }
      }
    }

    // 7. Suggest reasonable ranges
    if (validation.suggestions.length === 0) {
      const lowerBound = Math.floor(originalAmount * 0.85);
      const upperBound = Math.ceil(originalAmount * 1.15);
      
      if (counterAmount < lowerBound || counterAmount > upperBound) {
        validation.suggestions.push(`Consider offers between ${lowerBound} and ${upperBound} for better negotiation`);
      }
    }

    return validation;
  }

  /**
   * Get smart counter-offer suggestions based on negotiation history
   */
  static getCounterOfferSuggestions(originalOffer, offerHistory = []) {
    const originalAmount = originalOffer.newTerms?.cashAmount || originalOffer.cashAmount || 0;
    
    if (originalAmount <= 0) {
      return [];
    }

    const suggestions = [];
    
    if (offerHistory.length === 0) {
      // First counter-offer suggestions
      suggestions.push({
        amount: Math.floor(originalAmount * 0.9),
        label: 'Conservative (-10%)',
        reasoning: 'Small reduction to test flexibility'
      });
      
      suggestions.push({
        amount: Math.floor(originalAmount * 0.8),
        label: 'Moderate (-20%)',
        reasoning: 'Reasonable counter-offer'
      });
      
      suggestions.push({
        amount: Math.floor(originalAmount * 0.7),
        label: 'Aggressive (-30%)',
        reasoning: 'Strong negotiation position'
      });
    } else {
      // Subsequent counter-offers - find middle ground
      const lastAmount = offerHistory[offerHistory.length - 1].newTerms?.cashAmount || 
                         offerHistory[offerHistory.length - 1].cashAmount || 0;
      
      const middleGround = Math.round((originalAmount + lastAmount) / 2);
      const quarterStep = Math.round((originalAmount + middleGround) / 2);
      
      suggestions.push({
        amount: middleGround,
        label: 'Meet in Middle',
        reasoning: 'Fair compromise between offers'
      });
      
      if (quarterStep !== middleGround && quarterStep !== originalAmount) {
        suggestions.push({
          amount: quarterStep,
          label: 'Quarter Step',
          reasoning: 'Gradual movement toward agreement'
        });
      }
    }

    return suggestions.filter(s => s.amount > 0 && s.amount !== originalAmount);
  }
  static async createCounterOffer(originalOffer, counterAmount, currentUser) {
    try {
      const counterOfferCount = await this.getCounterOfferCount(originalOffer.conversationId);
      
      if (counterOfferCount >= this.MAX_COUNTER_OFFERS) {
        throw new Error(`Maximum of ${this.MAX_COUNTER_OFFERS} counter-offers allowed`);
      }

      // Get offer history for validation
      const offerHistory = await this.getOfferHistory(originalOffer.conversationId);
      
      // Validate counter-offer makes economic sense
      const validation = this.validateCounterOffer(originalOffer, counterAmount, offerHistory);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.join('. ');
        const suggestions = validation.suggestions.length > 0 ? 
          ` Suggestions: ${validation.suggestions.join('. ')}` : '';
        throw new Error(`${errorMessage}${suggestions}`);
      }

      // Log warnings for user feedback (but don't block)
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Counter-offer warnings:', validation.warnings);
      }

      // Create counter-offer message
      const counterOfferData = {
        conversationId: originalOffer.conversationId,
        messageType: 'counter_offer',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        targetUserId: originalOffer.proposerUserId || originalOffer.senderId,  // ✅ FIX: Use proposerUserId if available
        targetUserName: originalOffer.senderName,
        itemId: originalOffer.targetItemId || originalOffer.itemId || 'unknown-item',  // ✅ FIX: Better item ID resolution
        itemTitle: originalOffer.targetItemTitle || originalOffer.itemTitle || 'Item',  // ✅ FIX: Better title resolution
        originalOfferId: originalOffer.id,
        parentOfferId: originalOffer.id,
        cashAmount: counterAmount,
        newTerms: {
          cashAmount: counterAmount,
          offerType: 'cash'
        },
        status: 'pending',
        counterOfferRound: counterOfferCount + 1,
        maxRounds: this.MAX_COUNTER_OFFERS,
        createdAt: serverTimestamp(),
        text: `💰 Counter-offer: $${counterAmount}`,
        buttonsHidden: false
      };

      const docRef = await addDoc(collection(db, 'messages'), counterOfferData);

      // Mark ALL previous pending offers as countered (not just the original)
      const pendingOffersQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', originalOffer.conversationId),
        where('messageType', 'in', ['trade_proposal', 'counter_offer']),
        where('status', 'in', ['pending', 'active'])
      );

      const pendingSnapshot = await getDocs(pendingOffersQuery);
      // ✅ FIX: Exclude the newly created counter-offer from being marked as countered
      const updatePromises = pendingSnapshot.docs
        .filter(doc => doc.id !== docRef.id)  // Don't mark the new counter-offer as countered
        .map(doc => this.updateOfferStatus(doc.id, 'countered'));
      
      await Promise.all(updatePromises);
      console.log(`🔧 Marked ${updatePromises.length} previous offers as countered (excluded new counter-offer)`);
      
      // Also create a system message for better visibility
      await addDoc(collection(db, 'messages'), {
        conversationId: originalOffer.conversationId,
        messageType: 'system_message',
        senderId: 'system',
        text: `💰 ${currentUser.displayName || 'User'} made a counter-offer of $${counterAmount}`,
        createdAt: serverTimestamp(),
        relatedOfferId: docRef.id
      });

      return {
        id: docRef.id,
        ...counterOfferData,
        validationResult: validation
      };
    } catch (error) {
      console.error('Error creating counter-offer:', error);
      throw error;
    }
  }

  /**
   * Accept an offer
   */
  static async acceptOffer(offer, currentUser) {
    try {
      // Mark offer as accepted
      await this.updateOfferStatus(offer.id, 'accepted');

      // Create acceptance message
      const acceptanceData = {
        conversationId: offer.conversationId,
        messageType: 'offer_accepted',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        relatedOfferId: offer.id,
        acceptedAmount: offer.newTerms?.cashAmount || offer.cashAmount,
        createdAt: serverTimestamp(),
        text: `✅ Offer accepted! Trade is now active for $${offer.newTerms?.cashAmount || offer.cashAmount}.`
      };

      await addDoc(collection(db, 'messages'), acceptanceData);

      // Also mark any other pending offers in this conversation as declined
      const pendingOffersQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', offer.conversationId),
        where('messageType', 'in', ['trade_proposal', 'counter_offer']),
        where('status', 'in', ['pending', 'active'])
      );

      const pendingSnapshot = await getDocs(pendingOffersQuery);
      const declinePromises = pendingSnapshot.docs
        .filter(doc => doc.id !== offer.id)  // Don't decline the accepted offer
        .map(doc => this.updateOfferStatus(doc.id, 'declined'));
      
      await Promise.all(declinePromises);
      console.log(`🔧 Marked ${declinePromises.length} other pending offers as declined`);
      console.log('🎉 Offer accepted successfully - trade progression should start');

      return acceptanceData;
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  }

  /**
   * Decline an offer
   */
  static async declineOffer(offer, currentUser) {
    try {
      // Mark offer as declined
      await this.updateOfferStatus(offer.id, 'declined');

      // Create decline message
      const declineData = {
        conversationId: offer.conversationId,
        messageType: 'offer_declined',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        relatedOfferId: offer.id,
        declinedAmount: offer.newTerms?.cashAmount || offer.cashAmount,
        createdAt: serverTimestamp(),
        text: `❌ Offer declined.`
      };

      await addDoc(collection(db, 'messages'), declineData);

      return declineData;
    } catch (error) {
      console.error('Error declining offer:', error);
      throw error;
    }
  }

  /**
   * Update offer status
   */
  static async updateOfferStatus(offerId, status) {
    try {
      const offerRef = doc(db, 'messages', offerId);
      await updateDoc(offerRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating offer status:', error);
      throw error;
    }
  }

  /**
   * Get counter-offer statistics for display
   */
  static async getCounterOfferStats(conversationId) {
    try {
      const history = await this.getOfferHistory(conversationId);
      const counterOffers = history.filter(offer => offer.messageType === 'counter_offer');
      
      return {
        totalOffers: history.length,
        counterOfferCount: counterOffers.length,
        maxCounterOffers: this.MAX_COUNTER_OFFERS,
        remainingCounterOffers: this.MAX_COUNTER_OFFERS - counterOffers.length,
        canCounter: counterOffers.length < this.MAX_COUNTER_OFFERS,
        currentRound: counterOffers.length + 1,
        history: history
      };
    } catch (error) {
      console.error('Error getting counter-offer stats:', error);
      return {
        totalOffers: 0,
        counterOfferCount: 0,
        maxCounterOffers: this.MAX_COUNTER_OFFERS,
        remainingCounterOffers: this.MAX_COUNTER_OFFERS,
        canCounter: true,
        currentRound: 1,
        history: []
      };
    }
  }
}

export default CounterOfferTrackingService;
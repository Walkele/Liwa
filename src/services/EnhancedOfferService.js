import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UnifiedMessageService } from './UnifiedMessageService';

export class EnhancedOfferService {
  
  // Enhanced offer states for threading
  static OFFER_STATES = {
    ACTIVE: 'active',
    SUPERSEDED: 'superseded',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    EXPIRED: 'expired'
  };

  // Counter-offer types
  static COUNTER_TYPES = {
    PRICE_ADJUSTMENT: 'price_adjustment',
    ITEM_ADDITION: 'item_addition',
    ITEM_SUBSTITUTION: 'item_substitution',
    CASH_MODIFICATION: 'cash_modification',
    BUNDLE_CHANGE: 'bundle_change'
  };

  // Helper function to determine counter-offer target user
  static getCounterOfferTargetUser(parentOffer, parentCollection, currentUserId) {
    console.log('🔍 Determining target user for counter-offer:', {
      parentCollection,
      currentUserId,
      parentOffer: {
        proposerUserId: parentOffer.proposerUserId,
        targetUserId: parentOffer.targetUserId,
        buyerId: parentOffer.buyerId,
        sellerId: parentOffer.sellerId
      }
    });
    
    // Try multiple fields to find the target user
    let targetUserId = null;
    
    if (parentCollection === 'tradeProposals') {
      // For trade proposals, counter to the other party
      if (parentOffer.proposerUserId && parentOffer.proposerUserId !== currentUserId) {
        targetUserId = parentOffer.proposerUserId;
      } else if (parentOffer.targetUserId && parentOffer.targetUserId !== currentUserId) {
        targetUserId = parentOffer.targetUserId;
      }
    } else {
      // For cash offers and counter-offers, find the other party
      if (parentOffer.proposerUserId && parentOffer.proposerUserId !== currentUserId) {
        targetUserId = parentOffer.proposerUserId;
      } else if (parentOffer.targetUserId && parentOffer.targetUserId !== currentUserId) {
        targetUserId = parentOffer.targetUserId;
      } else if (parentOffer.buyerId && parentOffer.buyerId !== currentUserId) {
        targetUserId = parentOffer.buyerId;
      } else if (parentOffer.sellerId && parentOffer.sellerId !== currentUserId) {
        targetUserId = parentOffer.sellerId;
      }
    }
    
    console.log('✅ Determined targetUserId:', targetUserId);
    return targetUserId;
  }

  // Create threaded counter-offer
  static async createCounterOffer(parentOfferId, counterOfferData, userId) {
    try {
      console.log('🔄 Creating counter-offer for parent:', parentOfferId);
      console.log('🔍 Counter-offer data:', counterOfferData);
      console.log('👤 User ID:', userId);
      
      let parentOffer = null;
      let parentCollection = 'offers';
      let parentOfferRef = null;
      
      // Check if this is a custom trade proposal ID (starts with 'trade_')
      if (parentOfferId.startsWith('trade_')) {
        console.log('🔍 Detected custom trade proposal ID, searching by tradeProposalId field...');
        
        // Search for trade proposal by tradeProposalId field
        const tradeProposalsQuery = query(
          collection(db, 'tradeProposals'),
          where('tradeProposalId', '==', parentOfferId)
        );
        const tradeProposalsSnapshot = await getDocs(tradeProposalsQuery);
        
        if (!tradeProposalsSnapshot.empty) {
          parentCollection = 'tradeProposals';
          const tradeProposalDoc = tradeProposalsSnapshot.docs[0];
          parentOfferRef = doc(db, 'tradeProposals', tradeProposalDoc.id);
          parentOffer = tradeProposalDoc.data();
          console.log('✅ Found trade proposal by tradeProposalId field');
        } else {
          console.log('❌ No trade proposal found with tradeProposalId:', parentOfferId);
          
          // Fallback: Try to find by parsing the custom ID and searching by user IDs and timestamp
          console.log('🔍 Attempting fallback search by parsing custom ID...');
          const idParts = parentOfferId.split('_');
          if (idParts.length >= 4 && idParts[0] === 'trade') {
            const proposerUserId = idParts[1];
            const targetUserId = idParts[2];
            const timestamp = parseInt(idParts[3]);
            
            console.log('🔍 Parsed ID - Proposer:', proposerUserId, 'Target:', targetUserId, 'Timestamp:', timestamp);
            
            // Search for trade proposal by user IDs and approximate timestamp
            const fallbackQuery = query(
              collection(db, 'tradeProposals'),
              where('proposerUserId', '==', proposerUserId),
              where('targetUserId', '==', targetUserId)
            );
            const fallbackSnapshot = await getDocs(fallbackQuery);
            
            if (!fallbackSnapshot.empty) {
              // Find the closest match by timestamp
              let bestMatch = null;
              let smallestTimeDiff = Infinity;
              
              fallbackSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const docTimestamp = data.createdAt?.toDate?.()?.getTime() || data.createdAt?.getTime?.() || 0;
                const timeDiff = Math.abs(docTimestamp - timestamp);
                
                if (timeDiff < smallestTimeDiff) {
                  smallestTimeDiff = timeDiff;
                  bestMatch = { doc, data };
                }
              });
              
              if (bestMatch && smallestTimeDiff < 60000) { // Within 1 minute
                parentCollection = 'tradeProposals';
                parentOfferRef = doc(db, 'tradeProposals', bestMatch.doc.id);
                parentOffer = bestMatch.data;
                console.log('✅ Found trade proposal by fallback search, time diff:', smallestTimeDiff, 'ms');
                
                // Update the document with the missing tradeProposalId for future lookups
                await updateDoc(parentOfferRef, {
                  tradeProposalId: parentOfferId
                });
                console.log('✅ Updated trade proposal with missing tradeProposalId');
              }
            }
          }
        }
      } else {
        // First try to find in offers collection using document ID
        console.log('🔍 Checking offers collection for document ID:', parentOfferId);
        parentOfferRef = doc(db, 'offers', parentOfferId);
        const parentOfferDoc = await getDoc(parentOfferRef);
        
        if (parentOfferDoc.exists()) {
          parentOffer = parentOfferDoc.data();
          console.log('✅ Found offer by document ID');
        } else {
          console.log('❌ Not found in offers collection, trying tradeProposals...');
          // If not found in offers, try tradeProposals collection
          parentCollection = 'tradeProposals';
          parentOfferRef = doc(db, 'tradeProposals', parentOfferId);
          const tradeProposalDoc = await getDoc(parentOfferRef);
          
          if (tradeProposalDoc.exists()) {
            parentOffer = tradeProposalDoc.data();
            console.log('✅ Found trade proposal by document ID');
          }
        }
      }
      
      if (!parentOffer) {
        console.log('❌ Parent offer not found anywhere');
        console.log('🔍 Attempting to search by partial ID match...');
        
        // Try to find by searching for documents that contain this ID
        const offersQuery = query(collection(db, 'offers'));
        const offersSnapshot = await getDocs(offersQuery);
        console.log('📊 Total offers in collection:', offersSnapshot.size);
        
        const tradeProposalsQuery = query(collection(db, 'tradeProposals'));
        const tradeProposalsSnapshot = await getDocs(tradeProposalsQuery);
        console.log('📊 Total trade proposals in collection:', tradeProposalsSnapshot.size);
        
        // Log some sample IDs to see the pattern
        if (!offersSnapshot.empty) {
          console.log('📝 Sample offer IDs:');
          offersSnapshot.docs.slice(0, 3).forEach(doc => {
            console.log('  -', doc.id);
          });
        }
        
        if (!tradeProposalsSnapshot.empty) {
          console.log('📝 Sample trade proposal IDs:');
          tradeProposalsSnapshot.docs.slice(0, 3).forEach(doc => {
            console.log('  -', doc.id, 'tradeProposalId:', doc.data().tradeProposalId);
          });
        }
        
        throw new Error(`Parent offer not found. Searched for ID: ${parentOfferId}`);
      }
      
      console.log('✅ Found parent offer in collection:', parentCollection);
      console.log('📄 Parent offer data:', JSON.stringify(parentOffer, null, 2));
      
      // 🚫 CHECK NEGOTIATION ROUND LIMIT (4 rounds maximum)
      const currentRound = (parentOffer.negotiationRound || 0) + 1;
      const MAX_NEGOTIATION_ROUNDS = 4;
      
      if (currentRound > MAX_NEGOTIATION_ROUNDS) {
        throw new Error(`Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) exceeded. Please accept or decline the current offer.`);
      }
      
      console.log(`📊 Negotiation round: ${currentRound}/${MAX_NEGOTIATION_ROUNDS}`);
      
      // Ensure conversationId exists (generate if missing)
      let conversationId = parentOffer.conversationId;
      if (!conversationId) {
        // Generate conversationId for trade proposals that don't have one
        if (parentCollection === 'tradeProposals') {
          const proposerUserId = parentOffer.proposerUserId;
          const targetUserId = parentOffer.targetUserId;
          const itemId = parentOffer.targetItemId;
          conversationId = `${proposerUserId}_${targetUserId}_${itemId}`;
          
          // Update the trade proposal with the conversationId
          await updateDoc(parentOfferRef, {
            conversationId: conversationId
          });
          
          console.log('✅ Generated and stored conversationId:', conversationId);
        } else {
          throw new Error('Missing conversationId and cannot generate for this offer type');
        }
      }
      
      // Generate thread ID (use parent's threadId or create new one)
      const threadId = parentOffer.threadId || parentOfferId;
      
      // Get target user and validate it exists
      const targetUserId = this.getCounterOfferTargetUser(parentOffer, parentCollection, userId);
      
      if (!targetUserId) {
        throw new Error('Could not determine target user for counter-offer. Parent offer may be missing user information.');
      }
      
      console.log('✅ Validated targetUserId:', targetUserId);
      
      // Mark parent offer as superseded
      await updateDoc(parentOfferRef, {
        status: this.OFFER_STATES.SUPERSEDED,
        supersededAt: serverTimestamp(),
        supersededBy: userId
      });
      
      // Create counter-offer (always in offers collection for consistency)
      const counterOffer = {
        // Thread management
        threadId: threadId,
        parentOfferId: parentOfferId,
        parentCollection: parentCollection, // Track which collection the parent is in
        threadPosition: (parentOffer.threadPosition || 0) + 1,
        
        // Offer details
        proposerUserId: userId,
        targetUserId: targetUserId, // Now guaranteed to be valid
        conversationId: conversationId, // Use the ensured conversationId
        
        // Counter-offer specifics
        counterType: counterOfferData.counterType,
        originalTerms: {
          cashAmount: parentOffer.cashAmount || parentOffer.offerAmount || 0,
          itemIds: parentOffer.itemIds || [parentOffer.proposerItemId, parentOffer.targetItemId].filter(Boolean) || [],
          tradeType: parentOffer.tradeType || (parentCollection === 'tradeProposals' ? 'item_trade' : 'cash'),
          itemTitle: parentOffer.itemTitle || parentOffer.targetItemTitle || 'Item',
          itemPrice: parentOffer.itemPrice || parentOffer.targetItemPrice || 0,
          proposerItemTitle: parentOffer.proposerItemTitle || 'Item',
          targetItemTitle: parentOffer.targetItemTitle || 'Item'
        },
        newTerms: {
          cashAmount: counterOfferData.cashAmount || 0,
          itemIds: counterOfferData.itemIds || [],
          tradeType: counterOfferData.tradeType || 'item_trade',
          additionalItems: counterOfferData.additionalItems || [],
          removedItems: counterOfferData.removedItems || []
        },
        
        // Negotiation context
        negotiationReason: counterOfferData.reason || '',
        valueJustification: counterOfferData.justification || '',
        
        // Status and timing
        status: this.OFFER_STATES.ACTIVE,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        
        // Metadata
        isCounterOffer: true,
        negotiationRound: currentRound,
        maxRoundsReached: currentRound >= MAX_NEGOTIATION_ROUNDS
      };
      
      // Add counter-offer to database
      const counterOfferRef = await addDoc(collection(db, 'offers'), counterOffer);
      
      // Create system message in chat
      await UnifiedMessageService.createCounterOfferMessage(
        conversationId, // Use the ensured conversationId
        counterOfferRef.id,
        counterOffer, // Pass the complete counter-offer object instead of just counterOfferData
        userId
      );
      
      // Update conversation with latest offer
      await this.updateConversationWithLatestOffer(
        conversationId, // Use the ensured conversationId
        counterOfferRef.id
      );
      
      console.log('✅ Counter-offer created successfully:', counterOfferRef.id);
      console.log(`📊 Negotiation status: Round ${currentRound}/${MAX_NEGOTIATION_ROUNDS}`);
      
      return {
        success: true,
        counterOfferId: counterOfferRef.id,
        threadId: threadId,
        negotiationRound: currentRound,
        maxRoundsReached: currentRound >= MAX_NEGOTIATION_ROUNDS,
        message: currentRound >= MAX_NEGOTIATION_ROUNDS 
          ? 'Final counter-offer sent. No more counter-offers allowed.' 
          : `Counter-offer sent (Round ${currentRound}/${MAX_NEGOTIATION_ROUNDS})`
      };
      
    } catch (error) {
      console.error('❌ Error creating counter-offer:', error);
      throw error;
    }
  }

  // Get complete offer thread (negotiation history)
  static async getOfferThread(threadId) {
    try {
      console.log('📜 Getting offer thread:', threadId);
      
      const q = query(
        collection(db, 'offers'),
        where('threadId', '==', threadId),
        orderBy('threadPosition', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const thread = [];
      
      snapshot.forEach(doc => {
        thread.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Calculate thread statistics
      const threadStats = {
        totalOffers: thread.length,
        activeOffer: thread.find(offer => offer.status === this.OFFER_STATES.ACTIVE),
        negotiationRounds: Math.max(...thread.map(offer => offer.negotiationRound || 0)),
        participants: [...new Set(thread.map(offer => offer.proposerUserId))],
        startedAt: thread[0]?.createdAt,
        lastActivity: thread[thread.length - 1]?.createdAt
      };
      
      return {
        thread: thread,
        stats: threadStats,
        currentOffer: threadStats.activeOffer
      };
      
    } catch (error) {
      console.error('❌ Error getting offer thread:', error);
      throw error;
    }
  }

  // Accept counter-offer (ends negotiation thread)
  static async acceptCounterOffer(offerId, userId) {
    try {
      console.log('✅ Accepting counter-offer:', offerId);
      
      const offerRef = doc(db, 'offers', offerId);
      const offerDoc = await getDoc(offerRef);
      
      if (!offerDoc.exists()) {
        throw new Error('Counter-offer not found');
      }
      
      const offer = offerDoc.data();
      
      // Verify user is authorized to accept
      if (offer.targetUserId !== userId) {
        throw new Error('User not authorized to accept this offer');
      }
      
      // Mark offer as accepted
      await updateDoc(offerRef, {
        status: this.OFFER_STATES.ACCEPTED,
        acceptedAt: serverTimestamp(),
        acceptedBy: userId
      });
      
      // Update the original counter-offer message status
      await this.updateCounterOfferMessageStatus(offer.conversationId, offerId, 'accepted');
      
      // Mark all other offers in thread as expired
      await this.expireThreadOffers(offer.threadId, offerId);
      
      // Create acceptance message
      await UnifiedMessageService.createCounterOfferAcceptanceMessage(
        offer.conversationId,
        offerId,
        userId
      );
      
      console.log('✅ Counter-offer accepted successfully');
      
      return {
        success: true,
        offerId: offerId,
        threadClosed: true,
        message: 'Counter-offer accepted! You can now proceed with the trade.'
      };
      
    } catch (error) {
      console.error('❌ Error accepting counter-offer:', error);
      throw error;
    }
  }

  // Decline counter-offer (allows for new counter)
  static async declineCounterOffer(offerId, userId, reason = '') {
    try {
      console.log('❌ Declining counter-offer:', offerId);
      
      const offerRef = doc(db, 'offers', offerId);
      await updateDoc(offerRef, {
        status: this.OFFER_STATES.DECLINED,
        declinedAt: serverTimestamp(),
        declinedBy: userId,
        declineReason: reason
      });
      
      const offerDoc = await getDoc(offerRef);
      const offer = offerDoc.data();
      
      // Update the original counter-offer message status
      await this.updateCounterOfferMessageStatus(offer.conversationId, offerId, 'declined');
      
      // Create decline message
      await UnifiedMessageService.createCounterOfferDeclineMessage(
        offer.conversationId,
        offerId,
        reason,
        userId
      );
      
      return {
        success: true,
        canCounter: true,
        threadId: offer.threadId
      };
      
    } catch (error) {
      console.error('❌ Error declining counter-offer:', error);
      throw error;
    }
  }

  // Helper: Expire all other offers in thread
  static async expireThreadOffers(threadId, acceptedOfferId) {
    try {
      const q = query(
        collection(db, 'offers'),
        where('threadId', '==', threadId),
        where('status', '==', this.OFFER_STATES.ACTIVE)
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      
      snapshot.forEach(doc => {
        if (doc.id !== acceptedOfferId) {
          batch.push(
            updateDoc(doc.ref, {
              status: this.OFFER_STATES.EXPIRED,
              expiredAt: serverTimestamp(),
              expiredReason: 'thread_closed'
            })
          );
        }
      });
      
      await Promise.all(batch);
      
    } catch (error) {
      console.error('❌ Error expiring thread offers:', error);
    }
  }

  // Helper: Update conversation with latest offer
  static async updateConversationWithLatestOffer(conversationId, offerId) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        latestOfferId: offerId,
        lastOfferAt: serverTimestamp(),
        hasActiveNegotiation: true
      });
    } catch (error) {
      console.error('❌ Error updating conversation:', error);
    }
  }

  // Get negotiation statistics for analytics
  static async getNegotiationStats(userId) {
    try {
      const q = query(
        collection(db, 'offers'),
        where('proposerUserId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      const offers = [];
      
      snapshot.forEach(doc => {
        offers.push(doc.data());
      });
      
      const stats = {
        totalOffers: offers.length,
        counterOffers: offers.filter(o => o.isCounterOffer).length,
        acceptedOffers: offers.filter(o => o.status === this.OFFER_STATES.ACCEPTED).length,
        averageNegotiationRounds: offers.reduce((sum, o) => sum + (o.negotiationRound || 0), 0) / offers.length || 0,
        successRate: offers.length > 0 ? (offers.filter(o => o.status === this.OFFER_STATES.ACCEPTED).length / offers.length) * 100 : 0
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting negotiation stats:', error);
      return null;
    }
  }

  // Helper: Update counter-offer message status to hide action buttons
  static async updateCounterOfferMessageStatus(conversationId, counterOfferId, status) {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'counter_offer'),
        where('counterOfferId', '==', counterOfferId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (!messagesSnapshot.empty) {
        const messageDoc = messagesSnapshot.docs[0];
        await updateDoc(doc(db, 'messages', messageDoc.id), {
          status: status,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Updated counter-offer message status to: ${status}`);
      }
      
    } catch (error) {
      console.error('❌ Error updating counter-offer message status:', error);
    }
  }
}
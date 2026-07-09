import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EscrowService } from './EscrowService';
import { OfferComparisonService } from './OfferComparisonService';

/**
 * Trade Negotiation Service - Manages the complete negotiation workflow
 * Binance-like trading system with clear states and user actions
 */
export class TradeNegotiationService {
  
  // Negotiation phases
  static NEGOTIATION_PHASES = {
    INITIAL_PROPOSAL: 'initial_proposal',           // First trade proposal
    COUNTER_OFFER: 'counter_offer',                 // Counter-offer phase
    ITEM_SELECTION: 'item_selection',               // Selecting items for trade
    TERMS_AGREEMENT: 'terms_agreement',             // Agreeing on terms
    ESCROW_LOCKING: 'escrow_locking',               // Locking items in escrow
    SHIPPING_COORDINATION: 'shipping_coordination', // Coordinating shipping
    CONFIRMATION: 'confirmation',                   // Final confirmation
    COMPLETED: 'completed'                          // Trade completed
  };

  /**
   * Create a new trade proposal
   */
  static async createTradeProposal(proposalData) {
    try {
      console.log('🔍 Raw proposal data keys:', Object.keys(proposalData));
      console.log('🔍 Checking proposerSelectedItems:', JSON.stringify(proposalData.proposerSelectedItems, null, 2));
      
      // Helper function to check for timestamp objects
      const containsTimestamp = (obj) => {
        if (!obj) return false;
        if (typeof obj === 'object' && obj.toDate) return true;
        if (Array.isArray(obj)) return obj.some(containsTimestamp);
        if (typeof obj === 'object') return Object.values(obj).some(containsTimestamp);
        return false;
      };

      // Check each field for timestamps
      const timestampCheck = {
        proposerSelectedItems: containsTimestamp(proposalData.proposerSelectedItems),
        matchedItem: containsTimestamp(proposalData.matchedItem),
        targetItemData: containsTimestamp(proposalData.targetItemData),
        valueComparison: containsTimestamp(proposalData.valueComparison)
      };
      console.log('🔍 Timestamp check:', timestampCheck);
      
      // Manually construct the proposal to avoid spread operator issues
      const proposalDocument = {
        proposerUserId: proposalData.proposerUserId,
        targetUserId: proposalData.targetUserId,
        targetItemId: proposalData.targetItemId,
        targetItemTitle: proposalData.targetItemTitle,
        targetItemPrice: proposalData.targetItemPrice,
        estimatedValue: proposalData.estimatedValue,
        tradeType: proposalData.tradeType,
        participantIds: proposalData.participantIds,
        proposerSelectedItems: proposalData.proposerSelectedItems,
        offerMessage: proposalData.offerMessage,
        cashOffer: proposalData.cashOffer,
        termsAccepted: proposalData.termsAccepted,
        isMatchBased: proposalData.isMatchBased,
        matchedItem: proposalData.matchedItem,
        targetItemData: proposalData.targetItemData,
        valueComparison: proposalData.valueComparison,
        phase: this.NEGOTIATION_PHASES.INITIAL_PROPOSAL,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        proposalHistory: [{
          phase: this.NEGOTIATION_PHASES.INITIAL_PROPOSAL,
          proposedBy: proposalData.proposerUserId,
          itemCount: proposalData.proposerSelectedItems?.length || 0
        }]
      };

      console.log('🔍 Final proposal document keys:', Object.keys(proposalDocument));
      
      const proposalRef = await addDoc(collection(db, 'tradeProposals'), proposalDocument);

      console.log(`✅ Trade proposal created: ${proposalRef.id}`);
      
      // Create associated escrow
      const escrowResult = await EscrowService.createEscrow({
        tradeProposalId: proposalRef.id,
        participantIds: [proposalData.proposerUserId, proposalData.targetUserId],
        proposerUserId: proposalData.proposerUserId,
        targetUserId: proposalData.targetUserId,
        targetItemId: proposalData.targetItemId,
        totalValue: proposalData.estimatedValue || 0,
        tradeType: proposalData.tradeType || 'trade'
      });

      if (escrowResult.success) {
        await updateDoc(proposalRef, {
          escrowId: escrowResult.escrowId
        });
      }

      return { success: true, proposalId: proposalRef.id, escrowId: escrowResult.escrowId };
    } catch (error) {
      console.error('❌ Error creating trade proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept a trade proposal
   */
  static async acceptProposal(proposalId, userId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = proposalDoc.data();

      // Soft lock the item when proposal is accepted
      if (proposalData.itemId) {
        try {
          await OfferComparisonService.softLockItem(
            proposalData.itemId,
            proposalId,
            userId
          );
          console.log(`✅ Item ${proposalData.itemId} soft-locked for proposal ${proposalId}`);
        } catch (lockError) {
          console.error('Error soft-locking item:', lockError);
          // Continue with acceptance even if lock fails
        }
      }

      // Update proposal status
      await updateDoc(proposalRef, {
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: serverTimestamp(),
        phase: this.NEGOTIATION_PHASES.ITEM_SELECTION,
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.ITEM_SELECTION,
          action: 'accepted',
          userId: userId
        })
      });

      // Update escrow state
      if (proposalData.escrowId) {
        await EscrowService.updateEscrowState(
          proposalData.escrowId,
          EscrowService.ESCROW_STATES.PENDING_ACCEPTANCE
        );
      }

      console.log(`✅ Proposal accepted: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error accepting proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit a counter-offer
   */
  static async submitCounterOffer(proposalId, counterOfferData, userId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      
      await updateDoc(proposalRef, {
        status: 'counter_offered',
        phase: this.NEGOTIATION_PHASES.COUNTER_OFFER,
        counterOffer: counterOfferData,
        counterOfferBy: userId,
        counterOfferAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.COUNTER_OFFER,
          action: 'counter_offer',
          userId: userId,
          counterOfferAmount: counterOfferData.cashAmount || counterOfferData.newTerms?.cashAmount || 0
        })
      });

      console.log(`✅ Counter-offer submitted: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error submitting counter-offer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Select items for trade (user chooses which of their items to offer)
   */
  static async selectTradeItems(proposalId, selectedItems, userId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = proposalDoc.data();

      // Determine which user is selecting items
      const userRole = userId === proposalData.proposerUserId ? 'proposer' : 'target';
      
      await updateDoc(proposalRef, {
        [`${userRole}SelectedItems`]: selectedItems,
        phase: this.NEGOTIATION_PHASES.TERMS_AGREEMENT,
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.ITEM_SELECTION,
          action: 'items_selected',
          userId: userId,
          itemCount: selectedItems.length
        })
      });

      console.log(`✅ Items selected for trade: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error selecting trade items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Agree to trade terms
   */
  static async agreeToTerms(proposalId, userId, termsAgreed) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = proposalDoc.data();

      // Track which users have agreed
      const currentAgreements = proposalData.termsAgreements || [];
      const newAgreements = [...currentAgreements, { userId, agreedAt: serverTimestamp(), terms: termsAgreed }];

      await updateDoc(proposalRef, {
        termsAgreements: newAgreements,
        termsAgreed: newAgreements.length >= 2, // Both parties agreed
        phase: newAgreements.length >= 2 ? this.NEGOTIATION_PHASES.ESCROW_LOCKING : this.NEGOTIATION_PHASES.TERMS_AGREEMENT,
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.TERMS_AGREEMENT,
          action: 'terms_agreed',
          userId: userId
        })
      });

      // If both agreed, lock items in escrow
      if (newAgreements.length >= 2 && proposalData.escrowId) {
        const itemsToLock = [
          ...(proposalData.proposerSelectedItems || []).map(item => ({
            itemId: item.id,
            originalOwnerId: proposalData.proposerUserId,
            newOwnerId: proposalData.targetUserId
          })),
          ...(proposalData.targetSelectedItems || []).map(item => ({
            itemId: item.id,
            originalOwnerId: proposalData.targetUserId,
            newOwnerId: proposalData.proposerUserId
          }))
        ];

        await EscrowService.lockItemsInEscrow(proposalData.escrowId, itemsToLock);
        await EscrowService.updateEscrowState(proposalData.escrowId, EscrowService.ESCROW_STATES.ITEMS_LOCKED);
      }

      console.log(`✅ Terms agreed: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error agreeing to terms:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Confirm ready for exchange
   */
  static async confirmReadyForExchange(proposalId, userId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = proposalDoc.data();

      // Track which users are ready
      const currentReady = proposalData.readyForExchange || [];
      const newReady = [...currentReady, { userId, readyAt: serverTimestamp() }];

      await updateDoc(proposalRef, {
        readyForExchange: newReady,
        bothPartiesReady: newReady.length >= 2,
        phase: newReady.length >= 2 ? this.NEGOTIATION_PHASES.SHIPPING_COORDINATION : this.NEGOTIATION_PHASES.ESCROW_LOCKING,
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.ESCROW_LOCKING,
          action: 'ready_for_exchange',
          userId: userId
        })
      });

      // Update escrow if both ready
      if (newReady.length >= 2 && proposalData.escrowId) {
        await EscrowService.updateEscrowState(proposalData.escrowId, EscrowService.ESCROW_STATES.READY_TO_EXCHANGE);
      }

      console.log(`✅ Ready for exchange confirmed: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error confirming ready for exchange:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update shipping information
   */
  static async updateShippingInfo(proposalId, shippingData, userId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      
      await updateDoc(proposalRef, {
        [`shippingInfo.${userId}`]: shippingData,
        phase: this.NEGOTIATION_PHASES.SHIPPING_COORDINATION,
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.SHIPPING_COORDINATION,
          action: 'shipping_info_updated',
          userId: userId
        })
      });

      console.log(`✅ Shipping info updated: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating shipping info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Confirm item received
   */
  static async confirmItemReceived(proposalId, userId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = proposalDoc.data();

      // Track confirmations
      const currentConfirmations = proposalData.receiptConfirmations || [];
      const newConfirmations = [...currentConfirmations, { userId, confirmedAt: serverTimestamp() }];

      await updateDoc(proposalRef, {
        receiptConfirmations: newConfirmations,
        phase: this.NEGOTIATION_PHASES.CONFIRMATION,
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.CONFIRMATION,
          action: 'item_received',
          userId: userId
        })
      });

      // If both confirmed, complete the trade
      if (newConfirmations.length >= 2 && proposalData.escrowId) {
        await EscrowService.completeEscrow(proposalData.escrowId);
        await updateDoc(proposalRef, {
          phase: this.NEGOTIATION_PHASES.COMPLETED,
          status: 'completed',
          completedAt: serverTimestamp()
        });
      }

      console.log(`✅ Item received confirmed: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error confirming item received:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get trade proposal details
   */
  static async getTradeProposal(proposalId) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = { id: proposalDoc.id, ...proposalDoc.data() };

      // Get escrow details if available
      if (proposalData.escrowId) {
        const escrowResult = await EscrowService.getEscrow(proposalData.escrowId);
        if (escrowResult.success) {
          proposalData.escrow = escrowResult.escrow;
        }
      }

      return { success: true, proposal: proposalData };
    } catch (error) {
      console.error('❌ Error getting trade proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's active trade proposals
   */
  static async getUserTradeProposals(userId) {
    try {
      const proposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('participantIds', 'array-contains', userId),
        where('status', 'in', ['pending', 'accepted', 'counter_offered'])
      );

      const snapshot = await getDocs(proposalsQuery);
      const proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return { success: true, proposals };
    } catch (error) {
      console.error('❌ Error getting user trade proposals:', error);
      return { success: false, error: error.message, proposals: [] };
    }
  }

  /**
   * Cancel trade proposal
   */
  static async cancelProposal(proposalId, userId, reason) {
    try {
      const proposalRef = doc(db, 'tradeProposals', proposalId);
      const proposalDoc = await getDoc(proposalRef);
      
      if (!proposalDoc.exists()) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposalData = proposalDoc.data();

      // Release items from escrow if locked
      if (proposalData.escrowId) {
        await EscrowService.cancelEscrow(proposalData.escrowId, userId);
      }

      // Update proposal status
      await updateDoc(proposalRef, {
        status: 'cancelled',
        cancelledBy: userId,
        cancelledAt: serverTimestamp(),
        cancellationReason: reason,
        phase: this.NEGOTIATION_PHASES.INITIAL_PROPOSAL, // Reset to initial
        updatedAt: serverTimestamp(),
        proposalHistory: arrayUnion({
          phase: this.NEGOTIATION_PHASES.INITIAL_PROPOSAL,
          action: 'cancelled',
          userId: userId,
          reason: reason
        })
      });

      console.log(`✅ Proposal cancelled: ${proposalId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get next action for user based on current proposal state
   */
  static getNextAction(proposalData, userId) {
    const { phase, status, proposerUserId, targetUserId, termsAgreements, readyForExchange, receiptConfirmations } = proposalData;
    const userRole = userId === proposerUserId ? 'proposer' : 'target';

    switch (phase) {
      case this.NEGOTIATION_PHASES.INITIAL_PROPOSAL:
        if (status === 'pending' && userRole === 'target') {
          return { action: 'accept_or_counter', label: 'Accept or Counter Offer' };
        }
        return { action: 'waiting', label: 'Waiting for response' };

      case this.NEGOTIATION_PHASES.COUNTER_OFFER:
        if (userRole === 'proposer') {
          return { action: 'respond_to_counter', label: 'Respond to Counter Offer' };
        }
        return { action: 'waiting', label: 'Waiting for response' };

      case this.NEGOTIATION_PHASES.ITEM_SELECTION:
        const hasSelectedItems = proposalData[`${userRole}SelectedItems`]?.length > 0;
        if (!hasSelectedItems) {
          return { action: 'select_items', label: 'Select Your Items' };
        }
        return { action: 'waiting', label: 'Waiting for other party' };

      case this.NEGOTIATION_PHASES.TERMS_AGREEMENT:
        const hasAgreed = termsAgreements?.some(agreement => agreement.userId === userId);
        if (!hasAgreed) {
          return { action: 'agree_terms', label: 'Agree to Terms' };
        }
        return { action: 'waiting', label: 'Waiting for agreement' };

      case this.NEGOTIATION_PHASES.ESCROW_LOCKING:
        const isReady = readyForExchange?.some(ready => ready.userId === userId);
        if (!isReady) {
          return { action: 'confirm_ready', label: 'Confirm Ready for Exchange' };
        }
        return { action: 'waiting', label: 'Waiting for confirmation' };

      case this.NEGOTIATION_PHASES.SHIPPING_COORDINATION:
        const hasShippingInfo = proposalData.shippingInfo?.[userId];
        if (!hasShippingInfo) {
          return { action: 'provide_shipping', label: 'Provide Shipping Info' };
        }
        return { action: 'waiting', label: 'Waiting for shipping' };

      case this.NEGOTIATION_PHASES.CONFIRMATION:
        const hasConfirmed = receiptConfirmations?.some(conf => conf.userId === userId);
        if (!hasConfirmed) {
          return { action: 'confirm_receipt', label: 'Confirm Item Received' };
        }
        return { action: 'waiting', label: 'Waiting for confirmation' };

      case this.NEGOTIATION_PHASES.COMPLETED:
        return { action: 'completed', label: 'Trade Completed' };

      default:
        return { action: 'unknown', label: 'Unknown State' };
    }
  }
}

export default TradeNegotiationService;
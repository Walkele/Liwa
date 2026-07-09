import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Escrow Service - Binance-like escrow system for secure item trading
 * Manages item holding during negotiations with state tracking
 */
export class EscrowService {
  
  // Escrow states
  static ESCROW_STATES = {
    INITIATED: 'initiated',           // Trade proposed, waiting for counterparty
    PENDING_ACCEPTANCE: 'pending_acceptance', // Counterparty needs to accept
    IN_NEGOTIATION: 'in_negotiation',      // Both parties discussing terms
    ITEMS_LOCKED: 'items_locked',          // Items reserved in escrow
    READY_TO_EXCHANGE: 'ready_to_exchange', // Both parties confirmed
    IN_TRANSIT: 'in_transit',              // Items being shipped
    AWAITING_CONFIRMATION: 'awaiting_confirmation', // Waiting for delivery confirmation
    COMPLETED: 'completed',                // Trade successfully completed
    CANCELLED: 'cancelled',                // Trade cancelled
    DISPUTED: 'disputed'                  // Trade under dispute
  };

  /**
   * Create a new escrow for a trade
   */
  static async createEscrow(tradeData) {
    try {
      // Sanitize trade data to remove any potential timestamp fields
      const sanitizedTradeData = {
        tradeProposalId: tradeData.tradeProposalId,
        participantIds: tradeData.participantIds,
        proposerUserId: tradeData.proposerUserId,
        targetUserId: tradeData.targetUserId,
        targetItemId: tradeData.targetItemId,
        totalValue: tradeData.totalValue,
        tradeType: tradeData.tradeType
      };

      const escrowRef = await addDoc(collection(db, 'escrows'), {
        ...sanitizedTradeData,
        state: this.ESCROW_STATES.INITIATED,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        itemsLocked: false,
        bothPartiesConfirmed: false,
        escrowFees: this.calculateEscrowFees(tradeData),
        smartContractAddress: this.generateSmartContractAddress()
      });

      console.log(`✅ Escrow created: ${escrowRef.id}`);
      return { success: true, escrowId: escrowRef.id };
    } catch (error) {
      console.error('❌ Error creating escrow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lock items in escrow (like Binance's order locking)
   */
  static async lockItemsInEscrow(escrowId, itemsToLock) {
    try {
      const escrowRef = doc(db, 'escrows', escrowId);
      
      // Update escrow with locked items
      await updateDoc(escrowRef, {
        itemsLocked: true,
        lockedItems: itemsToLock,
        state: this.ESCROW_STATES.ITEMS_LOCKED,
        lockedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update item statuses to show they're in escrow
      for (const item of itemsToLock) {
        const itemRef = doc(db, 'items', item.itemId);
        await updateDoc(itemRef, {
          status: 'in_escrow',
          escrowId: escrowId,
          lockedForTrade: true
        });
      }

      console.log(`✅ Items locked in escrow: ${escrowId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error locking items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Release items from escrow (when trade completes or cancels)
   */
  static async releaseItemsFromEscrow(escrowId, newStatus = 'available') {
    try {
      const escrowRef = doc(db, 'escrows', escrowId);
      const escrowDoc = await getDoc(escrowRef);
      
      if (!escrowDoc.exists()) {
        return { success: false, error: 'Escrow not found' };
      }

      const escrowData = escrowDoc.data();
      const lockedItems = escrowData.lockedItems || [];

      // Release all locked items
      for (const item of lockedItems) {
        const itemRef = doc(db, 'items', item.itemId);
        await updateDoc(itemRef, {
          status: newStatus,
          escrowId: null,
          lockedForTrade: false
        });
      }

      // Update escrow state
      await updateDoc(escrowRef, {
        itemsLocked: false,
        releasedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Items released from escrow: ${escrowId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error releasing items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get escrow details
   */
  static async getEscrow(escrowId) {
    try {
      const escrowRef = doc(db, 'escrows', escrowId);
      const escrowDoc = await getDoc(escrowRef);
      
      if (!escrowDoc.exists()) {
        return { success: false, error: 'Escrow not found' };
      }

      return { success: true, escrow: { id: escrowDoc.id, ...escrowDoc.data() } };
    } catch (error) {
      console.error('❌ Error getting escrow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update escrow state
   */
  static async updateEscrowState(escrowId, newState, additionalData = {}) {
    try {
      const escrowRef = doc(db, 'escrows', escrowId);
      
      await updateDoc(escrowRef, {
        state: newState,
        stateHistory: {
          [newState]: serverTimestamp()
        },
        ...additionalData,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Escrow state updated: ${escrowId} -> ${newState}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating escrow state:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's active escrows
   */
  static async getUserEscrows(userId) {
    try {
      const escrowsQuery = query(
        collection(db, 'escrows'),
        where('participantIds', 'array-contains', userId),
        where('state', 'in', [
          this.ESCROW_STATES.INITIATED,
          this.ESCROW_STATES.PENDING_ACCEPTANCE,
          this.ESCROW_STATES.IN_NEGOTIATION,
          this.ESCROW_STATES.ITEMS_LOCKED,
          this.ESCROW_STATES.READY_TO_EXCHANGE,
          this.ESCROW_STATES.IN_TRANSIT,
          this.ESCROW_STATES.AWAITING_CONFIRMATION
        ])
      );

      const snapshot = await getDocs(escrowsQuery);
      const escrows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return { success: true, escrows };
    } catch (error) {
      console.error('❌ Error getting user escrows:', error);
      return { success: false, error: error.message, escrows: [] };
    }
  }

  /**
   * Cancel escrow and release items
   */
  static async cancelEscrow(escrowId, cancelledBy) {
    try {
      // First release items
      await this.releaseItemsFromEscrow(escrowId, 'available');
      
      // Then update escrow state
      await this.updateEscrowState(escrowId, this.ESCROW_STATES.CANCELLED, {
        cancelledBy,
        cancelledAt: serverTimestamp()
      });

      console.log(`✅ Escrow cancelled: ${escrowId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling escrow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete escrow (trade finished successfully)
   */
  static async completeEscrow(escrowId) {
    try {
      // Release items to new owners
      const escrowResult = await this.getEscrow(escrowId);
      if (!escrowResult.success) {
        return escrowResult;
      }

      const escrow = escrowResult.escrow;
      const lockedItems = escrow.lockedItems || [];

      // Transfer ownership of items
      for (const item of lockedItems) {
        const itemRef = doc(db, 'items', item.itemId);
        await updateDoc(itemRef, {
          status: 'sold',
          previousOwnerId: item.originalOwnerId,
          userId: item.newOwnerId,
          escrowId: null,
          lockedForTrade: false,
          soldAt: serverTimestamp()
        });
      }

      // Update escrow state
      await this.updateEscrowState(escrowId, this.ESCROW_STATES.COMPLETED, {
        completedAt: serverTimestamp()
      });

      console.log(`✅ Escrow completed: ${escrowId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error completing escrow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate escrow fees (Binance-like fee structure)
   */
  static calculateEscrowFees(tradeData) {
    const { totalValue, tradeType } = tradeData;
    
    // Fee structure: 1% for trades, 2% for cash transactions
    const feePercentage = tradeType === 'trade' ? 0.01 : 0.02;
    const feeAmount = totalValue * feePercentage;
    
    return {
      percentage: feePercentage * 100,
      amount: feeAmount,
      currency: 'USD'
    };
  }

  /**
   * Generate smart contract address (mock for demo)
   */
  static generateSmartContractAddress() {
    return '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Validate if escrow can proceed to next state
   */
  static canTransitionToState(currentState, targetState) {
    const stateTransitions = {
      [this.ESCROW_STATES.INITIATED]: [
        this.ESCROW_STATES.PENDING_ACCEPTANCE,
        this.ESCROW_STATES.CANCELLED
      ],
      [this.ESCROW_STATES.PENDING_ACCEPTANCE]: [
        this.ESCROW_STATES.IN_NEGOTIATION,
        this.ESCROW_STATES.ITEMS_LOCKED,
        this.ESCROW_STATES.CANCELLED
      ],
      [this.ESCROW_STATES.IN_NEGOTIATION]: [
        this.ESCROW_STATES.ITEMS_LOCKED,
        this.ESCROW_STATES.CANCELLED
      ],
      [this.ESCROW_STATES.ITEMS_LOCKED]: [
        this.ESCROW_STATES.READY_TO_EXCHANGE,
        this.ESCROW_STATES.CANCELLED
      ],
      [this.ESCROW_STATES.READY_TO_EXCHANGE]: [
        this.ESCROW_STATES.IN_TRANSIT,
        this.ESCROW_STATES.CANCELLED
      ],
      [this.ESCROW_STATES.IN_TRANSIT]: [
        this.ESCROW_STATES.AWAITING_CONFIRMATION,
        this.ESCROW_STATES.DISPUTED
      ],
      [this.ESCROW_STATES.AWAITING_CONFIRMATION]: [
        this.ESCROW_STATES.COMPLETED,
        this.ESCROW_STATES.DISPUTED
      ]
    };

    return stateTransitions[currentState]?.includes(targetState) || false;
  }
}

export default EscrowService;
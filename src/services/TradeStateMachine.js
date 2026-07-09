import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AntiFraudService } from './AntiFraudService';

export class TradeStateMachine {
  
  // Comprehensive state definitions
  static STATES = {
    // Item states
    AVAILABLE: 'available',
    MATCHED: 'matched',
    OFFER_SENT: 'offer_sent',
    OFFER_PENDING: 'offer_pending',
    SWAP_PENDING: 'swap_pending',
    COMMITTED: 'committed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed',
    ARCHIVED: 'archived',
    LOCKED: 'locked',
    DELETED: 'deleted'
  };

  // Valid state transitions
  static TRANSITIONS = {
    [this.STATES.AVAILABLE]: [
      this.STATES.MATCHED,
      this.STATES.DELETED,
      this.STATES.LOCKED
    ],
    [this.STATES.MATCHED]: [
      this.STATES.OFFER_SENT,
      this.STATES.AVAILABLE, // Unmatch
      this.STATES.DELETED,
      this.STATES.LOCKED
    ],
    [this.STATES.OFFER_SENT]: [
      this.STATES.OFFER_PENDING,
      this.STATES.CANCELLED,
      this.STATES.MATCHED // Offer rejected
    ],
    [this.STATES.OFFER_PENDING]: [
      this.STATES.SWAP_PENDING, // Accepted
      this.STATES.CANCELLED,
      this.STATES.MATCHED // Counter offer
    ],
    [this.STATES.SWAP_PENDING]: [
      this.STATES.COMMITTED,
      this.STATES.CANCELLED,
      this.STATES.DISPUTED
    ],
    [this.STATES.COMMITTED]: [
      this.STATES.IN_PROGRESS,
      this.STATES.CANCELLED,
      this.STATES.DISPUTED
    ],
    [this.STATES.IN_PROGRESS]: [
      this.STATES.COMPLETED,
      this.STATES.DISPUTED
    ],
    [this.STATES.COMPLETED]: [
      this.STATES.ARCHIVED,
      this.STATES.DISPUTED
    ],
    [this.STATES.CANCELLED]: [
      this.STATES.AVAILABLE, // Reactivate
      this.STATES.ARCHIVED
    ],
    [this.STATES.DISPUTED]: [
      this.STATES.COMPLETED, // Resolved
      this.STATES.CANCELLED, // Cancelled due to dispute
      this.STATES.ARCHIVED
    ],
    [this.STATES.LOCKED]: [
      // Locked items can only be unlocked by admin or system
      this.STATES.AVAILABLE,
      this.STATES.DELETED
    ],
    [this.STATES.DELETED]: [
      // Deleted items are immutable (soft delete)
    ],
    [this.STATES.ARCHIVED]: [
      // Archived items are immutable
    ]
  };

  // Actions that require special permissions or conditions
  static RESTRICTED_ACTIONS = {
    DELETE_WITH_ACTIVE_TRADES: 'delete_with_active_trades',
    UNLOCK_ITEM: 'unlock_item',
    FORCE_COMPLETE: 'force_complete',
    RESOLVE_DISPUTE: 'resolve_dispute'
  };

  // State transition with validation and fraud prevention
  static async transitionState(itemId, fromState, toState, userId, metadata = {}) {
    try {
      console.log(`🔄 Attempting state transition: ${fromState} → ${toState} for item ${itemId}`);
      
      // Validate transition is allowed
      if (!this.isValidTransition(fromState, toState)) {
        throw new Error(`Invalid state transition: ${fromState} → ${toState}`);
      }
      
      // Get current item state
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const currentData = itemDoc.data();
      
      // Verify current state matches expected state (prevent race conditions)
      if (currentData.status !== fromState) {
        throw new Error(`State mismatch: Expected ${fromState}, found ${currentData.status}`);
      }
      
      // Check for concurrent modifications (409 Conflict prevention)
      if (metadata.lastUpdatedAt && currentData.lastUpdatedAt) {
        const clientTimestamp = new Date(metadata.lastUpdatedAt);
        const serverTimestamp = currentData.lastUpdatedAt.toDate();
        
        if (serverTimestamp > clientTimestamp) {
          throw new Error('409 Conflict: Item was modified by another user. Please refresh and try again.');
        }
      }
      
      // Apply state-specific business logic
      const transitionResult = await this.applyStateLogic(itemId, fromState, toState, userId, metadata);
      
      if (!transitionResult.allowed) {
        throw new Error(transitionResult.reason || 'State transition not allowed');
      }
      
      // Perform atomic state update
      const updateData = {
        status: toState,
        lastUpdatedAt: serverTimestamp(),
        version: (currentData.version || 1) + 1,
        stateHistory: [
          ...(currentData.stateHistory || []),
          {
            fromState,
            toState,
            timestamp: serverTimestamp(),
            userId,
            metadata: metadata.reason || 'State transition'
          }
        ]
      };
      
      // Add state-specific fields
      if (transitionResult.additionalFields) {
        Object.assign(updateData, transitionResult.additionalFields);
      }
      
      await updateDoc(itemRef, updateData);
      
      // Log state transition for audit trail
      await this.logStateTransition(itemId, fromState, toState, userId, metadata);
      
      console.log(`✅ State transition completed: ${fromState} → ${toState}`);
      return {
        success: true,
        newState: toState,
        version: updateData.version
      };
      
    } catch (error) {
      console.error(`❌ State transition failed: ${fromState} → ${toState}`, error);
      throw error;
    }
  }

  // Validate if a state transition is allowed
  static isValidTransition(fromState, toState) {
    const allowedTransitions = this.TRANSITIONS[fromState];
    return allowedTransitions && allowedTransitions.includes(toState);
  }

  // Apply business logic for specific state transitions
  static async applyStateLogic(itemId, fromState, toState, userId, metadata) {
    try {
      console.log(`🧠 Applying business logic for ${fromState} → ${toState}`);
      
      switch (toState) {
        case this.STATES.MATCHED:
          return await this.handleMatchTransition(itemId, userId, metadata);
          
        case this.STATES.OFFER_SENT:
          return await this.handleOfferSentTransition(itemId, userId, metadata);
          
        case this.STATES.SWAP_PENDING:
          return await this.handleSwapPendingTransition(itemId, userId, metadata);
          
        case this.STATES.COMMITTED:
          return await this.handleCommittedTransition(itemId, userId, metadata);
          
        case this.STATES.IN_PROGRESS:
          return await this.handleInProgressTransition(itemId, userId, metadata);
          
        case this.STATES.COMPLETED:
          return await this.handleCompletedTransition(itemId, userId, metadata);
          
        case this.STATES.DELETED:
          return await this.handleDeleteTransition(itemId, userId, metadata);
          
        case this.STATES.LOCKED:
          return await this.handleLockTransition(itemId, userId, metadata);
          
        default:
          return { allowed: true };
      }
      
    } catch (error) {
      console.error('Error applying state logic:', error);
      return { allowed: false, reason: error.message };
    }
  }

  // Handle match transition (bait-and-switch prevention)
  static async handleMatchTransition(itemId, userId, metadata) {
    try {
      // Create immutable snapshot to prevent bait-and-switch
      const snapshotId = await AntiFraudService.createItemSnapshot(itemId, 'match_created');
      
      return {
        allowed: true,
        additionalFields: {
          snapshotId,
          matchedWith: metadata.matchedUserId,
          matchedAt: serverTimestamp(),
          isLocked: true,
          lockedReason: 'Item matched - preventing modifications'
        }
      };
      
    } catch (error) {
      return { allowed: false, reason: `Failed to create item snapshot: ${error.message}` };
    }
  }

  // Handle offer sent transition
  static async handleOfferSentTransition(itemId, userId, metadata) {
    try {
      // Validate offer data for API injection
      if (metadata.offerData) {
        const itemDoc = await getDoc(doc(db, 'items', itemId));
        const validation = AntiFraudService.validateTradeData(metadata.offerData, itemDoc.data());
        
        if (!validation.isValid) {
          return { 
            allowed: false, 
            reason: `Invalid offer data: ${validation.errors.map(e => e.field).join(', ')}` 
          };
        }
      }
      
      return {
        allowed: true,
        additionalFields: {
          offerSentBy: userId,
          offerSentAt: serverTimestamp(),
          offerData: metadata.offerData
        }
      };
      
    } catch (error) {
      return { allowed: false, reason: `Offer validation failed: ${error.message}` };
    }
  }

  // Handle swap pending transition (double swap prevention)
  static async handleSwapPendingTransition(itemId, userId, metadata) {
    try {
      // Use atomic operation to prevent double swap
      const atomicResult = await AntiFraudService.atomicTradeAcceptance(
        itemId, 
        userId, 
        metadata
      );
      
      return {
        allowed: atomicResult,
        additionalFields: {
          swapAcceptedBy: userId,
          swapAcceptedAt: serverTimestamp(),
          tradeId: metadata.tradeId
        }
      };
      
    } catch (error) {
      return { allowed: false, reason: error.message };
    }
  }

  // Handle committed transition
  static async handleCommittedTransition(itemId, userId, metadata) {
    return {
      allowed: true,
      additionalFields: {
        committedBy: userId,
        committedAt: serverTimestamp(),
        commitmentType: metadata.commitmentType || 'trade_commitment'
      }
    };
  }

  // Handle in progress transition (location validation)
  static async handleInProgressTransition(itemId, userId, metadata) {
    try {
      // Validate location if provided
      if (metadata.location) {
        const locationValidation = await AntiFraudService.validateLocation(
          metadata.location, 
          userId
        );
        
        if (!locationValidation.isValid) {
          return { 
            allowed: false, 
            reason: `Location validation failed: ${locationValidation.flags.join(', ')}` 
          };
        }
      }
      
      return {
        allowed: true,
        additionalFields: {
          exchangeStartedBy: userId,
          exchangeStartedAt: serverTimestamp(),
          exchangeLocation: metadata.location
        }
      };
      
    } catch (error) {
      return { allowed: false, reason: `Location validation error: ${error.message}` };
    }
  }

  // Handle completed transition
  static async handleCompletedTransition(itemId, userId, metadata) {
    return {
      allowed: true,
      additionalFields: {
        completedBy: userId,
        completedAt: serverTimestamp(),
        completionMethod: metadata.completionMethod || 'manual',
        qrVerified: metadata.qrVerified || false
      }
    };
  }

  // Handle delete transition (soft delete with evidence preservation)
  static async handleDeleteTransition(itemId, userId, metadata) {
    try {
      const deleteResult = await AntiFraudService.softDeleteItem(
        itemId, 
        userId, 
        metadata.reason
      );
      
      return {
        allowed: true,
        additionalFields: {
          deletedBy: userId,
          deletedAt: serverTimestamp(),
          deletionReason: metadata.reason || 'user_deleted',
          preserveEvidence: deleteResult.preserved,
          preserveUntil: deleteResult.preserved ? 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
        }
      };
      
    } catch (error) {
      return { allowed: false, reason: `Deletion failed: ${error.message}` };
    }
  }

  // Handle lock transition
  static async handleLockTransition(itemId, userId, metadata) {
    return {
      allowed: true,
      additionalFields: {
        lockedBy: userId,
        lockedAt: serverTimestamp(),
        lockReason: metadata.reason || 'manual_lock',
        lockType: metadata.lockType || 'user_initiated'
      }
    };
  }

  // Log state transition for audit trail
  static async logStateTransition(itemId, fromState, toState, userId, metadata) {
    try {
      await addDoc(collection(db, 'stateTransitionLogs'), {
        itemId,
        fromState,
        toState,
        userId,
        metadata,
        timestamp: serverTimestamp(),
        userAgent: metadata.userAgent || 'unknown',
        ipAddress: metadata.ipAddress || 'unknown'
      });
    } catch (error) {
      console.error('Error logging state transition:', error);
    }
  }

  // Get current state with validation
  static async getCurrentState(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const data = itemDoc.data();
      
      return {
        currentState: data.status,
        version: data.version || 1,
        lastUpdated: data.lastUpdatedAt,
        isLocked: data.isLocked || false,
        stateHistory: data.stateHistory || []
      };
      
    } catch (error) {
      console.error('Error getting current state:', error);
      throw error;
    }
  }

  // Check if action is allowed in current state
  static isActionAllowed(currentState, action) {
    const stateConfig = {
      [this.STATES.AVAILABLE]: ['edit', 'delete', 'match'],
      [this.STATES.MATCHED]: ['unmatch', 'send_offer'],
      [this.STATES.OFFER_SENT]: ['cancel_offer', 'view_status'],
      [this.STATES.OFFER_PENDING]: ['accept_offer', 'decline_offer', 'counter_offer'],
      [this.STATES.SWAP_PENDING]: ['commit', 'cancel_trade'],
      [this.STATES.COMMITTED]: ['start_exchange', 'cancel_trade'],
      [this.STATES.IN_PROGRESS]: ['complete_trade', 'report_issue'],
      [this.STATES.COMPLETED]: ['rate_user', 'archive'],
      [this.STATES.LOCKED]: [], // No actions allowed
      [this.STATES.DELETED]: [], // No actions allowed
      [this.STATES.ARCHIVED]: ['view_only'] // Read-only
    };
    
    const allowedActions = stateConfig[currentState] || [];
    return allowedActions.includes(action);
  }
}

export default TradeStateMachine;
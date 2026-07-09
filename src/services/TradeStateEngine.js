import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemLockingService } from './ItemLockingService';
import { NotificationService } from './notificationService';

export class TradeStateEngine {
  
  // Trade States
  static TRADE_STATES = {
    PROPOSAL_SENT: 'proposal_sent',
    PROPOSAL_RECEIVED: 'proposal_received',
    BOTH_ACCEPTED: 'both_accepted',
    ITEMS_LOCKED: 'items_locked',
    VERIFICATION_PENDING: 'verification_pending',
    EXCHANGE_IN_PROGRESS: 'exchange_in_progress',
    VERIFICATION_COMPLETE: 'verification_complete',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENALTY_APPLIED: 'penalty_applied'
  };

  // SOP Constants
  static SOP_RULES = {
    LOCK_DURATION_HOURS: 48,
    EXCHANGE_WINDOW_HOURS: 24,
    MAX_STRIKES: 3,
    PENALTY_DAYS: 3,
    VERIFICATION_CODE_LENGTH: 6
  };

  // Lock items and create trade record
  static async lockItemsAndCreateTrade(tradeProposalId, proposerUserId, targetUserId, proposerItemId, targetItemId) {
    try {
      console.log('🔒 Locking items and creating trade record...');
      
      const tradeId = `trade_${tradeProposalId}_${Date.now()}`;
      const lockExpiry = new Date(Date.now() + (this.SOP_RULES.LOCK_DURATION_HOURS * 60 * 60 * 1000));
      const exchangeDeadline = new Date(Date.now() + (this.SOP_RULES.EXCHANGE_WINDOW_HOURS * 60 * 60 * 1000));
      
      // Generate verification codes
      const proposerCode = this.generateVerificationCode();
      const targetCode = this.generateVerificationCode();
      
      // Lock both items
      await ItemLockingService.lockItemForTrade(proposerItemId, proposerUserId, tradeId, 'trade_locked');
      await ItemLockingService.lockItemForTrade(targetItemId, targetUserId, tradeId, 'trade_locked');
      
      // Create comprehensive trade record
      const tradeData = {
        id: tradeId,
        tradeProposalId,
        proposerUserId,
        targetUserId,
        proposerItemId,
        targetItemId,
        
        // State management
        currentState: this.TRADE_STATES.ITEMS_LOCKED,
        stateHistory: [{
          state: this.TRADE_STATES.ITEMS_LOCKED,
          timestamp: serverTimestamp(),
          triggeredBy: 'system'
        }],
        
        // Timing and deadlines
        lockedAt: serverTimestamp(),
        lockExpiry,
        exchangeDeadline,
        
        // Verification
        proposerVerificationCode: proposerCode,
        targetVerificationCode: targetCode,
        proposerVerified: false,
        targetVerified: false,
        
        // Participants
        participants: [proposerUserId, targetUserId],
        
        // SOP tracking
        sopRules: this.SOP_RULES,
        penaltiesApplied: [],
        
        // Status flags
        isActive: true,
        isLocked: true,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save trade record
      await setDoc(doc(db, 'activeTrades', tradeId), tradeData);
      
      // Update user trade restrictions
      await this.updateUserTradeRestrictions(proposerUserId, targetUserId, tradeId);
      
      console.log('✅ Trade locked successfully:', tradeId);
      return {
        tradeId,
        proposerCode,
        targetCode,
        exchangeDeadline,
        lockExpiry
      };
      
    } catch (error) {
      console.error('❌ Error locking items and creating trade:', error);
      throw error;
    }
  }

  // Update user trade restrictions to prevent multiple trades between same users
  static async updateUserTradeRestrictions(user1Id, user2Id, tradeId) {
    try {
      const restrictionId = `${user1Id}_${user2Id}`;
      const reverseRestrictionId = `${user2Id}_${user1Id}`;
      
      const restrictionData = {
        user1Id,
        user2Id,
        activeTradeId: tradeId,
        restrictedAt: serverTimestamp(),
        canTradeAgain: false,
        reason: 'active_trade_in_progress'
      };
      
      // Create restrictions in both directions
      await setDoc(doc(db, 'tradeRestrictions', restrictionId), restrictionData);
      await setDoc(doc(db, 'tradeRestrictions', reverseRestrictionId), restrictionData);
      
    } catch (error) {
      console.error('❌ Error updating trade restrictions:', error);
    }
  }

  // Generate verification code
  static generateVerificationCode() {
    return Math.random().toString(36).substring(2, 2 + this.SOP_RULES.VERIFICATION_CODE_LENGTH).toUpperCase();
  }

  // Verify exchange code
  static async verifyExchangeCode(tradeId, userId, enteredCode) {
    try {
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      const isProposer = tradeData.proposerUserId === userId;
      const expectedCode = isProposer ? tradeData.proposerVerificationCode : tradeData.targetVerificationCode;
      
      if (enteredCode.toUpperCase() !== expectedCode) {
        throw new Error('Invalid verification code');
      }
      
      // Update verification status
      const updateData = {
        updatedAt: serverTimestamp()
      };
      
      if (isProposer) {
        updateData.proposerVerified = true;
        updateData.proposerVerifiedAt = serverTimestamp();
      } else {
        updateData.targetVerified = true;
        updateData.targetVerifiedAt = serverTimestamp();
      }
      
      // Check if both verified
      const bothVerified = (isProposer ? true : tradeData.proposerVerified) && 
                          (!isProposer ? true : tradeData.targetVerified);
      
      if (bothVerified) {
        updateData.currentState = this.TRADE_STATES.VERIFICATION_COMPLETE;
        updateData.bothVerifiedAt = serverTimestamp();
        updateData.stateHistory = [
          ...tradeData.stateHistory,
          {
            state: this.TRADE_STATES.VERIFICATION_COMPLETE,
            timestamp: serverTimestamp(),
            triggeredBy: userId
          }
        ];
      }
      
      await updateDoc(tradeRef, updateData);
      
      return {
        verified: true,
        bothVerified,
        nextStep: bothVerified ? 'Trade completed! Items are now exchanged.' : 'Waiting for other party to verify.'
      };
      
    } catch (error) {
      console.error('❌ Error verifying exchange code:', error);
      throw error;
    }
  }

  // Complete trade
  static async completeTrade(tradeId, userId) {
    try {
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Verify both parties have verified
      if (!tradeData.proposerVerified || !tradeData.targetVerified) {
        throw new Error('Both parties must verify before completing trade');
      }
      
      // Update trade to completed
      await updateDoc(tradeRef, {
        currentState: this.TRADE_STATES.COMPLETED,
        completedAt: serverTimestamp(),
        completedBy: userId,
        isActive: false,
        isLocked: false,
        updatedAt: serverTimestamp(),
        stateHistory: [
          ...tradeData.stateHistory,
          {
            state: this.TRADE_STATES.COMPLETED,
            timestamp: serverTimestamp(),
            triggeredBy: userId
          }
        ]
      });
      
      // Unlock items
      await ItemLockingService.unlockItem(tradeData.proposerItemId, 'trade_completed');
      await ItemLockingService.unlockItem(tradeData.targetItemId, 'trade_completed');
      
      // Remove trade restrictions to allow new trades between these users
      await this.removeTradeRestrictions(tradeData.proposerUserId, tradeData.targetUserId);
      
      // Update user trade history
      await this.updateUserTradeHistory(tradeData.proposerUserId, tradeData.targetUserId, tradeId, 'completed');
      
      // Send completion notifications
      await NotificationService.notifyTradeCompleted(tradeData.proposerUserId, tradeData.targetUserId, tradeId);
      
      console.log('✅ Trade completed successfully:', tradeId);
      return { success: true, tradeId };
      
    } catch (error) {
      console.error('❌ Error completing trade:', error);
      throw error;
    }
  }

  // Remove trade restrictions
  static async removeTradeRestrictions(user1Id, user2Id) {
    try {
      const restrictionId = `${user1Id}_${user2Id}`;
      const reverseRestrictionId = `${user2Id}_${user1Id}`;
      
      // Update restrictions to allow trading again
      const updateData = {
        canTradeAgain: true,
        restrictionRemovedAt: serverTimestamp(),
        reason: 'trade_completed'
      };
      
      await updateDoc(doc(db, 'tradeRestrictions', restrictionId), updateData);
      await updateDoc(doc(db, 'tradeRestrictions', reverseRestrictionId), updateData);
      
    } catch (error) {
      console.error('❌ Error removing trade restrictions:', error);
    }
  }

  // Update user trade history
  static async updateUserTradeHistory(user1Id, user2Id, tradeId, status) {
    try {
      const historyData = {
        tradeId,
        partnerId: user2Id,
        status,
        completedAt: serverTimestamp()
      };
      
      // Add to both users' history
      await addDoc(collection(db, 'users', user1Id, 'tradeHistory'), historyData);
      await addDoc(collection(db, 'users', user2Id, 'tradeHistory'), { ...historyData, partnerId: user1Id });
      
    } catch (error) {
      console.error('❌ Error updating trade history:', error);
    }
  }

  // Check if users can trade with each other
  static async canUsersTradeWithEachOther(user1Id, user2Id) {
    try {
      const restrictionId = `${user1Id}_${user2Id}`;
      const restrictionDoc = await getDoc(doc(db, 'tradeRestrictions', restrictionId));
      
      if (!restrictionDoc.exists()) {
        return { canTrade: true, reason: 'no_restrictions' };
      }
      
      const restrictionData = restrictionDoc.data();
      
      if (!restrictionData.canTradeAgain) {
        return { 
          canTrade: false, 
          reason: 'active_trade_exists',
          activeTradeId: restrictionData.activeTradeId
        };
      }
      
      return { canTrade: true, reason: 'previous_trade_completed' };
      
    } catch (error) {
      console.error('❌ Error checking trade restrictions:', error);
      return { canTrade: true, reason: 'error_checking_restrictions' };
    }
  }

  // Apply penalty for failed trade
  static async applyTradePenalty(userId, tradeId, reason) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const currentStrikes = userData.tradeStrikes || 0;
      const newStrikes = currentStrikes + 1;
      
      const penaltyData = {
        tradeStrikes: newStrikes,
        lastStrikeAt: serverTimestamp(),
        lastStrikeReason: reason,
        lastStrikeTradeId: tradeId
      };
      
      // Apply trading ban if max strikes reached
      if (newStrikes >= this.SOP_RULES.MAX_STRIKES) {
        const banUntil = new Date(Date.now() + (this.SOP_RULES.PENALTY_DAYS * 24 * 60 * 60 * 1000));
        penaltyData.tradingBannedUntil = banUntil;
        penaltyData.isTradingBanned = true;
      }
      
      await updateDoc(userRef, penaltyData);
      
      // Log penalty
      await addDoc(collection(db, 'tradePenalties'), {
        userId,
        tradeId,
        reason,
        strikesApplied: 1,
        totalStrikes: newStrikes,
        appliedAt: serverTimestamp()
      });
      
      console.log(`⚠️ Penalty applied to user ${userId}: ${newStrikes} strikes`);
      return { strikes: newStrikes, banned: newStrikes >= this.SOP_RULES.MAX_STRIKES };
      
    } catch (error) {
      console.error('❌ Error applying trade penalty:', error);
      throw error;
    }
  }

  // Get trade SOP rules for display
  static getSOPRules() {
    return {
      lockDuration: `${this.SOP_RULES.LOCK_DURATION_HOURS} hours`,
      exchangeWindow: `${this.SOP_RULES.EXCHANGE_WINDOW_HOURS} hours`,
      maxStrikes: this.SOP_RULES.MAX_STRIKES,
      penaltyDays: this.SOP_RULES.PENALTY_DAYS,
      rules: [
        `Items are locked for ${this.SOP_RULES.LOCK_DURATION_HOURS} hours maximum`,
        `You have ${this.SOP_RULES.EXCHANGE_WINDOW_HOURS} hours from locking to complete the exchange`,
        `Failing to complete a trade results in a strike on your profile`,
        `${this.SOP_RULES.MAX_STRIKES} strikes result in a ${this.SOP_RULES.PENALTY_DAYS}-day trading ban`,
        'Both parties must verify the exchange with their unique codes',
        'You cannot start new trades with the same user while a trade is active'
      ]
    };
  }

  // Get time remaining for trade
  static getTimeRemaining(deadline) {
    const now = new Date();
    const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { expired: true, display: 'EXPIRED' };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      expired: false,
      hours,
      minutes,
      display: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
  }
}
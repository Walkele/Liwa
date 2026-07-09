import { ItemLockingService } from './ItemLockingService';
import { AntiFraudService } from './AntiFraudService';
import { doc, updateDoc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class TradeSecurityService {
  
  // Item locking stages - when items get locked from other users
  static LOCKING_STAGES = {
    OFFER_ACCEPTED: {
      stage: 'offer_accepted',
      description: 'Item locked when offer is accepted',
      lockDuration: '24 hours or until trade completion',
      reason: 'Prevents other users from making offers on accepted items'
    },
    BOTH_COMMITTED: {
      stage: 'both_committed', 
      description: 'Items locked when both parties commit to trade',
      lockDuration: 'Until trade completion or abandonment',
      reason: 'Ensures items remain available for the committed trade'
    },
    CONTACT_SHARED: {
      stage: 'contact_shared',
      description: 'Items remain locked during contact exchange',
      lockDuration: 'Until meeting arranged or trade cancelled',
      reason: 'Maintains trade exclusivity during coordination'
    },
    MEETING_ARRANGED: {
      stage: 'meeting_arranged',
      description: 'Items locked until physical exchange',
      lockDuration: 'Until trade completed or meeting timeout',
      reason: 'Prevents interference during final trade stages'
    }
  };

  // Comprehensive trade security flow
  static async secureTradeAcceptance(offerData, acceptingUserId) {
    try {
      console.log('🔐 Initiating secure trade acceptance with full security checks');

      // 1. Check if user can make offers (penalty system)
      let canTrade;
      try {
        canTrade = await AntiFraudService.canUserMakeOffer(acceptingUserId);
      } catch (error) {
        console.warn('⚠️ Could not check user trade restrictions, proceeding with caution:', error.message);
        canTrade = { canMakeOffer: true, message: 'Trade restrictions check failed' };
      }
      
      if (!canTrade.canMakeOffer) {
        throw new Error(`Trade blocked: ${canTrade.message}`);
      }

      // 2. Validate offer data for injection attacks
      const validation = this.validateOfferData(offerData);
      if (!validation.isValid) {
        throw new Error(`Invalid trade data: ${validation.errors.map(e => e.reason || e.field).join(', ')}`);
      }

      // 3. Normalize offer data for different offer types (regular offers vs counter-offers)
      const normalizedOffer = {
        ...offerData,
        proposerUserId: offerData.proposerUserId || offerData.senderId,
        targetUserId: offerData.targetUserId || offerData.recipientId
      };

      // 4. Check for lowball detection (optional, don't fail if it errors)
      let lowballCheck = { isLowball: false };
      try {
        if (normalizedOffer.cashAmount && normalizedOffer.itemValue) {
          lowballCheck = await AntiFraudService.detectLowballOffer(
            normalizedOffer.itemId, 
            normalizedOffer.cashAmount, 
            normalizedOffer.itemValue
          );
          
          if (lowballCheck.isLowball && lowballCheck.severity === 'SEVERE') {
            // Record violation but allow trade (with warning)
            await AntiFraudService.recordViolation(
              normalizedOffer.proposerUserId, 
              'LOWBALL_OFFER', 
              { 
                itemId: normalizedOffer.itemId,
                offerAmount: normalizedOffer.cashAmount,
                itemValue: normalizedOffer.itemValue,
                severity: lowballCheck.severity
              }
            );
          }
        }
      } catch (error) {
        console.warn('⚠️ Lowball detection failed, proceeding:', error.message);
      }

      // 5. Atomic trade acceptance with race condition protection (optional)
      try {
        await AntiFraudService.atomicTradeAcceptance(normalizedOffer.itemId, acceptingUserId, normalizedOffer);
      } catch (error) {
        console.warn('⚠️ Atomic trade acceptance failed, proceeding:', error.message);
      }

      // 6. Lock items for trade (STAGE 1: OFFER_ACCEPTED) (optional)
      try {
        await this.lockItemsForAcceptedTrade(normalizedOffer, acceptingUserId);
      } catch (error) {
        console.warn('⚠️ Item locking failed, proceeding:', error.message);
      }

      // 7. Create immutable snapshots to prevent bait-and-switch (optional)
      let snapshotId = null;
      try {
        snapshotId = await AntiFraudService.createItemSnapshot(
          normalizedOffer.itemId, 
          'trade_accepted'
        );
      } catch (error) {
        console.warn('⚠️ Item snapshot creation failed, proceeding:', error.message);
      }

      console.log('✅ Secure trade acceptance completed');
      return {
        success: true,
        snapshotId,
        lockingStage: this.LOCKING_STAGES.OFFER_ACCEPTED,
        securityChecks: {
          penaltyCheck: canTrade,
          dataValidation: validation,
          lowballDetection: lowballCheck
        }
      };

    } catch (error) {
      console.error('❌ Secure trade acceptance failed:', error);
      throw error;
    }
  }

  // Lock items when offer is accepted (STAGE 1)
  static async lockItemsForAcceptedTrade(offerData, acceptingUserId) {
    try {
      console.log('🔒 STAGE 1: Locking items for accepted trade');

      // Lock the main item being offered
      await ItemLockingService.lockItemForTrade(
        offerData.itemId,
        offerData.proposerUserId,
        offerData.id,
        'offer_accepted'
      );

      // If there are additional items in the trade, lock them too
      if (offerData.tradeItems && offerData.tradeItems.length > 0) {
        for (const tradeItem of offerData.tradeItems) {
          await ItemLockingService.lockItemForTrade(
            tradeItem.id,
            acceptingUserId,
            offerData.id,
            'offer_accepted_additional'
          );
        }
      }

      // Record locking activity
      await this.recordLockingActivity(offerData.id, 'OFFER_ACCEPTED', {
        mainItemId: offerData.itemId,
        additionalItems: offerData.tradeItems?.map(item => item.id) || [],
        lockedBy: [offerData.proposerUserId, acceptingUserId]
      });

      console.log('✅ Items locked for accepted trade');
      return true;

    } catch (error) {
      console.error('❌ Error locking items for accepted trade:', error);
      throw error;
    }
  }

  // Enhanced locking when both parties commit (STAGE 2)
  static async lockItemsForCommittedTrade(tradeId, userId1, userId2, itemIds) {
    try {
      console.log('🔒 STAGE 2: Enhanced locking for committed trade');

      // Upgrade lock status for all items
      for (const itemId of itemIds) {
        const itemRef = doc(db, 'items', itemId);
        await updateDoc(itemRef, {
          lockLevel: 'COMMITTED',
          lockUpgradedAt: serverTimestamp(),
          commitmentStage: true,
          lastUpdatedAt: serverTimestamp()
        });
      }

      // Record commitment locking
      await this.recordLockingActivity(tradeId, 'BOTH_COMMITTED', {
        itemIds,
        committedBy: [userId1, userId2],
        lockLevel: 'COMMITTED'
      });

      console.log('✅ Items locked for committed trade');
      return true;

    } catch (error) {
      console.error('❌ Error locking items for committed trade:', error);
      throw error;
    }
  }

  // Handle trade abandonment with penalties
  static async handleTradeAbandonment(tradeId, abandoningUserId, stage, reason = 'unknown') {
    try {
      console.log(`⚠️ Handling trade abandonment: ${stage} by user ${abandoningUserId}`);

      // 1. Record the abandonment violation
      await AntiFraudService.recordTradeAbandonment(abandoningUserId, tradeId, stage, reason);

      // 2. Get trade details to unlock items
      const tradeDetails = await this.getTradeDetails(tradeId);
      
      // 3. Unlock all items involved in the trade
      if (tradeDetails && tradeDetails.itemIds) {
        for (const itemId of tradeDetails.itemIds) {
          try {
            await ItemLockingService.unlockItem(itemId, abandoningUserId, 'trade_abandoned');
          } catch (unlockError) {
            console.error(`Failed to unlock item ${itemId}:`, unlockError);
          }
        }
      }

      // 4. Record abandonment activity
      await this.recordLockingActivity(tradeId, 'TRADE_ABANDONED', {
        abandonedBy: abandoningUserId,
        stage,
        reason,
        itemsUnlocked: tradeDetails?.itemIds || []
      });

      // 5. Notify other party
      if (tradeDetails && tradeDetails.participants) {
        const otherUserId = tradeDetails.participants.find(id => id !== abandoningUserId);
        if (otherUserId) {
          await this.notifyTradeAbandonment(otherUserId, tradeId, stage);
        }
      }

      console.log('✅ Trade abandonment handled');
      return true;

    } catch (error) {
      console.error('❌ Error handling trade abandonment:', error);
      throw error;
    }
  }

  // Check user's current restrictions before allowing trade actions
  static async checkTradeRestrictions(userId, action = 'make_offer') {
    try {
      const restrictions = await AntiFraudService.canUserMakeOffer(userId);
      
      if (!restrictions.canMakeOffer) {
        return {
          allowed: false,
          reason: restrictions.reason,
          message: restrictions.message,
          penaltyLevel: restrictions.penaltyLevel,
          restrictions: restrictions.restrictions
        };
      }

      return {
        allowed: true,
        restrictions: restrictions.restrictions,
        penaltyLevel: restrictions.penaltyLevel
      };

    } catch (error) {
      console.error('❌ Error checking trade restrictions:', error);
      return {
        allowed: false,
        reason: 'ERROR',
        message: 'Unable to verify trade permissions'
      };
    }
  }

  // Get comprehensive user penalty status
  static async getUserPenaltyStatus(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { hasPenalty: false, violationScore: 0 };
      }

      const userData = userDoc.data();
      const currentPenalty = userData.currentPenalty;
      const violationScore = userData.violationScore || 0;

      // Check if penalty has expired
      if (currentPenalty && currentPenalty.expiresAt && new Date() > currentPenalty.expiresAt.toDate()) {
        await AntiFraudService.clearExpiredPenalty(userId);
        return { hasPenalty: false, violationScore };
      }

      return {
        hasPenalty: !!currentPenalty,
        penalty: currentPenalty,
        violationScore,
        restrictions: currentPenalty?.restrictions,
        penaltyLevel: currentPenalty?.name,
        expiresAt: currentPenalty?.expiresAt?.toDate()
      };

    } catch (error) {
      console.error('❌ Error getting user penalty status:', error);
      return { hasPenalty: false, violationScore: 0, error: error.message };
    }
  }

  // HELPER METHODS

  // Simplified offer data validation
  static validateOfferData(offerData) {
    try {
      console.log('🔍 Validating trade data for API injection:', offerData);
      
      if (!offerData || typeof offerData !== 'object') {
        return { isValid: false, errors: [{ field: 'offerData', reason: 'Invalid or missing offer data' }] };
      }
      
      const validationErrors = [];
      
      // Check required fields
      if (!offerData.id) {
        validationErrors.push({ field: 'id', reason: 'Missing offer ID' });
      }
      
      if (!offerData.itemId) {
        validationErrors.push({ field: 'itemId', reason: 'Missing item ID' });
      }
      
      // Check for user IDs (different field names for different offer types)
      const hasProposerUserId = offerData.proposerUserId || offerData.senderId;
      const hasTargetUserId = offerData.targetUserId || offerData.recipientId;
      
      if (!hasProposerUserId) {
        validationErrors.push({ field: 'proposerUserId', reason: 'Missing proposer/sender user ID' });
      }
      
      if (!hasTargetUserId) {
        validationErrors.push({ field: 'targetUserId', reason: 'Missing target/recipient user ID' });
      }
      
      // Validate numeric fields
      if (offerData.cashAmount !== undefined) {
        if (typeof offerData.cashAmount !== 'number' || offerData.cashAmount < 0) {
          validationErrors.push({ field: 'cashAmount', reason: 'Invalid cash amount' });
        }
      }
      
      // Check for basic injection patterns in text fields
      const textFields = ['itemTitle', 'text'];
      textFields.forEach(field => {
        if (offerData[field] && typeof offerData[field] === 'string') {
          // Basic check for script injection
          if (offerData[field].includes('<script') || offerData[field].includes('javascript:')) {
            validationErrors.push({ field, reason: 'Potential script injection' });
          }
        }
      });
      
      console.log('🔍 Validation result:', { isValid: validationErrors.length === 0, errors: validationErrors });
      
      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors
      };
      
    } catch (error) {
      console.error('❌ Offer data validation error:', error);
      return { isValid: false, errors: [{ field: 'validation', reason: error.message }] };
    }
  }

  static async recordLockingActivity(tradeId, stage, metadata) {
    try {
      await addDoc(collection(db, 'tradeLockingActivity'), {
        tradeId,
        stage,
        metadata,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error recording locking activity:', error);
    }
  }

  static async getTradeDetails(tradeId) {
    try {
      // This would get trade details from your trade collection
      // Implementation depends on your trade data structure
      const tradeRef = doc(db, 'trades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (tradeDoc.exists()) {
        return tradeDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting trade details:', error);
      return null;
    }
  }

  static async notifyTradeAbandonment(userId, tradeId, stage) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'trade_abandoned',
        title: 'Trade Abandoned',
        message: `The other party has abandoned the trade at ${stage} stage. Items have been unlocked.`,
        tradeId,
        stage,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('❌ Error sending abandonment notification:', error);
    }
  }

  // Get user's trade security summary
  static async getUserSecuritySummary(userId) {
    try {
      const penaltyStatus = await this.getUserPenaltyStatus(userId);
      const lockedItems = await ItemLockingService.getUserLockedItems(userId);
      const violationHistory = await AntiFraudService.getUserViolationHistory(userId, 30);

      return {
        penaltyStatus,
        lockedItemsCount: lockedItems.length,
        lockedItems: lockedItems.map(item => ({
          id: item.id,
          title: item.title,
          lockedAt: item.lockedAt,
          lockReason: item.lockReason
        })),
        recentViolations: violationHistory.length,
        violationHistory: violationHistory.slice(0, 5), // Last 5 violations
        securityScore: Math.max(0, 100 - (penaltyStatus.violationScore || 0)),
        canTrade: !penaltyStatus.hasPenalty || !penaltyStatus.restrictions?.cannotTrade
      };

    } catch (error) {
      console.error('❌ Error getting user security summary:', error);
      return {
        penaltyStatus: { hasPenalty: false },
        lockedItemsCount: 0,
        recentViolations: 0,
        securityScore: 100,
        canTrade: true,
        error: error.message
      };
    }
  }
}

export default TradeSecurityService;
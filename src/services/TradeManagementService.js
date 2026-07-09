import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemLockingService } from './ItemLockingService';

export class TradeManagementService {
  
  // Create comprehensive trade record when proposal is accepted
  static async createTradeRecord(tradeProposal) {
    try {
      console.log('📝 Creating comprehensive trade record...');
      
      const tradeData = {
        // Basic trade info
        id: tradeProposal.id,
        proposerUserId: tradeProposal.proposerUserId,
        proposerUserName: tradeProposal.proposerUserName,
        targetUserId: tradeProposal.targetUserId,
        
        // Items being traded
        proposerItemId: tradeProposal.proposerItemId,
        proposerItemTitle: tradeProposal.proposerItemTitle,
        proposerItemPrice: tradeProposal.proposerItemPrice,
        targetItemId: tradeProposal.targetItemId,
        targetItemTitle: tradeProposal.targetItemTitle,
        targetItemPrice: tradeProposal.targetItemPrice,
        
        // Trade status and progress
        status: 'active',
        currentStep: 2, // Start at step 2 (contact exchange)
        
        // Timestamps
        createdAt: serverTimestamp(),
        acceptedAt: serverTimestamp(),
        
        // Step completion tracking
        step1CompletedAt: serverTimestamp(), // Proposal accepted
        step1CompletedBy: tradeProposal.targetUserId,
        
        // Trade value calculation
        tradeValue: Math.abs(tradeProposal.proposerItemPrice - tradeProposal.targetItemPrice),
        isEvenTrade: tradeProposal.proposerItemPrice === tradeProposal.targetItemPrice,
        
        // Safety and verification
        verificationRequired: tradeProposal.proposerItemPrice > 500 || tradeProposal.targetItemPrice > 500,
        meetingRequired: true,
        
        // Communication
        conversationId: this.generateConversationId(tradeProposal.proposerUserId, tradeProposal.targetUserId, tradeProposal.targetItemId),
        
        // Participants
        participants: [tradeProposal.proposerUserId, tradeProposal.targetUserId],
        participantNames: {
          [tradeProposal.proposerUserId]: tradeProposal.proposerUserName,
          [tradeProposal.targetUserId]: 'Target User' // Will be updated
        }
      };
      
      // Create the trade record
      const tradeRef = doc(db, 'activeTrades', tradeProposal.id);
      await setDoc(tradeRef, tradeData);
      
      // Lock both items
      await ItemLockingService.lockBothItemsForTrade(
        tradeProposal.proposerItemId,
        tradeProposal.targetItemId,
        tradeProposal.proposerUserId,
        tradeProposal.targetUserId,
        tradeProposal.id
      );
      
      // Create activity log
      await this.logTradeActivity(tradeProposal.id, tradeProposal.targetUserId, 'trade_accepted', {
        proposerItem: tradeProposal.proposerItemTitle,
        targetItem: tradeProposal.targetItemTitle
      });
      
      console.log('✅ Trade record created successfully');
      return tradeData;
      
    } catch (error) {
      console.error('❌ Error creating trade record:', error);
      throw error;
    }
  }
  
  // Update trade step progress
  static async updateTradeStep(tradeId, stepNumber, userId, stepData = {}) {
    try {
      console.log(`📈 Updating trade ${tradeId} to step ${stepNumber}`);
      
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Verify user is participant
      if (!tradeData.participants.includes(userId)) {
        throw new Error('User is not a participant in this trade');
      }
      
      // Update trade progress
      const updateData = {
        currentStep: stepNumber,
        [`step${stepNumber}CompletedAt`]: serverTimestamp(),
        [`step${stepNumber}CompletedBy`]: userId,
        lastUpdatedAt: serverTimestamp(),
        ...stepData
      };
      
      await updateDoc(tradeRef, updateData);
      
      // Log the step completion
      await this.logTradeActivity(tradeId, userId, `step_${stepNumber}_completed`, {
        stepNumber,
        ...stepData
      });
      
      // Check if trade is complete (step 6)
      if (stepNumber === 6) {
        await this.completeTradeProcess(tradeId, userId);
      }
      
      console.log(`✅ Trade step ${stepNumber} completed`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error updating trade step:`, error);
      throw error;
    }
  }
  
  // Complete the entire trade process
  static async completeTradeProcess(tradeId, completingUserId) {
    try {
      console.log(`🎉 Completing trade process: ${tradeId}`);
      
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Mark trade as completed
      await updateDoc(tradeRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        completedBy: completingUserId
      });
      
      // Unlock items and mark as sold/traded
      await ItemLockingService.unlockItem(tradeData.proposerItemId, tradeData.proposerUserId, 'trade_completed');
      await ItemLockingService.unlockItem(tradeData.targetItemId, tradeData.targetUserId, 'trade_completed');
      
      // Create completed trade record for history
      await this.createCompletedTradeRecord(tradeData);
      
      // Update user trade statistics
      await this.updateUserTradeStats(tradeData.proposerUserId);
      await this.updateUserTradeStats(tradeData.targetUserId);
      
      // Log completion
      await this.logTradeActivity(tradeId, completingUserId, 'trade_completed', {
        proposerItem: tradeData.proposerItemTitle,
        targetItem: tradeData.targetItemTitle,
        tradeValue: tradeData.tradeValue
      });
      
      console.log(`✅ Trade ${tradeId} completed successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error completing trade:`, error);
      throw error;
    }
  }
  
  // Cancel trade and unlock items
  static async cancelTrade(tradeId, cancellingUserId, reason = 'user_cancelled') {
    try {
      console.log(`❌ Cancelling trade: ${tradeId}`);
      
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Verify user can cancel
      if (!tradeData.participants.includes(cancellingUserId)) {
        throw new Error('User cannot cancel this trade');
      }
      
      // Mark trade as cancelled
      await updateDoc(tradeRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: cancellingUserId,
        cancellationReason: reason
      });
      
      // Unlock both items
      await ItemLockingService.unlockItem(tradeData.proposerItemId, tradeData.proposerUserId, 'trade_cancelled');
      await ItemLockingService.unlockItem(tradeData.targetItemId, tradeData.targetUserId, 'trade_cancelled');
      
      // Log cancellation
      await this.logTradeActivity(tradeId, cancellingUserId, 'trade_cancelled', {
        reason,
        proposerItem: tradeData.proposerItemTitle,
        targetItem: tradeData.targetItemTitle
      });
      
      console.log(`✅ Trade ${tradeId} cancelled successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error cancelling trade:`, error);
      throw error;
    }
  }
  
  // Get user's active trades
  static async getUserActiveTrades(userId) {
    try {
      const tradesQuery = query(
        collection(db, 'activeTrades'),
        where('participants', 'array-contains', userId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(tradesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting user active trades:', error);
      return [];
    }
  }
  
  // Create completed trade record for history
  static async createCompletedTradeRecord(tradeData) {
    try {
      const completedTradeData = {
        ...tradeData,
        archivedAt: serverTimestamp(),
        originalTradeId: tradeData.id
      };
      
      await addDoc(collection(db, 'completedTrades'), completedTradeData);
      
    } catch (error) {
      console.error('Error creating completed trade record:', error);
    }
  }
  
  // Update user trade statistics
  static async updateUserTradeStats(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentTrades = userData.completedTrades || 0;
        
        await updateDoc(userRef, {
          completedTrades: currentTrades + 1,
          lastTradeAt: serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error('Error updating user trade stats:', error);
    }
  }
  
  // Log trade activity for audit trail
  static async logTradeActivity(tradeId, userId, action, metadata = {}) {
    try {
      await addDoc(collection(db, 'tradeActivities'), {
        tradeId,
        userId,
        action,
        metadata,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging trade activity:', error);
    }
  }
  
  // Generate consistent conversation ID
  static generateConversationId(userId1, userId2, itemId) {
    const sortedUsers = [userId1, userId2].sort();
    return `${sortedUsers[0]}_${sortedUsers[1]}_${itemId}`;
  }
  
  // Get trade progress details
  static async getTradeProgress(tradeId) {
    try {
      const tradeRef = doc(db, 'activeTrades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        return null;
      }
      
      const tradeData = tradeDoc.data();
      
      // Calculate progress percentage
      const completedSteps = Array.from({length: 6}, (_, i) => i + 1)
        .filter(step => tradeData[`step${step}CompletedAt`]).length;
      
      const progressPercentage = (completedSteps / 6) * 100;
      
      return {
        ...tradeData,
        completedSteps,
        progressPercentage,
        isComplete: tradeData.status === 'completed',
        isCancelled: tradeData.status === 'cancelled'
      };
      
    } catch (error) {
      console.error('Error getting trade progress:', error);
      return null;
    }
  }
  
  // Auto-cleanup stale trades (inactive for more than 7 days)
  static async cleanupStaleTrades() {
    try {
      console.log('🧹 Cleaning up stale trades...');
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const staleTradesQuery = query(
        collection(db, 'activeTrades'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(staleTradesQuery);
      let cleanedCount = 0;
      
      for (const doc of snapshot.docs) {
        const tradeData = doc.data();
        const lastUpdated = tradeData.lastUpdatedAt?.toDate() || tradeData.createdAt?.toDate();
        
        if (lastUpdated && lastUpdated < sevenDaysAgo) {
          await this.cancelTrade(doc.id, 'system', 'stale_trade_cleanup');
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} stale trades`);
      return cleanedCount;
      
    } catch (error) {
      console.error('Error cleaning up stale trades:', error);
      return 0;
    }
  }
}
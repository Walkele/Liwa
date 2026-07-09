import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ItemLockingService {
  
  // Lock item when users match (soft lock for negotiation)
  static async lockItemForMatch(itemId, lockingUserId, matchId, reason = 'match_created') {
    try {
      console.log(`🔒 Soft-locking item ${itemId} for match ${matchId}`);
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      // Check if item is already hard-locked
      if (itemData.status === 'locked' && itemData.lockType === 'hard') {
        throw new Error('Item is already locked for another trade');
      }
      
      // Apply soft lock (allows viewing but prevents new matches)
      await updateDoc(itemRef, {
        status: 'pending', // Soft lock status
        lockType: 'soft',
        lockedBy: lockingUserId,
        lockedAt: serverTimestamp(),
        lockReason: reason,
        matchId: matchId,
        previousStatus: itemData.status || 'available',
        // Soft lock allows continued negotiation
        allowOffers: true,
        allowViewing: true
      });
      
      // Log the locking activity
      await this.logItemActivity(itemId, lockingUserId, 'item_soft_locked', {
        reason,
        matchId,
        previousStatus: itemData.status
      });
      
      console.log(`✅ Item ${itemId} soft-locked for match`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error soft-locking item ${itemId}:`, error);
      throw error;
    }
  }

  // Upgrade to hard lock when offer is accepted
  static async upgradeToHardLock(itemId, lockingUserId, tradeId, reason = 'offer_accepted') {
    try {
      console.log(`🔒🔒 Upgrading to hard lock for item ${itemId}`);
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      // Verify user has permission to upgrade lock
      if (itemData.lockedBy !== lockingUserId && itemData.userId !== lockingUserId) {
        throw new Error('You do not have permission to upgrade this lock');
      }
      
      // Upgrade to hard lock
      await updateDoc(itemRef, {
        status: 'locked',
        lockType: 'hard',
        lockReason: reason,
        tradeId: tradeId,
        allowOffers: false,
        allowViewing: true, // Still allow viewing for trade completion
        hardLockedAt: serverTimestamp()
      });
      
      // Log the upgrade
      await this.logItemActivity(itemId, lockingUserId, 'lock_upgraded_to_hard', {
        reason,
        tradeId,
        previousLockType: itemData.lockType
      });
      
      console.log(`✅ Item ${itemId} upgraded to hard lock`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error upgrading lock for item ${itemId}:`, error);
      throw error;
    }
  }
  
  // Unlock item when trade is completed or cancelled
  static async unlockItem(itemId, unlockingUserId, reason = 'trade_completed') {
    try {
      console.log(`🔓 Unlocking item ${itemId} by user ${unlockingUserId}`);
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      // Check if user has permission to unlock
      if (itemData.lockedBy !== unlockingUserId && itemData.userId !== unlockingUserId) {
        throw new Error('You do not have permission to unlock this item');
      }
      
      const newStatus = reason === 'trade_completed' ? 'sold' : (itemData.previousStatus || 'available');
      
      // Unlock the item
      await updateDoc(itemRef, {
        status: newStatus,
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
        tradeProposalId: null,
        unlockedAt: serverTimestamp(),
        unlockedBy: unlockingUserId,
        unlockReason: reason
      });
      
      // Log the unlocking activity
      await this.logItemActivity(itemId, unlockingUserId, 'item_unlocked', {
        reason,
        newStatus,
        previouslyLockedBy: itemData.lockedBy
      });
      
      console.log(`✅ Item ${itemId} unlocked successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error unlocking item ${itemId}:`, error);
      throw error;
    }
  }
  
  // Lock both items when trade proposal is accepted
  static async lockBothItemsForTrade(proposerItemId, targetItemId, proposerUserId, targetUserId, tradeProposalId) {
    try {
      console.log(`🔒🔒 Locking both items for trade: ${proposerItemId} & ${targetItemId}`);
      
      // Lock proposer's item
      await this.lockItemForTrade(proposerItemId, proposerUserId, tradeProposalId, 'trade_accepted_proposer');
      
      // Lock target item
      await this.lockItemForTrade(targetItemId, targetUserId, tradeProposalId, 'trade_accepted_target');
      
      console.log(`✅ Both items locked for trade ${tradeProposalId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error locking both items:`, error);
      // If one fails, try to unlock the other
      try {
        await this.unlockItem(proposerItemId, proposerUserId, 'lock_failed');
      } catch (unlockError) {
        console.error('Failed to unlock proposer item after lock failure:', unlockError);
      }
      throw error;
    }
  }
  
  // Check if item is available for swiping/matching
  static async isItemAvailableForSwipe(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        return { available: false, reason: 'Item not found' };
      }
      
      const itemData = itemDoc.data();
      
      // Hard locked items are not available for swiping
      if (itemData.status === 'locked' && itemData.lockType === 'hard') {
        return { 
          available: false, 
          reason: 'Item is locked in active trade',
          lockType: 'hard',
          lockedBy: itemData.lockedBy,
          lockedAt: itemData.lockedAt
        };
      }
      
      // Soft locked items can still be viewed but with warning
      if (itemData.status === 'pending' && itemData.lockType === 'soft') {
        return { 
          available: true, 
          warning: 'Item has pending offers',
          lockType: 'soft',
          lockedBy: itemData.lockedBy,
          matchId: itemData.matchId
        };
      }
      
      if (itemData.status === 'sold' || itemData.status === 'archived') {
        return { available: false, reason: `Item is ${itemData.status}` };
      }
      
      if (itemData.status !== 'available') {
        return { available: false, reason: `Item status is ${itemData.status}` };
      }
      
      return { available: true };
      
    } catch (error) {
      console.error(`Error checking item swipe availability:`, error);
      return { available: false, reason: 'Error checking availability' };
    }
  }

  // Check if item is available for trading
  static async isItemAvailableForTrade(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        return { available: false, reason: 'Item not found' };
      }
      
      const itemData = itemDoc.data();
      
      if (itemData.status === 'locked') {
        return { 
          available: false, 
          reason: 'Item is currently locked for another trade',
          lockedBy: itemData.lockedBy,
          lockedAt: itemData.lockedAt,
          lockReason: itemData.lockReason
        };
      }
      
      if (itemData.status === 'sold') {
        return { available: false, reason: 'Item has been sold' };
      }
      
      // Pending items can still receive offers (soft lock)
      if (itemData.status === 'pending') {
        return { 
          available: true, 
          warning: 'Item has pending negotiations',
          lockType: 'soft'
        };
      }
      
      if (itemData.status !== 'available') {
        return { available: false, reason: `Item status is ${itemData.status}` };
      }
      
      return { available: true };
      
    } catch (error) {
      console.error(`Error checking item availability:`, error);
      return { available: false, reason: 'Error checking availability' };
    }
  }
  
  // Get all locked items for a user
  static async getUserLockedItems(userId) {
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        where('lockedBy', '==', userId)
      );
      
      const snapshot = await getDocs(itemsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting user locked items:', error);
      return [];
    }
  }
  
  // Auto-unlock expired locks (items locked for more than 24 hours without progress)
  static async cleanupExpiredLocks() {
    try {
      console.log('🧹 Cleaning up expired item locks...');
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const lockedItemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'locked')
      );
      
      const snapshot = await getDocs(lockedItemsQuery);
      let cleanedCount = 0;
      
      for (const doc of snapshot.docs) {
        const itemData = doc.data();
        const lockedAt = itemData.lockedAt?.toDate();
        
        if (lockedAt && lockedAt < twentyFourHoursAgo) {
          await this.unlockItem(doc.id, itemData.lockedBy, 'expired_lock');
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} expired locks`);
      return cleanedCount;
      
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
      return 0;
    }
  }
  
  // Log item activity for audit trail
  static async logItemActivity(itemId, userId, action, metadata = {}) {
    try {
      await addDoc(collection(db, 'itemActivities'), {
        itemId,
        userId,
        action,
        metadata,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging item activity:', error);
    }
  }
  
  // Get item lock status with details
  static async getItemLockStatus(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        return { exists: false };
      }
      
      const itemData = itemDoc.data();
      
      return {
        exists: true,
        status: itemData.status,
        isLocked: itemData.status === 'locked',
        lockedBy: itemData.lockedBy,
        lockedAt: itemData.lockedAt,
        lockReason: itemData.lockReason,
        tradeProposalId: itemData.tradeProposalId
      };
      
    } catch (error) {
      console.error('Error getting item lock status:', error);
      return { exists: false, error: error.message };
    }
  }
}
import { ItemLockingService } from './ItemLockingService';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class LockLifecycleService {
  
  // Upgrade match locks to trade locks when offer is accepted
  static async upgradeMatchToTradeLock(matchId, acceptedOfferId, acceptingUserId) {
    try {
      console.log(`🔒➡️🔒 Upgrading match ${matchId} to trade lock`);
      
      // Get match details
      const matchQuery = query(
        collection(db, 'matches'),
        where('__name__', '==', matchId)
      );
      
      const matchSnapshot = await getDocs(matchQuery);
      if (matchSnapshot.empty) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.docs[0].data();
      const { user1ItemId, user2ItemId, user1Id, user2Id } = matchData;
      
      // Upgrade both items to hard locks
      await Promise.all([
        ItemLockingService.upgradeToHardLock(user1ItemId, user1Id, acceptedOfferId, 'offer_accepted'),
        ItemLockingService.upgradeToHardLock(user2ItemId, user2Id, acceptedOfferId, 'offer_accepted')
      ]);
      
      // Update match status
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'trade_active',
        lockStatus: 'hard_locked',
        tradeStartedAt: serverTimestamp(),
        acceptedOfferId,
        acceptingUserId
      });
      
      console.log('✅ Match upgraded to trade lock successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error upgrading match to trade lock:', error);
      throw error;
    }
  }
  
  // Release locks when trade is completed
  static async completeTrade(matchId, completingUserId, reason = 'trade_completed') {
    try {
      console.log(`🔓 Completing trade for match ${matchId}`);
      
      // Get match details
      const matchQuery = query(
        collection(db, 'matches'),
        where('__name__', '==', matchId)
      );
      
      const matchSnapshot = await getDocs(matchQuery);
      if (matchSnapshot.empty) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.docs[0].data();
      const { user1ItemId, user2ItemId, user1Id, user2Id } = matchData;
      
      // Unlock both items (they will be marked as sold/traded)
      await Promise.all([
        ItemLockingService.unlockItem(user1ItemId, user1Id, reason),
        ItemLockingService.unlockItem(user2ItemId, user2Id, reason)
      ]);
      
      // Update match status
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'completed',
        tradeCompleted: true,
        completedAt: serverTimestamp(),
        completedBy: completingUserId,
        lockStatus: 'unlocked'
      });
      
      console.log('✅ Trade completed and items unlocked');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error completing trade:', error);
      throw error;
    }
  }
  
  // Cancel match and release soft locks
  static async cancelMatch(matchId, cancellingUserId, reason = 'match_cancelled') {
    try {
      console.log(`❌ Cancelling match ${matchId}`);
      
      // Get match details
      const matchQuery = query(
        collection(db, 'matches'),
        where('__name__', '==', matchId)
      );
      
      const matchSnapshot = await getDocs(matchQuery);
      if (matchSnapshot.empty) {
        throw new Error('Match not found');
      }
      
      const matchData = matchSnapshot.docs[0].data();
      const { user1ItemId, user2ItemId, user1Id, user2Id } = matchData;
      
      // Release soft locks (items return to available)
      await Promise.all([
        ItemLockingService.unlockItem(user1ItemId, user1Id, reason),
        ItemLockingService.unlockItem(user2ItemId, user2Id, reason)
      ]);
      
      // Update match status
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: cancellingUserId,
        cancelReason: reason,
        lockStatus: 'unlocked'
      });
      
      console.log('✅ Match cancelled and locks released');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error cancelling match:', error);
      throw error;
    }
  }
  
  // Auto-expire soft locks after 24 hours of inactivity
  static async expireSoftLocks() {
    try {
      console.log('🧹 Checking for expired soft locks...');
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find matches with soft locks older than 24 hours
      const expiredMatchesQuery = query(
        collection(db, 'matches'),
        where('status', '==', 'matched'),
        where('lockStatus', '==', 'soft_locked')
      );
      
      const expiredSnapshot = await getDocs(expiredMatchesQuery);
      let expiredCount = 0;
      
      for (const matchDoc of expiredSnapshot.docs) {
        const matchData = matchDoc.data();
        const createdAt = matchData.createdAt?.toDate();
        
        if (createdAt && createdAt < twentyFourHoursAgo) {
          // Check if there's been recent activity
          const lastActivity = matchData.lastActivity?.toDate() || createdAt;
          
          if (lastActivity < twentyFourHoursAgo) {
            await this.cancelMatch(matchDoc.id, 'system', 'expired_inactivity');
            expiredCount++;
          }
        }
      }
      
      console.log(`✅ Expired ${expiredCount} inactive soft locks`);
      return expiredCount;
      
    } catch (error) {
      console.error('❌ Error expiring soft locks:', error);
      return 0;
    }
  }
  
  // Get lock status summary for user
  static async getUserLockSummary(userId) {
    try {
      // Get user's locked items
      const lockedItems = await ItemLockingService.getUserLockedItems(userId);
      
      // Get user's matches
      const matchesQuery = query(
        collection(db, 'matches'),
        where('participants', 'array-contains', userId)
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const matches = matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const summary = {
        totalLockedItems: lockedItems.length,
        hardLockedItems: lockedItems.filter(item => item.lockType === 'hard').length,
        softLockedItems: lockedItems.filter(item => item.lockType === 'soft').length,
        activeMatches: matches.filter(match => match.status === 'matched').length,
        activeTrades: matches.filter(match => match.status === 'trade_active').length,
        completedTrades: matches.filter(match => match.status === 'completed').length,
        lockedItems,
        matches
      };
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error getting user lock summary:', error);
      return {
        totalLockedItems: 0,
        hardLockedItems: 0,
        softLockedItems: 0,
        activeMatches: 0,
        activeTrades: 0,
        completedTrades: 0,
        lockedItems: [],
        matches: []
      };
    }
  }
  
  // Force unlock item (admin function)
  static async forceUnlock(itemId, adminUserId, reason = 'admin_unlock') {
    try {
      console.log(`🔓 Force unlocking item ${itemId} by admin ${adminUserId}`);
      
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: 'available',
        lockType: null,
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
        matchId: null,
        tradeId: null,
        forceUnlockedAt: serverTimestamp(),
        forceUnlockedBy: adminUserId,
        forceUnlockReason: reason
      });
      
      // Log the force unlock
      await ItemLockingService.logItemActivity(itemId, adminUserId, 'force_unlocked', {
        reason,
        timestamp: new Date()
      });
      
      console.log('✅ Item force unlocked successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error force unlocking item:', error);
      throw error;
    }
  }
}

export default LockLifecycleService;
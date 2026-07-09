import { doc, updateDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ConversationLifecycleService } from './ConversationLifecycleService';

export class ItemArchiveService {
  
  // Archive an item after successful trade
  static async archiveItem(itemId, reason = 'traded', tradeDetails = {}) {
    try {
      console.log(`🗄️ Archiving item ${itemId} - Reason: ${reason}`);
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      // Update item to archived status
      await updateDoc(itemRef, {
        status: 'archived',
        isActive: false,
        isAvailable: false,
        isVisible: false, // Hide from all listings
        archivedAt: serverTimestamp(),
        archiveReason: reason,
        tradeDetails: tradeDetails,
        originalStatus: itemData.status || 'active',
        lastUpdated: serverTimestamp()
      });
      
      // Archive related conversations
      await this.archiveRelatedConversations(itemId, itemData, reason, tradeDetails);
      
      console.log(`✅ Item ${itemId} archived successfully`);
      
      return {
        success: true,
        itemId,
        reason,
        archivedAt: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Error archiving item ${itemId}:`, error);
      throw error;
    }
  }
  
  // Archive multiple items (for trade completion)
  static async archiveTradeItems(itemIds, tradeDetails = {}) {
    try {
      console.log(`🗄️ Archiving ${itemIds.length} items from completed trade`);
      
      const archivePromises = itemIds.map(itemId => 
        this.archiveItem(itemId, 'traded', tradeDetails)
      );
      
      const results = await Promise.all(archivePromises);
      
      console.log(`✅ Successfully archived ${results.length} items`);
      return results;
      
    } catch (error) {
      console.error('❌ Error archiving trade items:', error);
      throw error;
    }
  }
  
  // Archive conversations related to an item
  static async archiveRelatedConversations(itemId, itemData, reason, tradeDetails) {
    try {
      console.log(`💬 Archiving conversations for item ${itemId}`);
      
      // Find conversations related to this item
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('itemId', '==', itemId)
      );
      
      const conversationsSnapshot = await getDocs(conversationsQuery);
      let archivedCount = 0;
      
      for (const conversationDoc of conversationsSnapshot.docs) {
        try {
          const conversationId = conversationDoc.id;
          const conversationData = conversationDoc.data();
          
          // Skip if already completed
          if (conversationData.status === 'completed') {
            continue;
          }
          
          // Prepare conversation completion details
          const completionDetails = {
            reason: this.mapArchiveReasonToConversationReason(reason),
            tradeId: tradeDetails.tradeId,
            itemIds: [itemId],
            itemTitles: [itemData.title],
            participants: conversationData.participants || [],
            tradeValue: tradeDetails.tradeValue || itemData.price,
            completedAt: new Date(),
            archiveReason: reason,
            originalItemData: {
              title: itemData.title,
              price: itemData.price,
              userId: itemData.userId
            }
          };
          
          await ConversationLifecycleService.markConversationCompleted(
            conversationId, 
            completionDetails
          );
          
          archivedCount++;
          
        } catch (error) {
          console.error(`Failed to archive conversation ${conversationDoc.id}:`, error);
        }
      }
      
      console.log(`✅ Archived ${archivedCount} conversations for item ${itemId}`);
      
    } catch (error) {
      console.error('❌ Error archiving related conversations:', error);
    }
  }
  
  // Map item archive reason to conversation completion reason
  static mapArchiveReasonToConversationReason(archiveReason) {
    switch (archiveReason) {
      case 'traded':
        return 'trade_completed';
      case 'user_deleted':
        return 'items_archived';
      case 'expired':
        return 'items_archived';
      case 'admin_action':
        return 'items_archived';
      case 'test_data_cleanup':
        return 'items_archived';
      default:
        return 'items_archived';
    }
  }
  
  // Get user's archived items
  static async getUserArchivedItems(userId) {
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', userId),
        where('status', '==', 'archived')
      );
      
      const snapshot = await getDocs(itemsQuery);
      const archivedItems = [];
      
      snapshot.forEach(doc => {
        archivedItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by archived date (most recent first)
      archivedItems.sort((a, b) => {
        const aTime = a.archivedAt?.toDate?.() || new Date(0);
        const bTime = b.archivedAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      return archivedItems;
      
    } catch (error) {
      console.error('❌ Error fetching archived items:', error);
      return [];
    }
  }
  
  // Restore an archived item (admin function)
  static async restoreItem(itemId, reason = 'admin_restore') {
    try {
      console.log(`🔄 Restoring item ${itemId}`);
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      if (itemData.status !== 'archived') {
        throw new Error('Item is not archived');
      }
      
      // Restore to original status or default to available
      const restoredStatus = itemData.originalStatus || 'available';
      
      await updateDoc(itemRef, {
        status: restoredStatus,
        isActive: true,
        isAvailable: true,
        isVisible: true,
        restoredAt: serverTimestamp(),
        restoreReason: reason,
        lastUpdated: serverTimestamp(),
        // Remove archive-specific fields
        archivedAt: null,
        archiveReason: null,
        originalStatus: null
      });
      
      console.log(`✅ Item ${itemId} restored successfully`);
      
      return {
        success: true,
        itemId,
        restoredStatus,
        restoredAt: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Error restoring item ${itemId}:`, error);
      throw error;
    }
  }
  
  // Clean up old archived items (run periodically)
  static async cleanupOldArchivedItems(daysOld = 90) {
    try {
      console.log(`🧹 Cleaning up archived items older than ${daysOld} days`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const itemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'archived'),
        where('archivedAt', '<', cutoffDate)
      );
      
      const snapshot = await getDocs(itemsQuery);
      let cleanedCount = 0;
      
      const cleanupPromises = snapshot.docs.map(async (docSnapshot) => {
        const itemRef = doc(db, 'items', docSnapshot.id);
        await updateDoc(itemRef, {
          status: 'deleted',
          deletedAt: serverTimestamp(),
          deleteReason: 'automatic_cleanup',
          cleanupDate: serverTimestamp()
        });
        cleanedCount++;
      });
      
      await Promise.all(cleanupPromises);
      
      console.log(`✅ Cleaned up ${cleanedCount} old archived items`);
      
      return {
        success: true,
        cleanedCount,
        cutoffDate
      };
      
    } catch (error) {
      console.error('❌ Error cleaning up archived items:', error);
      throw error;
    }
  }
  
  // Get archive statistics for user
  static async getArchiveStats(userId) {
    try {
      const archivedItems = await this.getUserArchivedItems(userId);
      
      const stats = {
        totalArchived: archivedItems.length,
        tradedItems: archivedItems.filter(item => item.archiveReason === 'traded').length,
        deletedItems: archivedItems.filter(item => item.archiveReason === 'user_deleted').length,
        otherReasons: archivedItems.filter(item => 
          !['traded', 'user_deleted'].includes(item.archiveReason)
        ).length,
        recentArchives: archivedItems.filter(item => {
          const archivedDate = item.archivedAt?.toDate?.() || new Date(0);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return archivedDate > weekAgo;
        }).length
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting archive stats:', error);
      return {
        totalArchived: 0,
        tradedItems: 0,
        deletedItems: 0,
        otherReasons: 0,
        recentArchives: 0
      };
    }
  }
  
  // Filter out archived items from search results
  static filterActiveItems(items) {
    return items.filter(item => {
      // More comprehensive filtering
      const status = item.status || 'available';
      const isActive = item.isActive !== false;
      const isVisible = item.isVisible !== false;
      const isAvailable = item.isAvailable !== false;
      
      // Item is active if:
      // 1. Status is available, active, or similar active states
      // 2. Not explicitly marked as inactive
      // 3. Not archived or deleted
      const activeStatuses = ['available', 'active', 'listed', 'published'];
      const inactiveStatuses = ['archived', 'deleted', 'removed', 'hidden'];
      
      return (
        activeStatuses.includes(status.toLowerCase()) &&
        !inactiveStatuses.includes(status.toLowerCase()) &&
        isActive &&
        isVisible &&
        isAvailable
      );
    });
  }
  
  // Check if item should be hidden from listings
  static shouldHideFromListings(item) {
    return (
      item.status === 'archived' ||
      item.status === 'deleted' ||
      item.isVisible === false ||
      item.isActive === false ||
      item.isAvailable === false
    );
  }
}

export default ItemArchiveService;
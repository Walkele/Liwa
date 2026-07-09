import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';

export class WaitlistService {
  
  // Waitlist entry statuses
  static WAITLIST_STATUS = {
    ACTIVE: 'active',
    NOTIFIED: 'notified',
    PROMOTED: 'promoted',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  };

  // Waitlist priority levels
  static PRIORITY_LEVELS = {
    HIGH: 'high',      // Premium users or high-value offers
    MEDIUM: 'medium',  // Standard offers
    LOW: 'low'         // Below-market offers
  };

  // Add user to item waitlist
  static async addToWaitlist(itemId, userId, offerDetails) {
    try {
      console.log('📝 Adding user to waitlist for item:', itemId);
      
      // Check if user already on waitlist for this item
      const existingEntry = await this.getUserWaitlistEntry(itemId, userId);
      if (existingEntry) {
        throw new Error('User already on waitlist for this item');
      }
      
      // Get item details for validation
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const item = itemDoc.data();
      
      // Calculate offer priority based on value
      const priority = this.calculateOfferPriority(offerDetails, item);
      
      // Get current queue position
      const queuePosition = await this.getNextQueuePosition(itemId);
      
      // Create waitlist entry
      const waitlistEntry = {
        itemId: itemId,
        userId: userId,
        itemTitle: item.title,
        itemOwnerId: item.userId,
        
        // Offer details
        offerType: offerDetails.offerType || 'cash',
        cashAmount: offerDetails.cashAmount || 0,
        tradeItemIds: offerDetails.tradeItemIds || [],
        totalOfferValue: offerDetails.totalOfferValue || 0,
        
        // Queue management
        queuePosition: queuePosition,
        priority: priority,
        
        // Status and timing
        status: this.WAITLIST_STATUS.ACTIVE,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        
        // Notification preferences
        notifyOnAvailable: offerDetails.notifyOnAvailable !== false,
        maxWaitTime: offerDetails.maxWaitTime || 7, // days
        
        // Metadata
        offerNotes: offerDetails.notes || '',
        isBackupOffer: true
      };
      
      // Add to waitlist collection
      const waitlistRef = await addDoc(collection(db, 'waitlists'), waitlistEntry);
      
      // Update item with waitlist count
      await this.updateItemWaitlistCount(itemId);
      
      // Notify item owner of new waitlist entry
      await NotificationService.sendNotification(
        item.userId,
        'New Backup Offer',
        `Someone added a backup offer for your ${item.title}`,
        {
          type: 'waitlist_added',
          itemId: itemId,
          waitlistId: waitlistRef.id,
          offerValue: offerDetails.totalOfferValue
        }
      );
      
      console.log('✅ User added to waitlist successfully:', waitlistRef.id);
      
      return {
        success: true,
        waitlistId: waitlistRef.id,
        queuePosition: queuePosition,
        priority: priority,
        estimatedWaitTime: await this.estimateWaitTime(itemId, queuePosition)
      };
      
    } catch (error) {
      console.error('❌ Error adding to waitlist:', error);
      throw error;
    }
  }

  // Notify waitlist when item becomes available
  static async notifyWaitlist(itemId, reason = 'item_available') {
    try {
      console.log('📢 Notifying waitlist for item:', itemId, 'Reason:', reason);
      
      // Get active waitlist entries sorted by priority and position
      const q = query(
        collection(db, 'waitlists'),
        where('itemId', '==', itemId),
        where('status', '==', this.WAITLIST_STATUS.ACTIVE),
        orderBy('priority', 'desc'),
        orderBy('queuePosition', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const waitlistEntries = [];
      
      snapshot.forEach(doc => {
        waitlistEntries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      if (waitlistEntries.length === 0) {
        console.log('📭 No active waitlist entries found');
        return { notified: 0 };
      }
      
      // Notify first person in queue (highest priority)
      const firstInLine = waitlistEntries[0];
      
      // Mark as notified
      await updateDoc(doc(db, 'waitlists', firstInLine.id), {
        status: this.WAITLIST_STATUS.NOTIFIED,
        notifiedAt: serverTimestamp(),
        notificationReason: reason
      });
      
      // Send notification
      await NotificationService.sendNotification(
        firstInLine.userId,
        'Item Available!',
        `Great news! ${firstInLine.itemTitle} is now available. Your backup offer is first in line!`,
        {
          type: 'waitlist_promoted',
          itemId: itemId,
          waitlistId: firstInLine.id,
          priority: 'high',
          action: 'view_item'
        }
      );
      
      // Update queue positions for remaining entries
      await this.updateQueuePositions(itemId);
      
      console.log('✅ Waitlist notification sent to user:', firstInLine.userId);
      
      return {
        success: true,
        notified: 1,
        promotedUser: firstInLine.userId,
        remainingInQueue: waitlistEntries.length - 1
      };
      
    } catch (error) {
      console.error('❌ Error notifying waitlist:', error);
      throw error;
    }
  }

  // Promote waitlist offer to active offer
  static async promoteWaitlistOffer(waitlistId, userId) {
    try {
      console.log('⬆️ Promoting waitlist offer:', waitlistId);
      
      const waitlistRef = doc(db, 'waitlists', waitlistId);
      const waitlistDoc = await getDoc(waitlistRef);
      
      if (!waitlistDoc.exists()) {
        throw new Error('Waitlist entry not found');
      }
      
      const waitlistEntry = waitlistDoc.data();
      
      // Verify user authorization
      if (waitlistEntry.userId !== userId) {
        throw new Error('User not authorized for this waitlist entry');
      }
      
      // Create formal offer from waitlist entry
      const { OfferManagementService } = await import('./OfferManagementService');
      
      const offerData = {
        itemId: waitlistEntry.itemId,
        offerType: waitlistEntry.offerType,
        cashAmount: waitlistEntry.cashAmount,
        tradeItemIds: waitlistEntry.tradeItemIds,
        notes: `Promoted from waitlist: ${waitlistEntry.offerNotes}`,
        isPromotedOffer: true,
        originalWaitlistId: waitlistId
      };
      
      const offerResult = await OfferManagementService.createOffer(
        waitlistEntry.itemOwnerId,
        userId,
        offerData
      );
      
      // Mark waitlist entry as promoted
      await updateDoc(waitlistRef, {
        status: this.WAITLIST_STATUS.PROMOTED,
        promotedAt: serverTimestamp(),
        promotedOfferId: offerResult.offerId
      });
      
      // Update item waitlist count
      await this.updateItemWaitlistCount(waitlistEntry.itemId);
      
      console.log('✅ Waitlist offer promoted successfully');
      
      return {
        success: true,
        offerId: offerResult.offerId,
        conversationId: offerResult.conversationId
      };
      
    } catch (error) {
      console.error('❌ Error promoting waitlist offer:', error);
      throw error;
    }
  }

  // Remove user from waitlist
  static async removeFromWaitlist(waitlistId, userId, reason = 'user_cancelled') {
    try {
      console.log('🗑️ Removing from waitlist:', waitlistId);
      
      const waitlistRef = doc(db, 'waitlists', waitlistId);
      const waitlistDoc = await getDoc(waitlistRef);
      
      if (!waitlistDoc.exists()) {
        throw new Error('Waitlist entry not found');
      }
      
      const waitlistEntry = waitlistDoc.data();
      
      // Verify user authorization
      if (waitlistEntry.userId !== userId) {
        throw new Error('User not authorized to remove this entry');
      }
      
      // Mark as cancelled instead of deleting (for analytics)
      await updateDoc(waitlistRef, {
        status: this.WAITLIST_STATUS.CANCELLED,
        cancelledAt: serverTimestamp(),
        cancellationReason: reason
      });
      
      // Update item waitlist count
      await this.updateItemWaitlistCount(waitlistEntry.itemId);
      
      // Update queue positions for remaining entries
      await this.updateQueuePositions(waitlistEntry.itemId);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error removing from waitlist:', error);
      throw error;
    }
  }

  // Get user's waitlist entries
  static async getUserWaitlistEntries(userId) {
    try {
      const q = query(
        collection(db, 'waitlists'),
        where('userId', '==', userId),
        where('status', 'in', [this.WAITLIST_STATUS.ACTIVE, this.WAITLIST_STATUS.NOTIFIED]),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const entries = [];
      
      snapshot.forEach(doc => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return entries;
      
    } catch (error) {
      console.error('❌ Error getting user waitlist entries:', error);
      return [];
    }
  }

  // Get waitlist for specific item
  static async getItemWaitlist(itemId) {
    try {
      const q = query(
        collection(db, 'waitlists'),
        where('itemId', '==', itemId),
        where('status', '==', this.WAITLIST_STATUS.ACTIVE),
        orderBy('priority', 'desc'),
        orderBy('queuePosition', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const waitlist = [];
      
      snapshot.forEach(doc => {
        waitlist.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return waitlist;
      
    } catch (error) {
      console.error('❌ Error getting item waitlist:', error);
      return [];
    }
  }

  // Helper: Calculate offer priority
  static calculateOfferPriority(offerDetails, item) {
    const itemValue = item.price || 0;
    const offerValue = offerDetails.totalOfferValue || 0;
    
    if (offerValue >= itemValue * 1.1) {
      return this.PRIORITY_LEVELS.HIGH; // 110%+ of asking price
    } else if (offerValue >= itemValue * 0.9) {
      return this.PRIORITY_LEVELS.MEDIUM; // 90-110% of asking price
    } else {
      return this.PRIORITY_LEVELS.LOW; // Below 90% of asking price
    }
  }

  // Helper: Get next queue position
  static async getNextQueuePosition(itemId) {
    try {
      const q = query(
        collection(db, 'waitlists'),
        where('itemId', '==', itemId),
        where('status', '==', this.WAITLIST_STATUS.ACTIVE)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size + 1;
      
    } catch (error) {
      console.error('❌ Error getting queue position:', error);
      return 1;
    }
  }

  // Helper: Update item waitlist count
  static async updateItemWaitlistCount(itemId) {
    try {
      const activeCount = await this.getNextQueuePosition(itemId) - 1;
      
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        waitlistCount: activeCount,
        hasWaitlist: activeCount > 0,
        lastWaitlistUpdate: serverTimestamp()
      });
      
    } catch (error) {
      console.error('❌ Error updating waitlist count:', error);
    }
  }

  // Helper: Update queue positions after removal
  static async updateQueuePositions(itemId) {
    try {
      const waitlist = await this.getItemWaitlist(itemId);
      
      const updatePromises = waitlist.map((entry, index) => {
        return updateDoc(doc(db, 'waitlists', entry.id), {
          queuePosition: index + 1
        });
      });
      
      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error('❌ Error updating queue positions:', error);
    }
  }

  // Helper: Estimate wait time
  static async estimateWaitTime(itemId, queuePosition) {
    // Simple estimation: assume 1 week per position ahead
    // In production, this could use ML based on historical data
    return Math.max(1, queuePosition * 7); // days
  }

  // Helper: Get user's waitlist entry for item
  static async getUserWaitlistEntry(itemId, userId) {
    try {
      const q = query(
        collection(db, 'waitlists'),
        where('itemId', '==', itemId),
        where('userId', '==', userId),
        where('status', '==', this.WAITLIST_STATUS.ACTIVE)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
      
    } catch (error) {
      console.error('❌ Error getting user waitlist entry:', error);
      return null;
    }
  }

  // Cleanup expired waitlist entries
  static async cleanupExpiredEntries() {
    try {
      console.log('🧹 Cleaning up expired waitlist entries');
      
      const now = new Date();
      const q = query(
        collection(db, 'waitlists'),
        where('status', '==', this.WAITLIST_STATUS.ACTIVE),
        where('expiresAt', '<=', now)
      );
      
      const snapshot = await getDocs(q);
      const cleanupPromises = [];
      
      snapshot.forEach(doc => {
        cleanupPromises.push(
          updateDoc(doc.ref, {
            status: this.WAITLIST_STATUS.EXPIRED,
            expiredAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(cleanupPromises);
      
      console.log(`✅ Cleaned up ${snapshot.size} expired waitlist entries`);
      
      return { cleaned: snapshot.size };
      
    } catch (error) {
      console.error('❌ Error cleaning up expired entries:', error);
      return { cleaned: 0 };
    }
  }
}
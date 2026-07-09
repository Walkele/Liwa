import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export class NotificationService {
  
  // Send notification (alias for createNotification for compatibility)
  static async sendNotification(userId, notificationData) {
    try {
      const { type, title, body, data = {} } = notificationData;
      return await this.createNotification(userId, type, title, body, data);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
  
  // Create notification for user
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      const notificationData = {
        userId,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: serverTimestamp(),
        priority: this.getNotificationPriority(type)
      };
      
      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      console.log(`📢 Notification created for user ${userId}: ${title}`);
      return notificationRef.id;
      
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Trade-specific notifications
  static async notifyTradeProposalReceived(targetUserId, proposerName, proposerItemTitle, targetItemTitle, tradeProposalId) {
    return await this.createNotification(
      targetUserId,
      'trade_proposal_received',
      '🔄 New Trade Proposal',
      `${proposerName} wants to trade their "${proposerItemTitle}" for your "${targetItemTitle}"`,
      { tradeProposalId, proposerName, proposerItemTitle, targetItemTitle }
    );
  }
  
  static async notifyTradeProposalAccepted(proposerUserId, accepterName, proposerItemTitle, targetItemTitle, tradeId) {
    return await this.createNotification(
      proposerUserId,
      'trade_proposal_accepted',
      '✅ Trade Proposal Accepted!',
      `${accepterName} accepted your trade proposal! "${proposerItemTitle}" ↔ "${targetItemTitle}"`,
      { tradeId, accepterName, proposerItemTitle, targetItemTitle }
    );
  }
  
  static async notifyTradeProposalRejected(proposerUserId, rejecterName, proposerItemTitle, targetItemTitle) {
    return await this.createNotification(
      proposerUserId,
      'trade_proposal_rejected',
      '❌ Trade Proposal Declined',
      `${rejecterName} declined your trade proposal for "${targetItemTitle}"`,
      { rejecterName, proposerItemTitle, targetItemTitle }
    );
  }
  
  static async notifyTradeStepCompleted(userId, stepNumber, stepTitle, otherUserName, tradeId) {
    return await this.createNotification(
      userId,
      'trade_step_completed',
      `📈 Trade Progress: ${stepTitle}`,
      `${otherUserName} completed "${stepTitle}". Your trade is progressing!`,
      { tradeId, stepNumber, stepTitle, otherUserName }
    );
  }
  
  static async notifyTradeCompleted(userId, otherUserName, itemTitle, tradeId) {
    return await this.createNotification(
      userId,
      'trade_completed',
      '🎉 Trade Completed!',
      `Your trade with ${otherUserName} for "${itemTitle}" has been completed successfully!`,
      { tradeId, otherUserName, itemTitle }
    );
  }
  
  static async notifyTradeCancelled(userId, otherUserName, itemTitle, reason, tradeId) {
    return await this.createNotification(
      userId,
      'trade_cancelled',
      '❌ Trade Cancelled',
      `Your trade with ${otherUserName} for "${itemTitle}" has been cancelled. Reason: ${reason}`,
      { tradeId, otherUserName, itemTitle, reason }
    );
  }
  
  static async notifyContactShared(userId, sharerName, contactMethods, itemTitle) {
    return await this.createNotification(
      userId,
      'contact_shared',
      '📞 Contact Info Received',
      `${sharerName} shared their contact info: ${contactMethods} for "${itemTitle}"`,
      { sharerName, contactMethods, itemTitle }
    );
  }
  
  static async notifyMeetingScheduled(userId, locationName, meetingDateTime, itemTitle) {
    return await this.createNotification(
      userId,
      'meeting_scheduled',
      '📍 Meeting Location Set',
      `Meeting scheduled for ${meetingDateTime.toLocaleDateString()} at ${meetingDateTime.toLocaleTimeString()} at ${locationName} for "${itemTitle}"`,
      { locationName, meetingDateTime: meetingDateTime.toISOString(), itemTitle }
    );
  }
  
  // Offer-specific notifications
  static async notifyOfferReceived(sellerId, buyerName, itemTitle, offerAmount, offerId) {
    return await this.createNotification(
      sellerId,
      'offer_received',
      '💰 New Offer Received',
      `${buyerName} offered ${offerAmount} for your "${itemTitle}"`,
      { offerId, buyerName, itemTitle, offerAmount }
    );
  }
  
  static async notifyOfferAccepted(buyerId, sellerName, itemTitle, offerAmount, offerId) {
    return await this.createNotification(
      buyerId,
      'offer_accepted',
      '✅ Offer Accepted!',
      `${sellerName} accepted your ${offerAmount} offer for "${itemTitle}"`,
      { offerId, sellerName, itemTitle, offerAmount }
    );
  }
  
  static async notifyCounterOffer(buyerId, sellerName, itemTitle, originalAmount, counterAmount, offerId) {
    return await this.createNotification(
      buyerId,
      'counter_offer',
      '🔄 Counter Offer',
      `${sellerName} countered your ${originalAmount} offer with ${counterAmount} for "${itemTitle}"`,
      { offerId, sellerName, itemTitle, originalAmount, counterAmount }
    );
  }
  
  // Message notifications
  static async notifyNewMessage(receiverId, senderName, messagePreview, conversationId) {
    return await this.createNotification(
      receiverId,
      'new_message',
      `💬 Message from ${senderName}`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      { conversationId, senderName }
    );
  }
  
  // Item-specific notifications
  static async notifyItemLiked(sellerId, likerName, itemTitle, itemId) {
    return await this.createNotification(
      sellerId,
      'item_liked',
      '❤️ Someone liked your item',
      `${likerName} liked your "${itemTitle}"`,
      { itemId, likerName, itemTitle }
    );
  }
  
  static async notifyItemViewed(sellerId, viewerName, itemTitle, itemId) {
    // Only notify for high-value items to avoid spam
    return await this.createNotification(
      sellerId,
      'item_viewed',
      '👀 Item Viewed',
      `${viewerName} viewed your "${itemTitle}"`,
      { itemId, viewerName, itemTitle }
    );
  }
  
  // System notifications
  static async notifyItemLocked(userId, itemTitle, reason, itemId) {
    return await this.createNotification(
      userId,
      'item_locked',
      '🔒 Item Locked',
      `Your "${itemTitle}" has been locked. Reason: ${reason}`,
      { itemId, itemTitle, reason }
    );
  }
  
  static async notifyItemUnlocked(userId, itemTitle, reason, itemId) {
    return await this.createNotification(
      userId,
      'item_unlocked',
      '🔓 Item Unlocked',
      `Your "${itemTitle}" has been unlocked. Reason: ${reason}`,
      { itemId, itemTitle, reason }
    );
  }
  
  static async notifySecurityAlert(userId, alertType, message, metadata = {}) {
    return await this.createNotification(
      userId,
      'security_alert',
      '🚨 Security Alert',
      message,
      { alertType, ...metadata }
    );
  }
  
  // Get user notifications
  static async getUserNotifications(userId, unreadOnly = false, limitCount = 50) {
    try {
      let notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      if (unreadOnly) {
        notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
      
      const snapshot = await getDocs(notificationsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }
  
  // Mark notification as read
  static async markNotificationAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  // Mark all user notifications as read
  static async markAllNotificationsAsRead(userId) {
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(unreadQuery);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
      return snapshot.docs.length;
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }
  
  // Get unread notification count
  static async getUnreadNotificationCount(userId) {
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(unreadQuery);
      return snapshot.docs.length;
      
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }
  
  // Get notification priority
  static getNotificationPriority(type) {
    const priorityMap = {
      'security_alert': 'high',
      'trade_proposal_received': 'high',
      'trade_proposal_accepted': 'high',
      'offer_accepted': 'high',
      'trade_completed': 'high',
      'trade_cancelled': 'medium',
      'counter_offer': 'medium',
      'trade_step_completed': 'medium',
      'new_message': 'medium',
      'offer_received': 'medium',
      'item_locked': 'low',
      'item_unlocked': 'low',
      'item_liked': 'low',
      'item_viewed': 'low'
    };
    
    return priorityMap[type] || 'low';
  }
  
  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    try {
      console.log('🧹 Cleaning up old notifications...');
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const oldNotificationsQuery = query(
        collection(db, 'notifications'),
        where('createdAt', '<', thirtyDaysAgo)
      );
      
      const snapshot = await getDocs(oldNotificationsQuery);
      let cleanedCount = 0;
      
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        cleanedCount++;
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} old notifications`);
      return cleanedCount;
      
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
}
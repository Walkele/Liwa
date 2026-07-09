// Enhanced Notification Service with real-time updates and categorization
// Handles system notifications, user notifications, and notification icon states

import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export class EnhancedNotificationService {
  
  // Notification categories for better organization
  static CATEGORIES = {
    TRADE: 'trade',
    OFFER: 'offer', 
    MESSAGE: 'message',
    SYSTEM: 'system',
    SECURITY: 'security',
    ITEM: 'item',
    SOCIAL: 'social'
  };

  // Notification priorities
  static PRIORITIES = {
    CRITICAL: 'critical',  // Security alerts, urgent system messages
    HIGH: 'high',         // Trade accepted, offer accepted
    MEDIUM: 'medium',     // New offers, messages, trade updates
    LOW: 'low'           // Item likes, views, general updates
  };

  // Notification types with metadata
  static NOTIFICATION_TYPES = {
    // Trade notifications
    TRADE_PROPOSAL_RECEIVED: {
      category: 'trade',
      priority: 'high',
      icon: 'swap-horizontal',
      color: '#4CAF50',
      sound: true,
      vibrate: true
    },
    TRADE_PROPOSAL_ACCEPTED: {
      category: 'trade',
      priority: 'high',
      icon: 'checkmark-circle',
      color: '#4CAF50',
      sound: true,
      vibrate: true
    },
    TRADE_PROPOSAL_REJECTED: {
      category: 'trade',
      priority: 'medium',
      icon: 'close-circle',
      color: '#F44336',
      sound: false,
      vibrate: false
    },
    TRADE_STEP_COMPLETED: {
      category: 'trade',
      priority: 'medium',
      icon: 'checkmark',
      color: '#2196F3',
      sound: false,
      vibrate: true
    },
    TRADE_COMPLETED: {
      category: 'trade',
      priority: 'high',
      icon: 'trophy',
      color: '#FF9800',
      sound: true,
      vibrate: true
    },
    TRADE_CANCELLED: {
      category: 'trade',
      priority: 'medium',
      icon: 'ban',
      color: '#F44336',
      sound: false,
      vibrate: false
    },

    // Offer notifications
    OFFER_RECEIVED: {
      category: 'offer',
      priority: 'medium',
      icon: 'cash',
      color: '#4CAF50',
      sound: true,
      vibrate: true
    },
    OFFER_ACCEPTED: {
      category: 'offer',
      priority: 'high',
      icon: 'checkmark-circle',
      color: '#4CAF50',
      sound: true,
      vibrate: true
    },
    COUNTER_OFFER: {
      category: 'offer',
      priority: 'medium',
      icon: 'refresh',
      color: '#FF9800',
      sound: true,
      vibrate: true
    },
    OFFER_REJECTED: {
      category: 'offer',
      priority: 'low',
      icon: 'close-circle',
      color: '#F44336',
      sound: false,
      vibrate: false
    },

    // Message notifications
    NEW_MESSAGE: {
      category: 'message',
      priority: 'medium',
      icon: 'chatbubble',
      color: '#2196F3',
      sound: true,
      vibrate: true
    },
    MESSAGE_READ: {
      category: 'message',
      priority: 'low',
      icon: 'checkmark-done',
      color: '#9E9E9E',
      sound: false,
      vibrate: false
    },

    // System notifications
    SYSTEM_MAINTENANCE: {
      category: 'system',
      priority: 'medium',
      icon: 'construct',
      color: '#FF9800',
      sound: false,
      vibrate: false
    },
    SYSTEM_UPDATE: {
      category: 'system',
      priority: 'low',
      icon: 'download',
      color: '#2196F3',
      sound: false,
      vibrate: false
    },
    ACCOUNT_VERIFIED: {
      category: 'system',
      priority: 'medium',
      icon: 'shield-checkmark',
      color: '#4CAF50',
      sound: true,
      vibrate: false
    },

    // Security notifications
    SECURITY_ALERT: {
      category: 'security',
      priority: 'critical',
      icon: 'warning',
      color: '#F44336',
      sound: true,
      vibrate: true
    },
    LOGIN_DETECTED: {
      category: 'security',
      priority: 'medium',
      icon: 'log-in',
      color: '#FF9800',
      sound: false,
      vibrate: false
    },
    SUSPICIOUS_ACTIVITY: {
      category: 'security',
      priority: 'high',
      icon: 'alert-circle',
      color: '#F44336',
      sound: true,
      vibrate: true
    },

    // Item notifications
    ITEM_LIKED: {
      category: 'item',
      priority: 'low',
      icon: 'heart',
      color: '#E91E63',
      sound: false,
      vibrate: false
    },
    ITEM_VIEWED: {
      category: 'item',
      priority: 'low',
      icon: 'eye',
      color: '#9E9E9E',
      sound: false,
      vibrate: false
    },
    ITEM_LOCKED: {
      category: 'item',
      priority: 'medium',
      icon: 'lock-closed',
      color: '#FF9800',
      sound: false,
      vibrate: true
    },
    ITEM_UNLOCKED: {
      category: 'item',
      priority: 'low',
      icon: 'lock-open',
      color: '#4CAF50',
      sound: false,
      vibrate: false
    },

    // Social notifications
    USER_FOLLOWED: {
      category: 'social',
      priority: 'low',
      icon: 'person-add',
      color: '#2196F3',
      sound: false,
      vibrate: false
    },
    REVIEW_RECEIVED: {
      category: 'social',
      priority: 'medium',
      icon: 'star',
      color: '#FF9800',
      sound: false,
      vibrate: true
    }
  };

  // Create enhanced notification with full metadata
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      const notificationMeta = this.NOTIFICATION_TYPES[type] || {
        category: 'system',
        priority: 'low',
        icon: 'notifications',
        color: '#9E9E9E',
        sound: false,
        vibrate: false
      };

      const notificationData = {
        userId,
        type,
        title,
        message,
        data,
        category: notificationMeta.category,
        priority: notificationMeta.priority,
        icon: notificationMeta.icon,
        color: notificationMeta.color,
        sound: notificationMeta.sound,
        vibrate: notificationMeta.vibrate,
        read: false,
        dismissed: false,
        createdAt: serverTimestamp(),
        expiresAt: this.calculateExpirationDate(notificationMeta.priority),
        metadata: {
          appVersion: '1.0.0',
          platform: 'mobile',
          ...data
        }
      };
      
      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      console.log(`📢 Enhanced notification created for user ${userId}: ${title} (${type})`);
      
      // Trigger real-time notification if high priority
      if (notificationMeta.priority === 'critical' || notificationMeta.priority === 'high') {
        this.triggerRealTimeNotification(userId, notificationData);
      }
      
      return notificationRef.id;
      
    } catch (error) {
      console.error('Error creating enhanced notification:', error);
      throw error;
    }
  }

  // Calculate expiration date based on priority
  static calculateExpirationDate(priority) {
    const now = new Date();
    const expirationDays = {
      'critical': 7,   // 1 week
      'high': 14,      // 2 weeks  
      'medium': 30,    // 1 month
      'low': 7         // 1 week
    };
    
    const days = expirationDays[priority] || 7;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Trigger real-time notification (for high priority notifications)
  static triggerRealTimeNotification(userId, notificationData) {
    // This would integrate with push notification services
    console.log(`🔔 Real-time notification triggered for user ${userId}:`, notificationData.title);
    
    // Future: Integrate with Expo Notifications or Firebase Cloud Messaging
    // expo-notifications or react-native-push-notification
  }

  // Get notifications with enhanced filtering
  static async getNotifications(userId, options = {}) {
    const {
      category = null,
      priority = null,
      unreadOnly = false,
      limit: limitCount = 50,
      includeExpired = false
    } = options;

    try {
      let constraints = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];

      if (category) {
        constraints.splice(1, 0, where('category', '==', category));
      }

      if (priority) {
        constraints.splice(1, 0, where('priority', '==', priority));
      }

      if (unreadOnly) {
        constraints.splice(1, 0, where('read', '==', false));
      }

      if (!includeExpired) {
        constraints.splice(1, 0, where('expiresAt', '>', new Date()));
      }

      const notificationsQuery = query(collection(db, 'notifications'), ...constraints);
      const snapshot = await getDocs(notificationsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate?.() || new Date()
      }));
      
    } catch (error) {
      console.error('Error getting enhanced notifications:', error);
      return [];
    }
  }

  // Real-time notification listener
  static subscribeToNotifications(userId, callback, options = {}) {
    const {
      category = null,
      unreadOnly = true,
      limit: limitCount = 20
    } = options;

    try {
      let constraints = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];

      if (category) {
        constraints.splice(1, 0, where('category', '==', category));
      }

      if (unreadOnly) {
        constraints.splice(1, 0, where('read', '==', false));
      }

      const notificationsQuery = query(collection(db, 'notifications'), ...constraints);
      
      return onSnapshot(notificationsQuery, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate?.() || new Date()
        }));
        
        callback(notifications);
      });
      
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Get notification counts by category
  static async getNotificationCounts(userId) {
    try {
      // Validate userId
      if (!userId) {
        console.warn('⚠️ getNotificationCounts: No userId provided');
        return {
          total: 0,
          byCategory: {},
          byPriority: {},
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }

      const allNotifications = await this.getNotifications(userId, { 
        unreadOnly: true, 
        limit: 1000 
      });

      // Ensure allNotifications is an array
      const notifications = Array.isArray(allNotifications) ? allNotifications : [];

      const counts = {
        total: notifications.length,
        byCategory: {},
        byPriority: {},
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };

      notifications.forEach(notification => {
        // Safely access notification properties
        if (!notification || typeof notification !== 'object') {
          console.warn('⚠️ getNotificationCounts: Invalid notification:', notification);
          return;
        }

        // Count by category
        const category = notification.category || 'system';
        counts.byCategory[category] = (counts.byCategory[category] || 0) + 1;

        // Count by priority
        const priority = notification.priority || 'low';
        counts.byPriority[priority] = (counts.byPriority[priority] || 0) + 1;
        counts[priority] = (counts[priority] || 0) + 1;
      });

      return counts;
      
    } catch (error) {
      console.error('Error getting notification counts:', error);
      return {
        total: 0,
        byCategory: {},
        byPriority: {},
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }
  }

  // Mark notification as read with analytics
  static async markAsRead(notificationId, userId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
        readBy: userId
      });

      console.log(`📖 Notification ${notificationId} marked as read by ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Dismiss notification (hide without marking as read)
  static async dismissNotification(notificationId, userId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        dismissed: true,
        dismissedAt: serverTimestamp(),
        dismissedBy: userId
      });

      console.log(`🙈 Notification ${notificationId} dismissed by ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }
  }

  // Bulk operations
  static async markAllAsRead(userId, category = null) {
    try {
      const notifications = await this.getNotifications(userId, {
        category,
        unreadOnly: true,
        limit: 1000
      });

      const updatePromises = notifications.map(notification =>
        this.markAsRead(notification.id, userId)
      );

      await Promise.all(updatePromises);
      
      console.log(`📚 Marked ${notifications.length} notifications as read for user ${userId}`);
      return notifications.length;
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  // Clean up expired notifications
  static async cleanupExpiredNotifications() {
    try {
      console.log('🧹 Cleaning up expired notifications...');
      
      const expiredQuery = query(
        collection(db, 'notifications'),
        where('expiresAt', '<', new Date())
      );
      
      const snapshot = await getDocs(expiredQuery);
      let cleanedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        await docSnapshot.ref.delete();
        cleanedCount++;
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} expired notifications`);
      return cleanedCount;
      
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  // Notification analytics
  static async getNotificationAnalytics(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const analyticsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('createdAt', '>', startDate),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(analyticsQuery);
      const notifications = snapshot.docs.map(doc => doc.data());
      
      const analytics = {
        totalReceived: notifications.length,
        totalRead: notifications.filter(n => n.read).length,
        totalDismissed: notifications.filter(n => n.dismissed).length,
        readRate: notifications.length > 0 ? (notifications.filter(n => n.read).length / notifications.length * 100).toFixed(1) : 0,
        byCategory: {},
        byPriority: {},
        byType: {},
        avgResponseTime: 0
      };
      
      // Calculate detailed analytics
      notifications.forEach(notification => {
        const category = notification.category || 'system';
        const priority = notification.priority || 'low';
        const type = notification.type || 'unknown';
        
        analytics.byCategory[category] = (analytics.byCategory[category] || 0) + 1;
        analytics.byPriority[priority] = (analytics.byPriority[priority] || 0) + 1;
        analytics.byType[type] = (analytics.byType[type] || 0) + 1;
      });
      
      return analytics;
      
    } catch (error) {
      console.error('Error getting notification analytics:', error);
      return null;
    }
  }

  // Convenience methods for common notification types
  static async notifyTradeProposalReceived(targetUserId, proposerName, proposerItemTitle, targetItemTitle, tradeProposalId) {
    return await this.createNotification(
      targetUserId,
      'TRADE_PROPOSAL_RECEIVED',
      '🔄 New Trade Proposal',
      `${proposerName} wants to trade their "${proposerItemTitle}" for your "${targetItemTitle}"`,
      { tradeProposalId, proposerName, proposerItemTitle, targetItemTitle }
    );
  }

  static async notifyOfferReceived(sellerId, buyerName, itemTitle, offerAmount, offerId) {
    return await this.createNotification(
      sellerId,
      'OFFER_RECEIVED',
      '💰 New Offer Received',
      `${buyerName} offered $${offerAmount} for your "${itemTitle}"`,
      { offerId, buyerName, itemTitle, offerAmount }
    );
  }

  static async notifySecurityAlert(userId, alertType, message, metadata = {}) {
    return await this.createNotification(
      userId,
      'SECURITY_ALERT',
      '🚨 Security Alert',
      message,
      { alertType, ...metadata }
    );
  }

  static async notifySystemMaintenance(userId, maintenanceWindow, affectedFeatures) {
    return await this.createNotification(
      userId,
      'SYSTEM_MAINTENANCE',
      '🔧 Scheduled Maintenance',
      `System maintenance scheduled for ${maintenanceWindow}. Some features may be temporarily unavailable.`,
      { maintenanceWindow, affectedFeatures }
    );
  }
}

export default EnhancedNotificationService;
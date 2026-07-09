import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';

export class SecurityService {
  
  // Rate limiting for actions
  static rateLimits = {
    trade_proposals: { count: 10, window: 60 * 60 * 1000 }, // 10 per hour
    offers: { count: 20, window: 60 * 60 * 1000 }, // 20 per hour
    messages: { count: 100, window: 60 * 60 * 1000 }, // 100 per hour
    item_posts: { count: 5, window: 24 * 60 * 60 * 1000 }, // 5 per day
    profile_updates: { count: 3, window: 60 * 60 * 1000 } // 3 per hour
  };
  
  // Check if user action is within rate limits
  static async checkRateLimit(userId, action) {
    try {
      const limit = this.rateLimits[action];
      if (!limit) return { allowed: true };
      
      const windowStart = new Date(Date.now() - limit.window);
      
      const actionsQuery = query(
        collection(db, 'userActions'),
        where('userId', '==', userId),
        where('action', '==', action),
        where('timestamp', '>=', windowStart),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(actionsQuery);
      const actionCount = snapshot.docs.length;
      
      if (actionCount >= limit.count) {
        await this.logSecurityEvent(userId, 'rate_limit_exceeded', {
          action,
          count: actionCount,
          limit: limit.count,
          window: limit.window
        });
        
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          retryAfter: this.calculateRetryAfter(snapshot.docs, limit.window)
        };
      }
      
      return { allowed: true, remaining: limit.count - actionCount };
      
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow on error to avoid blocking users
    }
  }
  
  // Log user action for rate limiting
  static async logUserAction(userId, action, metadata = {}) {
    try {
      await addDoc(collection(db, 'userActions'), {
        userId,
        action,
        metadata,
        timestamp: serverTimestamp(),
        ipAddress: metadata.ipAddress || 'unknown'
      });
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  }
  
  // Detect suspicious behavior patterns
  static async detectSuspiciousBehavior(userId, action, metadata = {}) {
    try {
      const suspiciousPatterns = [];
      
      // Check for rapid-fire actions
      const rapidFireCheck = await this.checkRapidFireActions(userId, action);
      if (rapidFireCheck.suspicious) {
        suspiciousPatterns.push('rapid_fire_actions');
      }
      
      // Check for duplicate content
      if (action === 'item_post' || action === 'message') {
        const duplicateCheck = await this.checkDuplicateContent(userId, action, metadata);
        if (duplicateCheck.suspicious) {
          suspiciousPatterns.push('duplicate_content');
        }
      }
      
      // Check for unusual trading patterns
      if (action === 'trade_proposal') {
        const tradingPatternCheck = await this.checkTradingPatterns(userId);
        if (tradingPatternCheck.suspicious) {
          suspiciousPatterns.push('unusual_trading_pattern');
        }
      }
      
      // Check for price manipulation
      if (action === 'offer' && metadata.offerAmount) {
        const priceCheck = await this.checkPriceManipulation(metadata.itemId, metadata.offerAmount);
        if (priceCheck.suspicious) {
          suspiciousPatterns.push('price_manipulation');
        }
      }
      
      if (suspiciousPatterns.length > 0) {
        await this.handleSuspiciousActivity(userId, suspiciousPatterns, { action, ...metadata });
      }
      
      return { suspicious: suspiciousPatterns.length > 0, patterns: suspiciousPatterns };
      
    } catch (error) {
      console.error('Error detecting suspicious behavior:', error);
      return { suspicious: false, patterns: [] };
    }
  }
  
  // Check for rapid-fire actions (too many actions in short time)
  static async checkRapidFireActions(userId, action) {
    try {
      const lastMinute = new Date(Date.now() - 60 * 1000);
      
      const recentActionsQuery = query(
        collection(db, 'userActions'),
        where('userId', '==', userId),
        where('action', '==', action),
        where('timestamp', '>=', lastMinute),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(recentActionsQuery);
      const actionCount = snapshot.docs.length;
      
      // More than 5 of the same action in 1 minute is suspicious
      return { suspicious: actionCount > 5, count: actionCount };
      
    } catch (error) {
      console.error('Error checking rapid fire actions:', error);
      return { suspicious: false };
    }
  }
  
  // Check for duplicate content (spam detection)
  static async checkDuplicateContent(userId, action, metadata) {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let contentField = '';
      let contentValue = '';
      
      if (action === 'item_post') {
        contentField = 'metadata.title';
        contentValue = metadata.title;
      } else if (action === 'message') {
        contentField = 'metadata.text';
        contentValue = metadata.text;
      }
      
      if (!contentValue) return { suspicious: false };
      
      const duplicateQuery = query(
        collection(db, 'userActions'),
        where('userId', '==', userId),
        where('action', '==', action),
        where('timestamp', '>=', last24Hours)
      );
      
      const snapshot = await getDocs(duplicateQuery);
      let duplicateCount = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const existingContent = data.metadata?.[contentField.split('.')[1]];
        if (existingContent === contentValue) {
          duplicateCount++;
        }
      });
      
      // More than 3 identical posts/messages in 24 hours is suspicious
      return { suspicious: duplicateCount > 3, count: duplicateCount };
      
    } catch (error) {
      console.error('Error checking duplicate content:', error);
      return { suspicious: false };
    }
  }
  
  // Check for unusual trading patterns
  static async checkTradingPatterns(userId) {
    try {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const tradeActionsQuery = query(
        collection(db, 'userActions'),
        where('userId', '==', userId),
        where('action', '==', 'trade_proposal'),
        where('timestamp', '>=', lastWeek)
      );
      
      const snapshot = await getDocs(tradeActionsQuery);
      const tradeCount = snapshot.docs.length;
      
      // More than 50 trade proposals in a week is suspicious
      if (tradeCount > 50) {
        return { suspicious: true, reason: 'excessive_trading', count: tradeCount };
      }
      
      // Check for trading with same users repeatedly
      const targetUsers = {};
      snapshot.docs.forEach(doc => {
        const targetUserId = doc.data().metadata?.targetUserId;
        if (targetUserId) {
          targetUsers[targetUserId] = (targetUsers[targetUserId] || 0) + 1;
        }
      });
      
      const maxTradesWithSameUser = Math.max(...Object.values(targetUsers));
      if (maxTradesWithSameUser > 10) {
        return { suspicious: true, reason: 'repeated_trading_partner', count: maxTradesWithSameUser };
      }
      
      return { suspicious: false };
      
    } catch (error) {
      console.error('Error checking trading patterns:', error);
      return { suspicious: false };
    }
  }
  
  // Check for price manipulation
  static async checkPriceManipulation(itemId, offerAmount) {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const offersQuery = query(
        collection(db, 'userActions'),
        where('action', '==', 'offer'),
        where('metadata.itemId', '==', itemId),
        where('timestamp', '>=', last24Hours)
      );
      
      const snapshot = await getDocs(offersQuery);
      const offers = snapshot.docs.map(doc => doc.data().metadata?.offerAmount).filter(Boolean);
      
      if (offers.length < 3) return { suspicious: false };
      
      const avgOffer = offers.reduce((sum, offer) => sum + offer, 0) / offers.length;
      const deviation = Math.abs(offerAmount - avgOffer) / avgOffer;
      
      // Offer deviating more than 200% from average is suspicious
      return { suspicious: deviation > 2, deviation, avgOffer };
      
    } catch (error) {
      console.error('Error checking price manipulation:', error);
      return { suspicious: false };
    }
  }
  
  // Handle suspicious activity
  static async handleSuspiciousActivity(userId, patterns, metadata = {}) {
    try {
      const severity = this.calculateSeverity(patterns);
      
      await this.logSecurityEvent(userId, 'suspicious_activity_detected', {
        patterns,
        severity,
        ...metadata
      });
      
      // Apply appropriate response based on severity
      if (severity === 'high') {
        await this.temporarilyRestrictUser(userId, 'suspicious_activity', 24 * 60 * 60 * 1000); // 24 hours
        await NotificationService.notifySecurityAlert(
          userId,
          'account_restricted',
          'Your account has been temporarily restricted due to suspicious activity. Contact support if you believe this is an error.',
          { patterns, severity }
        );
      } else if (severity === 'medium') {
        await this.addUserWarning(userId, patterns);
        await NotificationService.notifySecurityAlert(
          userId,
          'security_warning',
          'We detected unusual activity on your account. Please ensure you are following our community guidelines.',
          { patterns }
        );
      }
      
      // Notify administrators for high-severity cases
      if (severity === 'high') {
        await this.notifyAdministrators(userId, patterns, metadata);
      }
      
    } catch (error) {
      console.error('Error handling suspicious activity:', error);
    }
  }
  
  // Calculate severity of suspicious patterns
  static calculateSeverity(patterns) {
    const highSeverityPatterns = ['price_manipulation', 'rapid_fire_actions'];
    const mediumSeverityPatterns = ['unusual_trading_pattern', 'duplicate_content'];
    
    if (patterns.some(pattern => highSeverityPatterns.includes(pattern))) {
      return 'high';
    } else if (patterns.some(pattern => mediumSeverityPatterns.includes(pattern))) {
      return 'medium';
    }
    return 'low';
  }
  
  // Temporarily restrict user
  static async temporarilyRestrictUser(userId, reason, durationMs) {
    try {
      const restrictionData = {
        userId,
        reason,
        restrictedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + durationMs),
        active: true
      };
      
      await addDoc(collection(db, 'userRestrictions'), restrictionData);
      
      console.log(`🚫 User ${userId} temporarily restricted for ${reason}`);
      
    } catch (error) {
      console.error('Error restricting user:', error);
    }
  }
  
  // Add warning to user record
  static async addUserWarning(userId, patterns) {
    try {
      const warningData = {
        userId,
        patterns,
        issuedAt: serverTimestamp(),
        acknowledged: false
      };
      
      await addDoc(collection(db, 'userWarnings'), warningData);
      
    } catch (error) {
      console.error('Error adding user warning:', error);
    }
  }
  
  // Check if user is currently restricted
  static async isUserRestricted(userId) {
    try {
      const now = new Date();
      
      const restrictionsQuery = query(
        collection(db, 'userRestrictions'),
        where('userId', '==', userId),
        where('active', '==', true),
        where('expiresAt', '>', now)
      );
      
      const snapshot = await getDocs(restrictionsQuery);
      
      if (snapshot.empty) {
        return { restricted: false };
      }
      
      const restriction = snapshot.docs[0].data();
      return {
        restricted: true,
        reason: restriction.reason,
        expiresAt: restriction.expiresAt,
        restrictedAt: restriction.restrictedAt
      };
      
    } catch (error) {
      console.error('Error checking user restrictions:', error);
      return { restricted: false };
    }
  }
  
  // Log security event
  static async logSecurityEvent(userId, eventType, metadata = {}) {
    try {
      await addDoc(collection(db, 'securityEvents'), {
        userId,
        eventType,
        metadata,
        timestamp: serverTimestamp(),
        severity: this.getEventSeverity(eventType)
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
  
  // Get event severity
  static getEventSeverity(eventType) {
    const severityMap = {
      'suspicious_activity_detected': 'high',
      'rate_limit_exceeded': 'medium',
      'account_restricted': 'high',
      'security_warning': 'medium',
      'login_attempt_failed': 'low',
      'password_changed': 'medium'
    };
    
    return severityMap[eventType] || 'low';
  }
  
  // Calculate retry after time for rate limiting
  static calculateRetryAfter(actionDocs, windowMs) {
    if (actionDocs.length === 0) return 0;
    
    const oldestAction = actionDocs[actionDocs.length - 1];
    const oldestTimestamp = oldestAction.data().timestamp?.toDate();
    
    if (!oldestTimestamp) return windowMs;
    
    const retryAfter = oldestTimestamp.getTime() + windowMs - Date.now();
    return Math.max(0, retryAfter);
  }
  
  // Notify administrators of high-severity events
  static async notifyAdministrators(userId, patterns, metadata) {
    try {
      // In a real app, this would send notifications to admin users
      console.log(`🚨 ADMIN ALERT: Suspicious activity detected for user ${userId}`, {
        patterns,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      // Log for admin dashboard
      await addDoc(collection(db, 'adminAlerts'), {
        type: 'suspicious_activity',
        userId,
        patterns,
        metadata,
        timestamp: serverTimestamp(),
        acknowledged: false
      });
      
    } catch (error) {
      console.error('Error notifying administrators:', error);
    }
  }
  
  // Clean up old security logs (older than 90 days)
  static async cleanupOldSecurityLogs() {
    try {
      console.log('🧹 Cleaning up old security logs...');
      
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const collections = ['userActions', 'securityEvents', 'userWarnings'];
      let totalCleaned = 0;
      
      for (const collectionName of collections) {
        const oldLogsQuery = query(
          collection(db, collectionName),
          where('timestamp', '<', ninetyDaysAgo)
        );
        
        const snapshot = await getDocs(oldLogsQuery);
        
        for (const doc of snapshot.docs) {
          await doc.ref.delete();
          totalCleaned++;
        }
      }
      
      console.log(`✅ Cleaned up ${totalCleaned} old security logs`);
      return totalCleaned;
      
    } catch (error) {
      console.error('Error cleaning up old security logs:', error);
      return 0;
    }
  }
}
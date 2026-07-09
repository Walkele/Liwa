import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  increment,
  getDoc
} from 'firebase/firestore';

/**
 * Enhanced Reporting Service with Best Practices
 * Implements comprehensive reporting mechanism for SwipeIt platform
 */
export class EnhancedReportingService {
  
  // Report categories with severity levels
  static REPORT_CATEGORIES = {
    USER: {
      HARASSMENT: { severity: 'high', autoAction: 'review' },
      SPAM: { severity: 'medium', autoAction: 'flag' },
      FAKE_PROFILE: { severity: 'high', autoAction: 'review' },
      INAPPROPRIATE_BEHAVIOR: { severity: 'medium', autoAction: 'review' },
      SCAM: { severity: 'critical', autoAction: 'suspend' },
      VIOLENCE_THREATS: { severity: 'critical', autoAction: 'suspend' },
      HATE_SPEECH: { severity: 'critical', autoAction: 'suspend' },
      IMPERSONATION: { severity: 'high', autoAction: 'review' }
    },
    ITEM: {
      INAPPROPRIATE_CONTENT: { severity: 'medium', autoAction: 'hide' },
      STOLEN_GOODS: { severity: 'critical', autoAction: 'remove' },
      PROHIBITED_ITEMS: { severity: 'high', autoAction: 'remove' },
      MISLEADING_DESCRIPTION: { severity: 'medium', autoAction: 'flag' },
      DUPLICATE_LISTING: { severity: 'low', autoAction: 'flag' },
      PRICE_MANIPULATION: { severity: 'medium', autoAction: 'review' },
      COUNTERFEIT: { severity: 'high', autoAction: 'remove' },
      ADULT_CONTENT: { severity: 'high', autoAction: 'remove' }
    },
    TRADE: {
      NO_SHOW: { severity: 'medium', autoAction: 'flag' },
      ITEM_NOT_AS_DESCRIBED: { severity: 'medium', autoAction: 'review' },
      PAYMENT_FRAUD: { severity: 'critical', autoAction: 'suspend' },
      UNSAFE_MEETING: { severity: 'high', autoAction: 'review' },
      TRADE_MANIPULATION: { severity: 'high', autoAction: 'review' },
      BREACH_OF_AGREEMENT: { severity: 'medium', autoAction: 'review' }
    },
    SYSTEM: {
      BUG_REPORT: { severity: 'low', autoAction: 'log' },
      FEATURE_REQUEST: { severity: 'low', autoAction: 'log' },
      PERFORMANCE_ISSUE: { severity: 'medium', autoAction: 'log' },
      SECURITY_VULNERABILITY: { severity: 'critical', autoAction: 'escalate' }
    }
  };

  // Report statuses
  static REPORT_STATUS = {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
    ESCALATED: 'escalated',
    AUTO_RESOLVED: 'auto_resolved'
  };

  /**
   * Submit a comprehensive report
   */
  static async submitReport({
    reporterId,
    reportedType, // 'user', 'item', 'trade', 'system'
    reportedId,
    category,
    subcategory,
    description,
    evidence = [],
    location = null,
    severity = 'medium',
    anonymous = false
  }) {
    try {
      // Validate inputs
      if (!reporterId || !reportedType || !reportedId || !category) {
        throw new Error('Missing required report fields');
      }

      // Check for duplicate reports (prevent spam)
      const duplicateCheck = await this.checkDuplicateReport(
        reporterId, 
        reportedType, 
        reportedId, 
        category
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          message: 'You have already reported this item recently',
          reportId: duplicateCheck.existingReportId
        };
      }

      // Get category configuration
      const categoryConfig = this.getCategoryConfig(reportedType, subcategory);
      
      // Create comprehensive report document
      const reportData = {
        // Basic Information
        reporterId: anonymous ? null : reporterId,
        reportedType,
        reportedId,
        category,
        subcategory,
        description: description.trim(),
        
        // Classification
        severity: categoryConfig?.severity || severity,
        autoAction: categoryConfig?.autoAction || 'review',
        
        // Evidence
        evidence: evidence.map(item => ({
          type: item.type, // 'image', 'screenshot', 'text', 'url'
          url: item.url,
          description: item.description,
          timestamp: serverTimestamp()
        })),
        
        // Context
        location,
        deviceInfo: this.getDeviceInfo(),
        appVersion: this.getAppVersion(),
        
        // Status Tracking
        status: this.REPORT_STATUS.PENDING,
        priority: this.calculatePriority(categoryConfig?.severity || severity),
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Flags
        anonymous,
        requiresImmedateAction: categoryConfig?.severity === 'critical',
        autoProcessed: false,
        
        // Metadata
        reportHash: this.generateReportHash(reporterId, reportedType, reportedId, category),
        source: 'mobile_app'
      };

      // Add report to database
      const reportRef = await addDoc(collection(db, 'reports'), reportData);
      
      // Execute auto-actions based on category
      await this.executeAutoActions(reportRef.id, reportData);
      
      // Update reported entity statistics
      await this.updateReportedEntityStats(reportedType, reportedId);
      
      // Send notifications if required
      await this.sendReportNotifications(reportRef.id, reportData);
      
      // Log the report for analytics
      await this.logReportAnalytics(reportData);

      return {
        success: true,
        reportId: reportRef.id,
        message: 'Report submitted successfully',
        estimatedReviewTime: this.getEstimatedReviewTime(categoryConfig?.severity || severity)
      };

    } catch (error) {
      console.error('Error submitting report:', error);
      throw new Error('Failed to submit report: ' + error.message);
    }
  }

  /**
   * Check for duplicate reports within time window
   */
  static async checkDuplicateReport(reporterId, reportedType, reportedId, category) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const duplicateQuery = query(
        collection(db, 'reports'),
        where('reporterId', '==', reporterId),
        where('reportedType', '==', reportedType),
        where('reportedId', '==', reportedId),
        where('category', '==', category),
        where('createdAt', '>', twentyFourHoursAgo),
        limit(1)
      );

      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      return {
        isDuplicate: !duplicateSnapshot.empty,
        existingReportId: duplicateSnapshot.empty ? null : duplicateSnapshot.docs[0].id
      };
    } catch (error) {
      console.error('Error checking duplicate report:', error);
      return { isDuplicate: false, existingReportId: null };
    }
  }

  /**
   * Execute automatic actions based on report category
   */
  static async executeAutoActions(reportId, reportData) {
    try {
      const { autoAction, reportedType, reportedId, severity } = reportData;

      switch (autoAction) {
        case 'suspend':
          if (reportedType === 'user') {
            await this.autoSuspendUser(reportedId, reportId, severity);
          }
          break;
          
        case 'remove':
          if (reportedType === 'item') {
            await this.autoRemoveItem(reportedId, reportId);
          }
          break;
          
        case 'hide':
          if (reportedType === 'item') {
            await this.autoHideItem(reportedId, reportId);
          }
          break;
          
        case 'flag':
          await this.autoFlagEntity(reportedType, reportedId, reportId);
          break;
          
        case 'escalate':
          await this.autoEscalateReport(reportId);
          break;
          
        case 'review':
        default:
          // Queue for manual review
          await this.queueForReview(reportId, reportData.priority);
          break;
      }
    } catch (error) {
      console.error('Error executing auto actions:', error);
    }
  }

  /**
   * Auto-suspend user for critical violations
   */
  static async autoSuspendUser(userId, reportId, severity) {
    try {
      const userRef = doc(db, 'users', userId);
      const suspensionDuration = severity === 'critical' ? 7 : 3; // days
      
      await updateDoc(userRef, {
        isSuspended: true,
        suspensionReason: 'Automatic suspension due to report',
        suspensionReportId: reportId,
        suspendedUntil: new Date(Date.now() + suspensionDuration * 24 * 60 * 60 * 1000),
        suspendedAt: serverTimestamp()
      });

      // Log auto-action
      await this.logAutoAction('user_suspended', userId, reportId);
    } catch (error) {
      console.error('Error auto-suspending user:', error);
    }
  }

  /**
   * Auto-remove item for policy violations
   */
  static async autoRemoveItem(itemId, reportId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      
      await updateDoc(itemRef, {
        status: 'removed',
        removalReason: 'Automatic removal due to report',
        removalReportId: reportId,
        removedAt: serverTimestamp()
      });

      // Log auto-action
      await this.logAutoAction('item_removed', itemId, reportId);
    } catch (error) {
      console.error('Error auto-removing item:', error);
    }
  }

  /**
   * Auto-hide item pending review
   */
  static async autoHideItem(itemId, reportId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      
      await updateDoc(itemRef, {
        isHidden: true,
        hiddenReason: 'Hidden pending review due to report',
        hiddenReportId: reportId,
        hiddenAt: serverTimestamp()
      });

      // Log auto-action
      await this.logAutoAction('item_hidden', itemId, reportId);
    } catch (error) {
      console.error('Error auto-hiding item:', error);
    }
  }

  /**
   * Flag entity for review
   */
  static async autoFlagEntity(entityType, entityId, reportId) {
    try {
      const entityRef = doc(db, entityType === 'user' ? 'users' : 'items', entityId);
      
      await updateDoc(entityRef, {
        isFlagged: true,
        flagReason: 'Flagged due to user report',
        flagReportId: reportId,
        flaggedAt: serverTimestamp(),
        flagCount: increment(1)
      });

      // Log auto-action
      await this.logAutoAction('entity_flagged', entityId, reportId);
    } catch (error) {
      console.error('Error flagging entity:', error);
    }
  }

  /**
   * Update statistics for reported entity
   */
  static async updateReportedEntityStats(reportedType, reportedId) {
    try {
      const entityRef = doc(db, reportedType === 'user' ? 'users' : 'items', reportedId);
      
      await updateDoc(entityRef, {
        reportCount: increment(1),
        lastReportedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating entity stats:', error);
    }
  }

  /**
   * Get user's report history
   */
  static async getUserReportHistory(userId, limitCount = 20) {
    try {
      const reportsQuery = query(
        collection(db, 'reports'),
        where('reporterId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(reportsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error fetching user report history:', error);
      return [];
    }
  }

  /**
   * Get reports against a specific entity
   */
  static async getEntityReports(entityType, entityId) {
    try {
      const reportsQuery = query(
        collection(db, 'reports'),
        where('reportedType', '==', entityType),
        where('reportedId', '==', entityId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(reportsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error fetching entity reports:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  static getCategoryConfig(reportedType, subcategory) {
    const typeCategories = this.REPORT_CATEGORIES[reportedType.toUpperCase()];
    return typeCategories?.[subcategory] || null;
  }

  static calculatePriority(severity) {
    const priorityMap = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    return priorityMap[severity] || 3;
  }

  static generateReportHash(reporterId, reportedType, reportedId, category) {
    return btoa(`${reporterId}-${reportedType}-${reportedId}-${category}`).slice(0, 16);
  }

  static getEstimatedReviewTime(severity) {
    const timeMap = {
      'critical': '1-2 hours',
      'high': '4-8 hours',
      'medium': '1-2 days',
      'low': '3-5 days'
    };
    return timeMap[severity] || '1-2 days';
  }

  static getDeviceInfo() {
    // In a real app, this would get actual device info
    return {
      platform: 'mobile',
      userAgent: navigator.userAgent || 'unknown'
    };
  }

  static getAppVersion() {
    return '1.0.0'; // This would come from app config
  }

  static async logAutoAction(action, entityId, reportId) {
    try {
      await addDoc(collection(db, 'auto_actions'), {
        action,
        entityId,
        reportId,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging auto action:', error);
    }
  }

  static async queueForReview(reportId, priority) {
    try {
      await addDoc(collection(db, 'review_queue'), {
        reportId,
        priority,
        status: 'queued',
        queuedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error queuing for review:', error);
    }
  }

  static async autoEscalateReport(reportId) {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status: this.REPORT_STATUS.ESCALATED,
        escalatedAt: serverTimestamp(),
        priority: 1 // Highest priority
      });
    } catch (error) {
      console.error('Error escalating report:', error);
    }
  }

  static async sendReportNotifications(reportId, reportData) {
    // Implementation would depend on notification service
    // This is a placeholder for notification logic
    console.log('Sending report notifications for:', reportId);
  }

  static async logReportAnalytics(reportData) {
    try {
      await addDoc(collection(db, 'report_analytics'), {
        category: reportData.category,
        subcategory: reportData.subcategory,
        severity: reportData.severity,
        reportedType: reportData.reportedType,
        timestamp: serverTimestamp(),
        anonymous: reportData.anonymous
      });
    } catch (error) {
      console.error('Error logging report analytics:', error);
    }
  }
}
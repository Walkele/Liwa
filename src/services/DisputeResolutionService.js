import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AntiFraudService } from './AntiFraudService';
import { TradeSecurityService } from './TradeSecurityService';

export class DisputeResolutionService {
  
  // Dispute categories and severity levels
  static DISPUTE_CATEGORIES = {
    ITEM_NOT_RECEIVED: {
      id: 'item_not_received',
      name: 'Item Not Received',
      description: 'Buyer claims item was not delivered',
      severity: 'high',
      autoResolutionEligible: true
    },
    ITEM_NOT_AS_DESCRIBED: {
      id: 'item_not_as_described',
      name: 'Item Not as Described',
      description: 'Item condition or features differ from listing',
      severity: 'high',
      autoResolutionEligible: false
    },
    PAYMENT_ISSUES: {
      id: 'payment_issues',
      name: 'Payment Issues',
      description: 'Problems with payment processing or refunds',
      severity: 'medium',
      autoResolutionEligible: true
    },
    SELLER_NO_SHOW: {
      id: 'seller_no_show',
      name: 'Seller No Show',
      description: 'Seller failed to appear for arranged meeting',
      severity: 'high',
      autoResolutionEligible: true
    },
    BUYER_NO_SHOW: {
      id: 'buyer_no_show',
      name: 'Buyer No Show',
      description: 'Buyer failed to appear for arranged meeting',
      severity: 'high',
      autoResolutionEligible: true
    },
    COMMUNICATION_ISSUES: {
      id: 'communication_issues',
      name: 'Communication Issues',
      description: 'Problems with buyer-seller communication',
      severity: 'low',
      autoResolutionEligible: true
    },
    SAFETY_CONCERNS: {
      id: 'safety_concerns',
      name: 'Safety Concerns',
      description: 'Safety-related issues during trade',
      severity: 'critical',
      autoResolutionEligible: false
    },
    OTHER: {
      id: 'other',
      name: 'Other',
      description: 'Other dispute reasons',
      severity: 'medium',
      autoResolutionEligible: false
    }
  };

  // Dispute status workflow
  static DISPUTE_STATUS = {
    FILED: 'filed',
    UNDER_REVIEW: 'under_review',
    EVIDENCE_REQUESTED: 'evidence_requested',
    MEDIATION: 'mediation',
    AWAITING_RESPONSE: 'awaiting_response',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    ESCALATED: 'escalated'
  };

  // Resolution types
  static RESOLUTION_TYPES = {
    FULL_REFUND: 'full_refund',
    PARTIAL_REFUND: 'partial_refund',
    ITEM_RETURN: 'item_return',
    CANCEL_TRADE: 'cancel_trade',
    COMPENSATION: 'compensation',
    NO_ACTION: 'no_action',
    MUTUAL_AGREEMENT: 'mutual_agreement'
  };

  // Create a new dispute
  static async createDispute(disputeData) {
    try {
      console.log('📋 Creating new dispute:', disputeData);

      const { tradeId, reporterId, reportedUserId, category, description, evidence = [] } = disputeData;

      // Validate required fields
      if (!tradeId || !reporterId || !reportedUserId || !category || !description) {
        throw new Error('Missing required dispute fields');
      }

      // Check if dispute already exists for this trade
      const existingDisputes = await this.getDisputesByTrade(tradeId);
      if (existingDisputes.length > 0) {
        throw new Error('A dispute already exists for this trade');
      }

      // Get trade details
      const tradeRef = doc(db, 'trades', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }

      const tradeData = tradeDoc.data();

      // Create dispute record
      const disputeRef = await addDoc(collection(db, 'disputes'), {
        tradeId,
        tradeDetails: {
          itemId: tradeData.itemId,
          totalValue: tradeData.totalValue,
          participants: tradeData.participants,
          status: tradeData.status
        },
        reporterId,
        reportedUserId,
        category,
        categoryName: this.DISPUTE_CATEGORIES[category]?.name || category,
        description,
        evidence,
        status: this.DISPUTE_STATUS.FILED,
        severity: this.DISPUTE_CATEGORIES[category]?.severity || 'medium',
        resolutionType: null,
        resolutionDetails: null,
        timeline: [{
          action: 'dispute_filed',
          userId: reporterId,
          timestamp: serverTimestamp(),
          details: 'Dispute filed by user'
        }],
        autoResolutionEligible: this.DISPUTE_CATEGORIES[category]?.autoResolutionEligible || false,
        slaDeadline: this.calculateSLADeadline(this.DISPUTE_CATEGORIES[category]?.severity),
        priority: this.calculatePriority(this.DISPUTE_CATEGORIES[category]?.severity),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update trade status to indicate dispute
      await updateDoc(tradeRef, {
        disputeId: disputeRef.id,
        disputeStatus: this.DISPUTE_STATUS.FILED,
        hasDispute: true,
        updatedAt: serverTimestamp()
      });

      // Notify the other party
      await this.notifyDisputeFiled(reportedUserId, disputeRef.id, tradeId, category);

      // Check for auto-resolution eligibility
      if (this.DISPUTE_CATEGORIES[category]?.autoResolutionEligible) {
        await this.attemptAutoResolution(disputeRef.id, disputeData);
      }

      console.log('✅ Dispute created successfully:', disputeRef.id);
      return { success: true, disputeId: disputeRef.id };

    } catch (error) {
      console.error('❌ Error creating dispute:', error);
      throw error;
    }
  }

  // Add evidence to a dispute
  static async addEvidence(disputeId, evidenceData) {
    try {
      console.log('📎 Adding evidence to dispute:', disputeId);

      const disputeRef = doc(db, 'disputes', disputeId);
      const disputeDoc = await getDoc(disputeRef);

      if (!disputeDoc.exists()) {
        throw new Error('Dispute not found');
      }

      const disputeData = disputeDoc.data();

      // Validate evidence
      const validatedEvidence = this.validateEvidence(evidenceData);

      // Add evidence to dispute
      await updateDoc(disputeRef, {
        evidence: arrayUnion(validatedEvidence),
        updatedAt: serverTimestamp(),
        timeline: arrayUnion({
          action: 'evidence_added',
          userId: evidenceData.submittedBy,
          timestamp: serverTimestamp(),
          details: `Evidence added: ${validatedEvidence.type}`,
          evidenceId: validatedEvidence.id
        })
      });

      console.log('✅ Evidence added successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error adding evidence:', error);
      throw error;
    }
  }

  // Validate evidence data
  static validateEvidence(evidenceData) {
    const requiredFields = ['type', 'submittedBy', 'data'];
    
    for (const field of requiredFields) {
      if (!evidenceData[field]) {
        throw new Error(`Missing required evidence field: ${field}`);
      }
    }

    const validTypes = ['photo', 'chat_log', 'document', 'screenshot', 'other'];
    if (!validTypes.includes(evidenceData.type)) {
      throw new Error(`Invalid evidence type: ${evidenceData.type}`);
    }

    return {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: evidenceData.type,
      submittedBy: evidenceData.submittedBy,
      data: evidenceData.data,
      description: evidenceData.description || '',
      submittedAt: serverTimestamp(),
      verified: false
    };
  }

  // Attempt automatic resolution for eligible disputes
  static async attemptAutoResolution(disputeId, disputeData) {
    try {
      console.log('🤖 Attempting auto-resolution for dispute:', disputeId);

      const disputeRef = doc(db, 'disputes', disputeId);
      const disputeDoc = await getDoc(disputeRef);
      const dispute = disputeDoc.data();

      // Check if auto-resolution is possible based on category
      if (!dispute.autoResolutionEligible) {
        return { autoResolved: false, reason: 'Not eligible for auto-resolution' };
      }

      // Implement auto-resolution logic based on category
      let resolutionResult;

      switch (dispute.category) {
        case 'seller_no_show':
        case 'buyer_no_show':
          resolutionResult = await this.autoResolveNoShow(dispute);
          break;
        case 'communication_issues':
          resolutionResult = await this.autoResolveCommunicationIssue(dispute);
          break;
        case 'payment_issues':
          resolutionResult = await this.autoResolvePaymentIssue(dispute);
          break;
        default:
          resolutionResult = { autoResolved: false, reason: 'No auto-resolution rule' };
      }

      if (resolutionResult.autoResolved) {
        await this.applyResolution(disputeId, resolutionResult.resolution, 'automatic');
        return resolutionResult;
      }

      return resolutionResult;

    } catch (error) {
      console.error('❌ Error in auto-resolution:', error);
      return { autoResolved: false, reason: 'Auto-resolution failed' };
    }
  }

  // Auto-resolve no-show cases
  static async autoResolveNoShow(dispute) {
    try {
      // Check trade confirmation data
      const tradeRef = doc(db, 'trades', dispute.tradeId);
      const tradeDoc = await getDoc(tradeRef);
      const trade = tradeDoc.data();

      // If meeting was confirmed but one party didn't show
      if (trade.meetingConfirmed && trade.noShowReported) {
        return {
          autoResolved: true,
          resolution: {
            type: this.RESOLUTION_TYPES.CANCEL_TRADE,
            details: 'Trade cancelled due to no-show',
            actionAgainst: dispute.category === 'seller_no_show' ? dispute.reportedUserId : dispute.reporterId,
            penaltyLevel: 'MINOR'
          }
        };
      }

      return { autoResolved: false, reason: 'Insufficient evidence for auto-resolution' };

    } catch (error) {
      console.error('❌ Error auto-resolving no-show:', error);
      return { autoResolved: false, reason: 'Auto-resolution error' };
    }
  }

  // Auto-resolve communication issues
  static async autoResolveCommunicationIssue(dispute) {
    try {
      // Check if there's minimal chat activity
      const messagesQuery = query(
        collection(db, 'messages'),
        where('tradeId', '==', dispute.tradeId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (messagesSnapshot.size < 3) {
        return {
          autoResolved: true,
          resolution: {
            type: this.RESOLUTION_TYPES.CANCEL_TRADE,
            details: 'Trade cancelled due to lack of communication',
            actionAgainst: 'both_parties',
            penaltyLevel: 'WARNING'
          }
        };
      }

      return { autoResolved: false, reason: 'Sufficient communication exists' };

    } catch (error) {
      console.error('❌ Error auto-resolving communication issue:', error);
      return { autoResolved: false, reason: 'Auto-resolution error' };
    }
  }

  // Auto-resolve payment issues
  static async autoResolvePaymentIssue(dispute) {
    try {
      // Check payment status from trade data
      const tradeRef = doc(db, 'trades', dispute.tradeId);
      const tradeDoc = await getDoc(tradeRef);
      const trade = tradeDoc.data();

      if (trade.paymentStatus === 'failed' || trade.paymentStatus === 'pending') {
        return {
          autoResolved: true,
          resolution: {
            type: this.RESOLUTION_TYPES.CANCEL_TRADE,
            details: 'Trade cancelled due to payment issues',
            actionAgainst: 'none',
            penaltyLevel: 'WARNING'
          }
        };
      }

      return { autoResolved: false, reason: 'Payment status unclear' };

    } catch (error) {
      console.error('❌ Error auto-resolving payment issue:', error);
      return { autoResolved: false, reason: 'Auto-resolution error' };
    }
  }

  // Apply resolution to dispute
  static async applyResolution(disputeId, resolution, resolvedBy = 'admin') {
    try {
      console.log('⚖️ Applying resolution to dispute:', disputeId);

      const disputeRef = doc(db, 'disputes', disputeId);
      const disputeDoc = await getDoc(disputeRef);
      const dispute = disputeDoc.data();

      // Update dispute status
      await updateDoc(disputeRef, {
        status: this.DISPUTE_STATUS.RESOLVED,
        resolutionType: resolution.type,
        resolutionDetails: resolution.details,
        resolvedBy,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        timeline: arrayUnion({
          action: 'dispute_resolved',
          userId: resolvedBy === 'admin' ? 'system' : resolvedBy,
          timestamp: serverTimestamp(),
          details: `Dispute resolved: ${resolution.type}`,
          resolution: resolution
        })
      });

      // Update trade status
      const tradeRef = doc(db, 'trades', dispute.tradeId);
      await updateDoc(tradeRef, {
        disputeStatus: this.DISPUTE_STATUS.RESOLVED,
        disputeResolution: resolution,
        updatedAt: serverTimestamp()
      });

      // Apply penalties if specified
      if (resolution.penaltyLevel && resolution.actionAgainst && resolution.actionAgainst !== 'none') {
        if (resolution.actionAgainst === 'both_parties') {
          await Promise.all([
            AntiFraudService.recordViolation(dispute.reporterId, 'TRADE_ABANDONMENT', { disputeId }),
            AntiFraudService.recordViolation(dispute.reportedUserId, 'TRADE_ABANDONMENT', { disputeId })
          ]);
        } else {
          const targetUserId = resolution.actionAgainst === dispute.reporterId ? dispute.reporterId : dispute.reportedUserId;
          await AntiFraudService.recordViolation(targetUserId, 'TRADE_ABANDONMENT', { disputeId });
        }
      }

      // Notify both parties
      await Promise.all([
        this.notifyDisputeResolved(dispute.reporterId, disputeId, resolution),
        this.notifyDisputeResolved(dispute.reportedUserId, disputeId, resolution)
      ]);

      console.log('✅ Resolution applied successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error applying resolution:', error);
      throw error;
    }
  }

  // Get disputes by trade ID
  static async getDisputesByTrade(tradeId) {
    try {
      const disputesQuery = query(
        collection(db, 'disputes'),
        where('tradeId', '==', tradeId)
      );
      const snapshot = await getDocs(disputesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error getting disputes by trade:', error);
      return [];
    }
  }

  // Get disputes for a user
  static async getUserDisputes(userId, status = null) {
    try {
      let disputesQuery = query(
        collection(db, 'disputes'),
        where('reporterId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (status) {
        disputesQuery = query(
          collection(db, 'disputes'),
          where('reporterId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(disputesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error getting user disputes:', error);
      return [];
    }
  }

  // Get all disputes (for admin)
  static async getAllDisputes(filters = {}) {
    try {
      let disputesQuery = query(
        collection(db, 'disputes'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(disputesQuery);
      let disputes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Apply filters
      if (filters.status) {
        disputes = disputes.filter(d => d.status === filters.status);
      }
      if (filters.severity) {
        disputes = disputes.filter(d => d.severity === filters.severity);
      }
      if (filters.category) {
        disputes = disputes.filter(d => d.category === filters.category);
      }

      return disputes;
    } catch (error) {
      console.error('❌ Error getting all disputes:', error);
      return [];
    }
  }

  // Escalate dispute to higher level
  static async escalateDispute(disputeId, reason, escalatedBy) {
    try {
      console.log('⬆️ Escalating dispute:', disputeId);

      const disputeRef = doc(db, 'disputes', disputeId);
      await updateDoc(disputeRef, {
        status: this.DISPUTE_STATUS.ESCALATED,
        escalationReason: reason,
        escalatedBy,
        escalatedAt: serverTimestamp(),
        priority: 'critical',
        updatedAt: serverTimestamp(),
        timeline: arrayUnion({
          action: 'dispute_escalated',
          userId: escalatedBy,
          timestamp: serverTimestamp(),
          details: `Dispute escalated: ${reason}`
        })
      });

      console.log('✅ Dispute escalated successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error escalating dispute:', error);
      throw error;
    }
  }

  // Calculate SLA deadline based on severity
  static calculateSLADeadline(severity) {
    const now = new Date();
    let deadline;

    switch (severity) {
      case 'critical':
        deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'high':
        deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
        break;
      case 'medium':
        deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
        break;
      case 'low':
        deadline = new Date(now.getTime() + 120 * 60 * 60 * 1000); // 5 days
        break;
      default:
        deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    }

    return deadline;
  }

  // Calculate priority based on severity
  static calculatePriority(severity) {
    const priorityMap = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return priorityMap[severity] || 'medium';
  }

  // Notification methods
  static async notifyDisputeFiled(userId, disputeId, tradeId, category) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'dispute_filed',
        title: 'Dispute Filed',
        message: `A dispute has been filed against your trade. Category: ${this.DISPUTE_CATEGORIES[category]?.name || category}`,
        disputeId,
        tradeId,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('❌ Error sending dispute notification:', error);
    }
  }

  static async notifyDisputeResolved(userId, disputeId, resolution) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `Your dispute has been resolved. Resolution: ${resolution.type}`,
        disputeId,
        resolution,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('❌ Error sending resolution notification:', error);
    }
  }

  // Get dispute statistics
  static async getDisputeStatistics(timeRange = '30d') {
    try {
      const { startDate, endDate } = this.getDateRange(timeRange);

      const disputesQuery = query(
        collection(db, 'disputes'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );

      const snapshot = await getDocs(disputesQuery);
      const disputes = snapshot.docs.map(doc => doc.data());

      const stats = {
        total: disputes.length,
        byStatus: {},
        byCategory: {},
        bySeverity: {},
        autoResolved: disputes.filter(d => d.resolvedBy === 'automatic').length,
        manuallyResolved: disputes.filter(d => d.resolvedBy === 'admin').length,
        averageResolutionTime: this.calculateAverageResolutionTime(disputes)
      };

      disputes.forEach(dispute => {
        stats.byStatus[dispute.status] = (stats.byStatus[dispute.status] || 0) + 1;
        stats.byCategory[dispute.category] = (stats.byCategory[dispute.category] || 0) + 1;
        stats.bySeverity[dispute.severity] = (stats.bySeverity[dispute.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting dispute statistics:', error);
      return {};
    }
  }

  // Helper: Calculate average resolution time
  static calculateAverageResolutionTime(disputes) {
    const resolvedDisputes = disputes.filter(d => d.resolvedAt);
    if (resolvedDisputes.length === 0) return null;

    const totalTime = resolvedDisputes.reduce((sum, dispute) => {
      const created = dispute.createdAt?.toDate?.() || new Date();
      const resolved = dispute.resolvedAt?.toDate?.() || new Date();
      return sum + (resolved - created);
    }, 0);

    const avgMs = totalTime / resolvedDisputes.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    return `${hours}h`;
  }

  // Helper: Get date range
  static getDateRange(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }
}

export default DisputeResolutionService;
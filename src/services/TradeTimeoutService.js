import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Service for managing trade timeouts and automatic cancellations
 * Prevents users from being stuck waiting indefinitely
 */
export class TradeTimeoutService {
  
  // Timeout durations in minutes for each step
  static STEP_TIMEOUTS = {
    seller_commit: 5,
    contact_exchange: 10,
    meeting_arranged: 30,
    exchange_started: 60,
    trade_completed: 15
  };

  /**
   * Start a timeout timer for a trade step
   */
  static async startStepTimeout(conversationId, stepId, userId, acceptedTradeId) {
    try {
      const timeoutMinutes = this.STEP_TIMEOUTS[stepId] || 30;
      const timeoutAt = new Date(Date.now() + (timeoutMinutes * 60 * 1000));
      
      console.log(`⏰ Starting ${timeoutMinutes}min timeout for step ${stepId} in conversation ${conversationId}`);
      
      // Create timeout record
      const timeoutData = {
        conversationId,
        stepId,
        userId,
        acceptedTradeId,
        timeoutAt,
        timeoutMinutes,
        status: 'active',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'tradeTimeouts'), timeoutData);
      
      // Create warning message
      await addDoc(collection(db, 'messages'), {
        conversationId,
        messageType: 'timeout_warning',
        senderId: 'system',
        text: `⏰ Timeout started: ${timeoutMinutes} minutes to respond or trade will auto-cancel`,
        createdAt: serverTimestamp(),
        timeoutMinutes,
        stepId,
        isSystemMessage: true
      });
      
      return timeoutData;
      
    } catch (error) {
      console.error('Error starting step timeout:', error);
      throw error;
    }
  }

  /**
   * Cancel a timeout when user responds
   */
  static async cancelStepTimeout(conversationId, stepId) {
    try {
      console.log(`✅ Cancelling timeout for step ${stepId} in conversation ${conversationId}`);
      
      // Find and cancel active timeouts for this step
      const timeoutQuery = query(
        collection(db, 'tradeTimeouts'),
        where('conversationId', '==', conversationId),
        where('stepId', '==', stepId),
        where('status', '==', 'active')
      );
      
      const timeoutSnapshot = await getDocs(timeoutQuery);
      
      for (const timeoutDoc of timeoutSnapshot.docs) {
        await updateDoc(doc(db, 'tradeTimeouts', timeoutDoc.id), {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        });
      }
      
      console.log(`✅ Cancelled ${timeoutSnapshot.docs.length} timeouts for step ${stepId}`);
      
    } catch (error) {
      console.error('Error cancelling step timeout:', error);
      throw error;
    }
  }

  /**
   * Check for expired timeouts and auto-cancel trades
   * This would typically be called by a background service or cloud function
   */
  static async processExpiredTimeouts() {
    try {
      const now = new Date();
      
      // Find expired timeouts
      const expiredQuery = query(
        collection(db, 'tradeTimeouts'),
        where('status', '==', 'active'),
        where('timeoutAt', '<=', now)
      );
      
      const expiredSnapshot = await getDocs(expiredQuery);
      
      console.log(`🔍 Found ${expiredSnapshot.docs.length} expired timeouts to process`);
      
      for (const timeoutDoc of expiredSnapshot.docs) {
        const timeoutData = timeoutDoc.data();
        await this.cancelTradeForTimeout(timeoutData, timeoutDoc.id);
      }
      
    } catch (error) {
      console.error('Error processing expired timeouts:', error);
      throw error;
    }
  }

  /**
   * Cancel a trade due to timeout
   */
  static async cancelTradeForTimeout(timeoutData, timeoutDocId) {
    try {
      const { conversationId, stepId, timeoutMinutes, acceptedTradeId } = timeoutData;
      
      console.log(`❌ Auto-cancelling trade due to timeout: ${stepId} (${timeoutMinutes}min)`);
      
      // Mark timeout as processed
      await updateDoc(doc(db, 'tradeTimeouts', timeoutDocId), {
        status: 'expired',
        processedAt: serverTimestamp()
      });
      
      // Cancel the accepted trade
      if (acceptedTradeId) {
        await updateDoc(doc(db, 'messages', acceptedTradeId), {
          status: 'cancelled_timeout',
          cancelledAt: serverTimestamp(),
          cancelReason: `Timeout: No response within ${timeoutMinutes} minutes for ${stepId}`
        });
      }
      
      // Create cancellation message
      await addDoc(collection(db, 'messages'), {
        conversationId,
        messageType: 'trade_cancelled',
        senderId: 'system',
        text: `❌ Trade auto-cancelled: No response within ${timeoutMinutes} minutes for "${this.getStepDisplayName(stepId)}"`,
        createdAt: serverTimestamp(),
        cancelReason: 'timeout',
        stepId,
        timeoutMinutes,
        isSystemMessage: true
      });
      
      // Cancel any other active timeouts for this conversation
      const otherTimeoutsQuery = query(
        collection(db, 'tradeTimeouts'),
        where('conversationId', '==', conversationId),
        where('status', '==', 'active')
      );
      
      const otherTimeoutsSnapshot = await getDocs(otherTimeoutsQuery);
      
      for (const otherTimeoutDoc of otherTimeoutsSnapshot.docs) {
        await updateDoc(doc(db, 'tradeTimeouts', otherTimeoutDoc.id), {
          status: 'cancelled_trade_ended',
          cancelledAt: serverTimestamp()
        });
      }
      
      console.log(`❌ Trade cancelled and ${otherTimeoutsSnapshot.docs.length} other timeouts cancelled`);
      
    } catch (error) {
      console.error('Error cancelling trade for timeout:', error);
      throw error;
    }
  }

  /**
   * Get display name for step ID
   */
  static getStepDisplayName(stepId) {
    const stepNames = {
      seller_commit: 'Commit to Trade',
      contact_exchange: 'Share Contact Info',
      meeting_arranged: 'Arrange Meeting',
      exchange_started: 'Start Exchange',
      trade_completed: 'Complete Trade'
    };
    
    return stepNames[stepId] || stepId;
  }

  /**
   * Get remaining time for a step timeout
   */
  static async getRemainingTime(conversationId, stepId) {
    try {
      const timeoutQuery = query(
        collection(db, 'tradeTimeouts'),
        where('conversationId', '==', conversationId),
        where('stepId', '==', stepId),
        where('status', '==', 'active')
      );
      
      const timeoutSnapshot = await getDocs(timeoutQuery);
      
      if (timeoutSnapshot.empty) {
        return null;
      }
      
      const timeoutData = timeoutSnapshot.docs[0].data();
      const timeoutAt = timeoutData.timeoutAt.toDate();
      const now = new Date();
      const remainingMs = timeoutAt.getTime() - now.getTime();
      
      if (remainingMs <= 0) {
        return { expired: true, remainingMinutes: 0 };
      }
      
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      
      return {
        expired: false,
        remainingMinutes,
        totalMinutes: timeoutData.timeoutMinutes,
        timeoutAt
      };
      
    } catch (error) {
      console.error('Error getting remaining time:', error);
      return null;
    }
  }
}

export default TradeTimeoutService;
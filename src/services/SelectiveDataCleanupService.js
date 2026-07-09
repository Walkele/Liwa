import { 
  collection, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  query,
  where,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class SelectiveDataCleanupService {
  
  // Clean all transactional data while preserving users and items
  static async cleanTransactionalData() {
    try {
      console.log('🧹 Starting selective cleanup - preserving users and items');
      
      const results = {
        conversations: 0,
        messages: 0,
        offers: 0,
        tradeProposals: 0,
        trades: 0,
        waitlists: 0,
        safetyHandshakes: 0,
        notifications: 0,
        reviews: 0,
        disputes: 0,
        emergencyAlerts: 0,
        total: 0
      };

      // Clean conversations
      console.log('🗑️ Cleaning conversations...');
      const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
      const conversationsBatch = writeBatch(db);
      conversationsSnapshot.forEach(doc => {
        conversationsBatch.delete(doc.ref);
        results.conversations++;
      });
      if (results.conversations > 0) {
        await conversationsBatch.commit();
      }

      // Clean messages
      console.log('🗑️ Cleaning messages...');
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      const messagesBatch = writeBatch(db);
      messagesSnapshot.forEach(doc => {
        messagesBatch.delete(doc.ref);
        results.messages++;
      });
      if (results.messages > 0) {
        await messagesBatch.commit();
      }

      // Clean offers
      console.log('🗑️ Cleaning offers...');
      const offersSnapshot = await getDocs(collection(db, 'offers'));
      const offersBatch = writeBatch(db);
      offersSnapshot.forEach(doc => {
        offersBatch.delete(doc.ref);
        results.offers++;
      });
      if (results.offers > 0) {
        await offersBatch.commit();
      }

      // Clean trade proposals
      console.log('🗑️ Cleaning trade proposals...');
      const tradeProposalsSnapshot = await getDocs(collection(db, 'tradeProposals'));
      const tradeProposalsBatch = writeBatch(db);
      tradeProposalsSnapshot.forEach(doc => {
        tradeProposalsBatch.delete(doc.ref);
        results.tradeProposals++;
      });
      if (results.tradeProposals > 0) {
        await tradeProposalsBatch.commit();
      }

      // Clean trades
      console.log('🗑️ Cleaning trades...');
      const tradesSnapshot = await getDocs(collection(db, 'trades'));
      const tradesBatch = writeBatch(db);
      tradesSnapshot.forEach(doc => {
        tradesBatch.delete(doc.ref);
        results.trades++;
      });
      if (results.trades > 0) {
        await tradesBatch.commit();
      }

      // Clean waitlists (Phase 1 feature)
      console.log('🗑️ Cleaning waitlists...');
      const waitlistsSnapshot = await getDocs(collection(db, 'waitlists'));
      const waitlistsBatch = writeBatch(db);
      waitlistsSnapshot.forEach(doc => {
        waitlistsBatch.delete(doc.ref);
        results.waitlists++;
      });
      if (results.waitlists > 0) {
        await waitlistsBatch.commit();
      }

      // Clean safety handshakes (Phase 1 feature)
      console.log('🗑️ Cleaning safety handshakes...');
      const safetyHandshakesSnapshot = await getDocs(collection(db, 'safetyHandshakes'));
      const safetyHandshakesBatch = writeBatch(db);
      safetyHandshakesSnapshot.forEach(doc => {
        safetyHandshakesBatch.delete(doc.ref);
        results.safetyHandshakes++;
      });
      if (results.safetyHandshakes > 0) {
        await safetyHandshakesBatch.commit();
      }

      // Clean notifications
      console.log('🗑️ Cleaning notifications...');
      const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
      const notificationsBatch = writeBatch(db);
      notificationsSnapshot.forEach(doc => {
        notificationsBatch.delete(doc.ref);
        results.notifications++;
      });
      if (results.notifications > 0) {
        await notificationsBatch.commit();
      }

      // Clean reviews
      console.log('🗑️ Cleaning reviews...');
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
      const reviewsBatch = writeBatch(db);
      reviewsSnapshot.forEach(doc => {
        reviewsBatch.delete(doc.ref);
        results.reviews++;
      });
      if (results.reviews > 0) {
        await reviewsBatch.commit();
      }

      // Clean disputes
      console.log('🗑️ Cleaning disputes...');
      const disputesSnapshot = await getDocs(collection(db, 'disputes'));
      const disputesBatch = writeBatch(db);
      disputesSnapshot.forEach(doc => {
        disputesBatch.delete(doc.ref);
        results.disputes++;
      });
      if (results.disputes > 0) {
        await disputesBatch.commit();
      }

      // Clean emergency alerts
      console.log('🗑️ Cleaning emergency alerts...');
      const emergencyAlertsSnapshot = await getDocs(collection(db, 'emergencyAlerts'));
      const emergencyAlertsBatch = writeBatch(db);
      emergencyAlertsSnapshot.forEach(doc => {
        emergencyAlertsBatch.delete(doc.ref);
        results.emergencyAlerts++;
      });
      if (results.emergencyAlerts > 0) {
        await emergencyAlertsBatch.commit();
      }

      // Calculate total
      results.total = Object.values(results).reduce((sum, count) => {
        return typeof count === 'number' ? sum + count : sum;
      }, 0) - results.total; // Subtract the total field itself

      console.log('✅ Selective cleanup complete!');
      console.log('📊 Cleanup results:', results);
      
      return {
        success: true,
        results: results,
        preserved: ['users', 'items'],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error during selective cleanup:', error);
      throw error;
    }
  }

  // Clean specific user's transactional data only
  static async cleanUserTransactionalData(userId) {
    try {
      console.log(`🧹 Cleaning transactional data for user: ${userId}`);
      
      const results = {
        conversations: 0,
        messages: 0,
        offers: 0,
        tradeProposals: 0,
        waitlists: 0,
        notifications: 0,
        total: 0
      };

      // Clean user's conversations
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);
      const conversationsBatch = writeBatch(db);
      conversationsSnapshot.forEach(doc => {
        conversationsBatch.delete(doc.ref);
        results.conversations++;
      });
      if (results.conversations > 0) {
        await conversationsBatch.commit();
      }

      // Clean user's messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', userId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesBatch = writeBatch(db);
      messagesSnapshot.forEach(doc => {
        messagesBatch.delete(doc.ref);
        results.messages++;
      });
      if (results.messages > 0) {
        await messagesBatch.commit();
      }

      // Clean user's offers
      const offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userId)
      );
      const offersSnapshot = await getDocs(offersQuery);
      const offersBatch = writeBatch(db);
      offersSnapshot.forEach(doc => {
        offersBatch.delete(doc.ref);
        results.offers++;
      });
      if (results.offers > 0) {
        await offersBatch.commit();
      }

      // Clean user's trade proposals
      const tradeProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userId)
      );
      const tradeProposalsSnapshot = await getDocs(tradeProposalsQuery);
      const tradeProposalsBatch = writeBatch(db);
      tradeProposalsSnapshot.forEach(doc => {
        tradeProposalsBatch.delete(doc.ref);
        results.tradeProposals++;
      });
      if (results.tradeProposals > 0) {
        await tradeProposalsBatch.commit();
      }

      // Clean user's waitlist entries
      const waitlistsQuery = query(
        collection(db, 'waitlists'),
        where('userId', '==', userId)
      );
      const waitlistsSnapshot = await getDocs(waitlistsQuery);
      const waitlistsBatch = writeBatch(db);
      waitlistsSnapshot.forEach(doc => {
        waitlistsBatch.delete(doc.ref);
        results.waitlists++;
      });
      if (results.waitlists > 0) {
        await waitlistsBatch.commit();
      }

      // Clean user's notifications
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notificationsBatch = writeBatch(db);
      notificationsSnapshot.forEach(doc => {
        notificationsBatch.delete(doc.ref);
        results.notifications++;
      });
      if (results.notifications > 0) {
        await notificationsBatch.commit();
      }

      // Calculate total
      results.total = Object.values(results).reduce((sum, count) => {
        return typeof count === 'number' ? sum + count : sum;
      }, 0) - results.total;

      console.log(`✅ User transactional data cleanup complete for: ${userId}`);
      
      return {
        success: true,
        userId: userId,
        results: results,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Error cleaning user transactional data for ${userId}:`, error);
      throw error;
    }
  }

  // Reset item statuses to available
  static async resetItemStatuses() {
    try {
      console.log('🔄 Resetting all item statuses to available...');
      
      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const itemsBatch = writeBatch(db);
      let resetCount = 0;
      
      itemsSnapshot.forEach(docSnapshot => {
        const itemData = docSnapshot.data();
        if (itemData.status !== 'available') {
          itemsBatch.update(docSnapshot.ref, {
            status: 'available',
            lockedBy: null,
            lockedAt: null,
            waitlistCount: 0,
            hasWaitlist: false,
            lastStatusUpdate: new Date()
          });
          resetCount++;
        }
      });
      
      if (resetCount > 0) {
        await itemsBatch.commit();
      }
      
      console.log(`✅ Reset ${resetCount} items to available status`);
      
      return {
        success: true,
        itemsReset: resetCount,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error resetting item statuses:', error);
      throw error;
    }
  }

  // Get cleanup statistics
  static async getCleanupStats() {
    try {
      const stats = {
        preserved: {
          users: 0,
          items: 0
        },
        transactional: {
          conversations: 0,
          messages: 0,
          offers: 0,
          tradeProposals: 0,
          trades: 0,
          waitlists: 0,
          safetyHandshakes: 0,
          notifications: 0,
          reviews: 0,
          disputes: 0,
          emergencyAlerts: 0
        }
      };

      // Count preserved data
      const usersSnapshot = await getDocs(collection(db, 'users'));
      stats.preserved.users = usersSnapshot.size;

      const itemsSnapshot = await getDocs(collection(db, 'items'));
      stats.preserved.items = itemsSnapshot.size;

      // Count transactional data
      const collections = [
        'conversations', 'messages', 'offers', 'tradeProposals', 'trades',
        'waitlists', 'safetyHandshakes', 'notifications', 'reviews', 
        'disputes', 'emergencyAlerts'
      ];

      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          stats.transactional[collectionName] = snapshot.size;
        } catch (error) {
          // Collection might not exist yet
          stats.transactional[collectionName] = 0;
        }
      }

      return stats;
      
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      return null;
    }
  }

  // Complete cleanup with item status reset
  static async completeSelectiveCleanup() {
    try {
      console.log('🚀 Starting complete selective cleanup...');
      
      // Step 1: Clean all transactional data
      const cleanupResults = await this.cleanTransactionalData();
      
      // Step 2: Reset item statuses
      const resetResults = await this.resetItemStatuses();
      
      // Step 3: Get final stats
      const finalStats = await this.getCleanupStats();
      
      const completeResults = {
        success: true,
        cleanup: cleanupResults.results,
        itemsReset: resetResults.itemsReset,
        finalStats: finalStats,
        timestamp: new Date().toISOString(),
        summary: {
          totalCleaned: cleanupResults.results.total,
          itemsReset: resetResults.itemsReset,
          usersPreserved: finalStats?.preserved.users || 0,
          itemsPreserved: finalStats?.preserved.items || 0
        }
      };
      
      console.log('🎉 Complete selective cleanup finished!');
      console.log('📊 Final results:', completeResults.summary);
      
      return completeResults;
      
    } catch (error) {
      console.error('❌ Error during complete selective cleanup:', error);
      throw error;
    }
  }
}
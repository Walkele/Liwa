import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UnifiedMessageService } from './UnifiedMessageService';

export class DatabaseMigrationService {
  
  // Migrate existing messages to use standardized status fields
  static async migrateMessageStatusFields() {
    try {
      console.log('🔄 Starting message status field migration...');
      
      const messagesQuery = query(collection(db, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      let migratedCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        
        // Check if message needs migration
        if (messageData.isSystemMessage && messageData.messageType) {
          const needsMigration = !messageData.status || !messageData.tradeStatus;
          
          if (needsMigration) {
            // Determine status from message text
            let status = UnifiedMessageService.STATUS.PENDING;
            
            if (messageData.text.includes('accepted')) {
              status = UnifiedMessageService.STATUS.ACCEPTED;
            } else if (messageData.text.includes('declined')) {
              status = UnifiedMessageService.STATUS.DECLINED;
            } else if (messageData.text.includes('cancelled') || messageData.text.includes('cannot proceed')) {
              status = UnifiedMessageService.STATUS.CANCELLED;
            }
            
            // Update message with standardized fields
            await updateDoc(doc(db, 'messages', messageDoc.id), {
              status,
              tradeStatus: status, // Duplicate for backward compatibility
              migratedAt: serverTimestamp()
            });
            
            migratedCount++;
          }
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} messages with standardized status fields`);
      return { success: true, migratedCount };
      
    } catch (error) {
      console.error('❌ Error migrating message status fields:', error);
      throw error;
    }
  }
  
  // Standardize conversation IDs across all collections
  static async standardizeConversationIds() {
    try {
      console.log('🔄 Starting conversation ID standardization...');
      
      // Get all conversations
      const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
      const standardizedIds = new Map();
      
      for (const convDoc of conversationsSnapshot.docs) {
        const convData = convDoc.data();
        
        if (convData.participants && convData.participants.length === 2) {
          // Generate standardized ID
          const [user1, user2] = convData.participants.sort();
          const itemId = convData.itemId || 'unknown';
          const standardId = `${user1}_${user2}_${itemId}`;
          
          if (convDoc.id !== standardId) {
            standardizedIds.set(convDoc.id, standardId);
            
            // Create new conversation with standardized ID
            await setDoc(doc(db, 'conversations', standardId), {
              ...convData,
              id: standardId,
              migratedFrom: convDoc.id,
              migratedAt: serverTimestamp()
            });
            
            // Update messages to use new conversation ID
            await this.updateMessagesConversationId(convDoc.id, standardId);
            
            // Delete old conversation
            await deleteDoc(doc(db, 'conversations', convDoc.id));
          }
        }
      }
      
      console.log(`✅ Standardized ${standardizedIds.size} conversation IDs`);
      return { success: true, standardizedCount: standardizedIds.size };
      
    } catch (error) {
      console.error('❌ Error standardizing conversation IDs:', error);
      throw error;
    }
  }
  
  // Update messages to use new conversation ID
  static async updateMessagesConversationId(oldId, newId) {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', oldId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      for (const messageDoc of messagesSnapshot.docs) {
        await updateDoc(doc(db, 'messages', messageDoc.id), {
          conversationId: newId,
          conversationIdMigratedAt: serverTimestamp()
        });
      }
      
      console.log(`✅ Updated ${messagesSnapshot.docs.length} messages for conversation ${newId}`);
      
    } catch (error) {
      console.error('❌ Error updating messages conversation ID:', error);
      throw error;
    }
  }
  
  // Migrate existing trades to unified structure
  static async migrateToUnifiedTradeStructure() {
    try {
      console.log('🔄 Starting trade structure migration...');
      
      // Migrate from multiple collections to unified structure
      const collections = ['tradeProposals', 'offers', 'activeTrades'];
      let migratedCount = 0;
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          
          // Create unified trade record
          const unifiedTrade = {
            id: docSnapshot.id,
            originalCollection: collectionName,
            type: this.determineTradeType(data, collectionName),
            status: data.status || 'pending',
            sopState: data.sopState || 'offer_made',
            participants: this.extractParticipants(data),
            createdAt: data.createdAt || serverTimestamp(),
            migratedAt: serverTimestamp(),
            ...data
          };
          
          // Save to unified collection
          await setDoc(doc(db, 'unifiedTrades', docSnapshot.id), unifiedTrade);
          migratedCount++;
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} trades to unified structure`);
      return { success: true, migratedCount };
      
    } catch (error) {
      console.error('❌ Error migrating trade structure:', error);
      throw error;
    }
  }
  
  // Determine trade type from data and collection
  static determineTradeType(data, collectionName) {
    if (collectionName === 'offers' || data.offerAmount) {
      return 'cash_offer';
    } else if (data.proposerItemId && data.targetItemId) {
      return 'trade_proposal';
    } else if (data.serviceDescription) {
      return 'barter_proposal';
    } else {
      return 'unknown';
    }
  }
  
  // Extract participants from various data structures
  static extractParticipants(data) {
    if (data.participants) {
      return data.participants;
    } else if (data.proposerUserId && data.targetUserId) {
      return [data.proposerUserId, data.targetUserId];
    } else if (data.buyerId && data.sellerId) {
      return [data.buyerId, data.sellerId];
    } else {
      return [];
    }
  }
  
  // Clean up duplicate records
  static async cleanupDuplicateRecords() {
    try {
      console.log('🔄 Starting duplicate record cleanup...');
      
      const collections = ['conversations', 'messages', 'unifiedTrades'];
      let cleanedCount = 0;
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        const seenIds = new Set();
        const duplicates = [];
        
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          const uniqueKey = this.generateUniqueKey(data, collectionName);
          
          if (seenIds.has(uniqueKey)) {
            duplicates.push(docSnapshot.id);
          } else {
            seenIds.add(uniqueKey);
          }
        }
        
        // Delete duplicates
        for (const duplicateId of duplicates) {
          await deleteDoc(doc(db, collectionName, duplicateId));
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} duplicate records`);
      return { success: true, cleanedCount };
      
    } catch (error) {
      console.error('❌ Error cleaning up duplicates:', error);
      throw error;
    }
  }
  
  // Generate unique key for duplicate detection
  static generateUniqueKey(data, collectionName) {
    switch (collectionName) {
      case 'conversations':
        return `${data.participants?.sort().join('_')}_${data.itemId}`;
      case 'messages':
        return `${data.conversationId}_${data.senderId}_${data.text}_${data.createdAt?.seconds}`;
      case 'unifiedTrades':
        return `${data.participants?.sort().join('_')}_${data.type}_${data.createdAt?.seconds}`;
      default:
        return data.id || Math.random().toString();
    }
  }
  
  // Run complete migration
  static async runCompleteMigration() {
    try {
      console.log('🚀 Starting complete database migration...');
      
      const results = {
        messagesMigrated: 0,
        conversationsStandardized: 0,
        tradesUnified: 0,
        duplicatesCleaned: 0
      };
      
      // Step 1: Migrate message status fields
      const messageResult = await this.migrateMessageStatusFields();
      results.messagesMigrated = messageResult.migratedCount;
      
      // Step 2: Standardize conversation IDs
      const conversationResult = await this.standardizeConversationIds();
      results.conversationsStandardized = conversationResult.standardizedCount;
      
      // Step 3: Migrate to unified trade structure
      const tradeResult = await this.migrateToUnifiedTradeStructure();
      results.tradesUnified = tradeResult.migratedCount;
      
      // Step 4: Clean up duplicates
      const cleanupResult = await this.cleanupDuplicateRecords();
      results.duplicatesCleaned = cleanupResult.cleanedCount;
      
      console.log('✅ Complete database migration finished:', results);
      return { success: true, results };
      
    } catch (error) {
      console.error('❌ Error in complete migration:', error);
      throw error;
    }
  }
  
  // Validate migration results
  static async validateMigration() {
    try {
      console.log('🔍 Validating migration results...');
      
      const validation = {
        messagesWithStatus: 0,
        standardizedConversations: 0,
        unifiedTrades: 0,
        totalRecords: 0
      };
      
      // Check messages have proper status fields
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      for (const doc of messagesSnapshot.docs) {
        const data = doc.data();
        if (data.isSystemMessage && data.status && data.tradeStatus) {
          validation.messagesWithStatus++;
        }
      }
      
      // Check conversations have standardized IDs
      const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
      for (const doc of conversationsSnapshot.docs) {
        const data = doc.data();
        if (data.participants && data.participants.length === 2) {
          const [user1, user2] = data.participants.sort();
          const expectedId = `${user1}_${user2}_${data.itemId}`;
          if (doc.id === expectedId) {
            validation.standardizedConversations++;
          }
        }
      }
      
      // Check unified trades
      const tradesSnapshot = await getDocs(collection(db, 'unifiedTrades'));
      validation.unifiedTrades = tradesSnapshot.docs.length;
      
      validation.totalRecords = messagesSnapshot.docs.length + 
                               conversationsSnapshot.docs.length + 
                               tradesSnapshot.docs.length;
      
      console.log('✅ Migration validation results:', validation);
      return validation;
      
    } catch (error) {
      console.error('❌ Error validating migration:', error);
      throw error;
    }
  }
}
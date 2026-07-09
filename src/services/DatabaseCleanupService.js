import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export class DatabaseCleanupService {
  
  // Clean all test/mock data from the database
  static async cleanAllTestData() {
    try {
      console.log('🧹 Starting comprehensive database cleanup...');
      
      const results = {
        items: 0,
        conversations: 0,
        messages: 0,
        offers: 0,
        trades: 0,
        users: 0
      };
      
      // Clean test items
      results.items = await this.cleanTestItems();
      
      // Clean test conversations
      results.conversations = await this.cleanTestConversations();
      
      // Clean test messages
      results.messages = await this.cleanTestMessages();
      
      // Clean test offers
      results.offers = await this.cleanTestOffers();
      
      // Clean test trades
      results.trades = await this.cleanTestTrades();
      
      // Clean test users (optional - be careful with this)
      // results.users = await this.cleanTestUsers();
      
      console.log('✅ Database cleanup completed:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Error during database cleanup:', error);
      throw error;
    }
  }
  
  // Clean test items (items with test patterns in ID or title)
  static async cleanTestItems() {
    try {
      console.log('🧹 Cleaning test items...');
      
      const itemsRef = collection(db, 'items');
      const snapshot = await getDocs(itemsRef);
      
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        // Comprehensive test item detection patterns
        const isTestItem = 
          // Document ID patterns
          docId.includes('test') ||
          docId.includes('item_') ||
          docId.includes('sample') ||
          docId.includes('demo') ||
          docId.includes('mock') ||
          
          // Title patterns
          data.title?.includes('Test') ||
          data.title?.includes('iPhone 12 Pro') ||
          data.title?.includes('MacBook Air M1') ||
          data.title?.includes('iPhone 14 Pro Max') ||
          data.title?.includes('MacBook Air M2') ||
          data.title?.includes('Sony WH-1000XM4') ||
          data.title?.includes('Mid-Century Modern Sofa') ||
          data.title?.includes('Dining Table Set') ||
          data.title?.includes('Designer Leather Jacket') ||
          data.title?.includes('Mountain Bike - Trek') ||
          data.title?.includes('Programming Books Collection') ||
          data.title?.includes('Vintage Camera') ||
          data.title?.includes('Gaming Console') ||
          
          // Description patterns
          data.description?.includes('test') ||
          data.description?.includes('Excellent condition iPhone 12 Pro') ||
          data.description?.includes('MacBook Air with M1 chip') ||
          data.description?.includes('Recently serviced, new tires') ||
          data.description?.includes('Moving sale') ||
          
          // User patterns
          data.userName?.includes('Test') ||
          data.userName?.includes('Alice') ||
          data.userName?.includes('Bob') ||
          data.userName?.includes('Sarah Chen') ||
          data.userName?.includes('Mike Rodriguez') ||
          data.userName?.includes('Emma Thompson') ||
          data.userName?.includes('Alex Johnson') ||
          
          // Location patterns
          data.location === 'Test City' ||
          data.location === 'Downtown' ||
          data.location === 'University Area' ||
          data.location === 'Midtown' ||
          data.location === 'Suburbs' ||
          data.location === 'East Side' ||
          data.location === 'Fashion District' ||
          data.location === 'Park Area' ||
          data.location === 'Tech Hub' ||
          
          // Tag patterns
          data.tags?.includes('test') ||
          data.tags?.includes('demo') ||
          data.tags?.includes('sample') ||
          
          // Price patterns (common test prices)
          data.price === 500 ||
          data.price === 800 ||
          data.price === 850 ||
          data.price === 1200 ||
          data.price === 180 ||
          data.price === 450 ||
          data.price === 320 ||
          data.price === 280 ||
          data.price === 380 ||
          data.price === 120 ||
          
          // Category + title combinations
          (data.category === 'Electronics' && (
            data.title?.includes('iPhone') || 
            data.title?.includes('MacBook') || 
            data.title?.includes('Sony')
          )) ||
          
          // Specific realistic test data patterns
          (data.images && data.images.some(img => 
            img.includes('unsplash.com') || 
            img.includes('placeholder') ||
            img.includes('via.placeholder')
          ));
        
        if (isTestItem) {
          batch.delete(doc(db, 'items', docId));
          count++;
          console.log(`🗑️ Removing test item: ${data.title} (${docId})`);
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Cleaned ${count} test items`);
      return count;
      
    } catch (error) {
      console.error('❌ Error cleaning test items:', error);
      return 0;
    }
  }
  
  // Clean test conversations
  static async cleanTestConversations() {
    try {
      console.log('🧹 Cleaning test conversations...');
      
      const conversationsRef = collection(db, 'conversations');
      const snapshot = await getDocs(conversationsRef);
      
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        // Identify test conversations
        const isTestConversation = 
          docId.includes('test') ||
          docId.includes('offer_') ||
          docId.includes('trade_') ||
          data.participantNames && (
            Object.values(data.participantNames).some(name => 
              name.includes('Test') || 
              name.includes('Alice') || 
              name.includes('Bob')
            )
          ) ||
          data.participants?.some(id => 
            id.includes('test-') || 
            id.includes('testseller') || 
            id.includes('testbuyer')
          );
        
        if (isTestConversation) {
          batch.delete(doc(db, 'conversations', docId));
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Cleaned ${count} test conversations`);
      return count;
      
    } catch (error) {
      console.error('❌ Error cleaning test conversations:', error);
      return 0;
    }
  }
  
  // Clean test messages
  static async cleanTestMessages() {
    try {
      console.log('🧹 Cleaning test messages...');
      
      const messagesRef = collection(db, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Identify test messages
        const isTestMessage = 
          data.conversationId?.includes('test') ||
          data.conversationId?.includes('offer_') ||
          data.conversationId?.includes('trade_') ||
          data.senderName?.includes('Test') ||
          data.text?.includes('Test') ||
          data.text?.includes('Alice') ||
          data.text?.includes('Bob') ||
          data.senderId?.includes('test-');
        
        if (isTestMessage) {
          batch.delete(doc(db, 'messages', docSnapshot.id));
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Cleaned ${count} test messages`);
      return count;
      
    } catch (error) {
      console.error('❌ Error cleaning test messages:', error);
      return 0;
    }
  }
  
  // Clean test offers
  static async cleanTestOffers() {
    try {
      console.log('🧹 Cleaning test offers...');
      
      const offersRef = collection(db, 'offers');
      const snapshot = await getDocs(offersRef);
      
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Identify test offers
        const isTestOffer = 
          data.buyerName?.includes('Test') ||
          data.sellerName?.includes('Test') ||
          data.buyerId?.includes('test-') ||
          data.sellerId?.includes('test-') ||
          data.itemTitle?.includes('Test') ||
          data.message?.includes('test') ||
          data.conversationId?.includes('test') ||
          data.conversationId?.includes('offer_');
        
        if (isTestOffer) {
          batch.delete(doc(db, 'offers', docSnapshot.id));
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Cleaned ${count} test offers`);
      return count;
      
    } catch (error) {
      console.error('❌ Error cleaning test offers:', error);
      return 0;
    }
  }
  
  // Clean test trades
  static async cleanTestTrades() {
    try {
      console.log('🧹 Cleaning test trades...');
      
      const tradesRef = collection(db, 'trades');
      const snapshot = await getDocs(tradesRef);
      
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Identify test trades
        const isTestTrade = 
          data.proposerUserId?.includes('test-') ||
          data.targetUserId?.includes('test-') ||
          data.proposerItemId?.includes('test') ||
          data.targetItemId?.includes('test') ||
          data.proposerItemTitle?.includes('Test') ||
          data.targetItemTitle?.includes('Test');
        
        if (isTestTrade) {
          batch.delete(doc(db, 'trades', docSnapshot.id));
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Cleaned ${count} test trades`);
      return count;
      
    } catch (error) {
      console.error('❌ Error cleaning test trades:', error);
      return 0;
    }
  }
  
  // Clean specific user's data (use with caution)
  static async cleanUserData(userId) {
    try {
      console.log(`🧹 Cleaning data for user: ${userId}`);
      
      const results = {
        items: 0,
        conversations: 0,
        messages: 0,
        offers: 0
      };
      
      // Clean user's items
      const itemsQuery = query(collection(db, 'items'), where('userId', '==', userId));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const batch = writeBatch(db);
      itemsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        results.items++;
      });
      
      // Clean user's conversations
      const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
      const conversationsSnapshot = await getDocs(conversationsQuery);
      
      conversationsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        results.conversations++;
      });
      
      // Clean user's offers
      const offersQuery1 = query(collection(db, 'offers'), where('buyerId', '==', userId));
      const offersQuery2 = query(collection(db, 'offers'), where('sellerId', '==', userId));
      
      const [offersSnapshot1, offersSnapshot2] = await Promise.all([
        getDocs(offersQuery1),
        getDocs(offersQuery2)
      ]);
      
      [...offersSnapshot1.docs, ...offersSnapshot2.docs].forEach((doc) => {
        batch.delete(doc.ref);
        results.offers++;
      });
      
      await batch.commit();
      
      console.log(`✅ Cleaned user data:`, results);
      return results;
      
    } catch (error) {
      console.error('❌ Error cleaning user data:', error);
      throw error;
    }
  }
  
  // Get cleanup statistics
  static async getCleanupStats() {
    try {
      const stats = {
        totalItems: 0,
        testItems: 0,
        totalConversations: 0,
        testConversations: 0,
        totalMessages: 0,
        testMessages: 0,
        totalOffers: 0,
        testOffers: 0
      };
      
      // Count items
      const itemsSnapshot = await getDocs(collection(db, 'items'));
      stats.totalItems = itemsSnapshot.size;
      stats.testItems = itemsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return doc.id.includes('test') || data.title?.includes('Test') || data.location === 'Test City';
      }).length;
      
      // Count conversations
      const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
      stats.totalConversations = conversationsSnapshot.size;
      stats.testConversations = conversationsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return doc.id.includes('test') || Object.values(data.participantNames || {}).some(name => name.includes('Test'));
      }).length;
      
      // Count messages
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      stats.totalMessages = messagesSnapshot.size;
      stats.testMessages = messagesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.conversationId?.includes('test') || data.senderName?.includes('Test');
      }).length;
      
      // Count offers
      const offersSnapshot = await getDocs(collection(db, 'offers'));
      stats.totalOffers = offersSnapshot.size;
      stats.testOffers = offersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.buyerName?.includes('Test') || data.sellerName?.includes('Test');
      }).length;
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      return null;
    }
  }
}
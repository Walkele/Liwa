#!/usr/bin/env node

/**
 * Production Cleanup Script
 * 
 * This script removes all test/mock data from your Firebase database
 * to prepare the app for production deployment.
 * 
 * Usage:
 * node scripts/cleanMockData.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } = require('firebase/firestore');

// Firebase configuration (replace with your config)
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your src/config/firebase.js configuration
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class ProductionDataCleanup {
  
  static async cleanAllMockData() {
    console.log('🧹 Starting production database cleanup...');
    
    const results = {
      items: 0,
      conversations: 0,
      messages: 0,
      offers: 0,
      trades: 0,
      userProfiles: 0
    };
    
    try {
      // Clean test items
      console.log('📦 Cleaning test items...');
      results.items = await this.cleanCollection('items', (data, docId) => {
        return docId.includes('test') ||
               docId.includes('item_') ||
               data.title?.includes('Test') ||
               data.title?.includes('iPhone 12 Pro') ||
               data.title?.includes('MacBook Air M1') ||
               data.userName?.includes('Test') ||
               data.description?.includes('test') ||
               data.location === 'Test City' ||
               data.tags?.includes('test');
      });
      
      // Clean test conversations
      console.log('💬 Cleaning test conversations...');
      results.conversations = await this.cleanCollection('conversations', (data, docId) => {
        return docId.includes('test') ||
               docId.includes('offer_') ||
               docId.includes('trade_') ||
               (data.participantNames && Object.values(data.participantNames).some(name => 
                 name.includes('Test') || name.includes('Alice') || name.includes('Bob')
               )) ||
               data.participants?.some(id => 
                 id.includes('test-') || id.includes('testseller') || id.includes('testbuyer')
               );
      });
      
      // Clean test messages
      console.log('📨 Cleaning test messages...');
      results.messages = await this.cleanCollection('messages', (data) => {
        return data.conversationId?.includes('test') ||
               data.conversationId?.includes('offer_') ||
               data.conversationId?.includes('trade_') ||
               data.senderName?.includes('Test') ||
               data.text?.includes('Test') ||
               data.text?.includes('Alice') ||
               data.text?.includes('Bob') ||
               data.senderId?.includes('test-');
      });
      
      // Clean test offers
      console.log('💰 Cleaning test offers...');
      results.offers = await this.cleanCollection('offers', (data) => {
        return data.buyerName?.includes('Test') ||
               data.sellerName?.includes('Test') ||
               data.buyerId?.includes('test-') ||
               data.sellerId?.includes('test-') ||
               data.itemTitle?.includes('Test') ||
               data.message?.includes('test') ||
               data.conversationId?.includes('test') ||
               data.conversationId?.includes('offer_');
      });
      
      // Clean test trades
      console.log('🔄 Cleaning test trades...');
      results.trades = await this.cleanCollection('trades', (data) => {
        return data.proposerUserId?.includes('test-') ||
               data.targetUserId?.includes('test-') ||
               data.proposerItemId?.includes('test') ||
               data.targetItemId?.includes('test') ||
               data.proposerItemTitle?.includes('Test') ||
               data.targetItemTitle?.includes('Test');
      });
      
      // Clean test user profiles
      console.log('👥 Cleaning test user profiles...');
      results.userProfiles = await this.cleanCollection('user_profiles', (data, docId) => {
        return docId.includes('user_') ||
               data.name?.includes('Test') ||
               data.email?.includes('test') ||
               data.bio?.includes('test') ||
               data.name === 'Sarah Chen' ||
               data.name === 'Mike Rodriguez' ||
               data.name === 'Emma Thompson' ||
               data.name === 'Alex Johnson';
      });
      
      const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0);
      
      console.log('\n✅ Production cleanup completed successfully!');
      console.log('📊 Cleanup Summary:');
      console.log(`   • ${results.items} test items removed`);
      console.log(`   • ${results.conversations} test conversations removed`);
      console.log(`   • ${results.messages} test messages removed`);
      console.log(`   • ${results.offers} test offers removed`);
      console.log(`   • ${results.trades} test trades removed`);
      console.log(`   • ${results.userProfiles} test user profiles removed`);
      console.log(`   📈 Total: ${totalCleaned} records cleaned`);
      console.log('\n🚀 Your database is now ready for production!');
      
      return results;
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }
  
  static async cleanCollection(collectionName, isTestData) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        if (isTestData(data, docId)) {
          batch.delete(doc(db, collectionName, docId));
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      
      return count;
      
    } catch (error) {
      console.error(`❌ Error cleaning ${collectionName}:`, error);
      return 0;
    }
  }
  
  static async getCleanupStats() {
    try {
      console.log('📊 Getting database statistics...');
      
      const collections = ['items', 'conversations', 'messages', 'offers', 'trades', 'user_profiles'];
      const stats = {};
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        stats[collectionName] = {
          total: snapshot.size,
          remaining: snapshot.docs.length
        };
      }
      
      console.log('📈 Current database state:');
      Object.entries(stats).forEach(([name, data]) => {
        console.log(`   • ${name}: ${data.total} documents`);
      });
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return {};
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 SwipeIt Production Database Cleanup');
  console.log('=====================================\n');
  
  try {
    // Show current stats
    await ProductionDataCleanup.getCleanupStats();
    console.log('');
    
    // Perform cleanup
    const results = await ProductionDataCleanup.cleanAllMockData();
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('Your SwipeIt app is now ready for production deployment.');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
if (require.main === module) {
  main();
}

module.exports = { ProductionDataCleanup };
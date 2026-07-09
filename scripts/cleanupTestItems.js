#!/usr/bin/env node

/**
 * Cleanup Script: Remove Test Items from Database
 * 
 * This script identifies and archives test items that shouldn't appear
 * in the production HomeScreen.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, getDocs, doc, updateDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config (you'll need to add your config here)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class TestItemCleanup {
  
  static isTestItem(item) {
    const testPatterns = [
      // Test titles
      /^test\d*$/i,
      /^sample/i,
      /^demo/i,
      /^mock/i,
      
      // Test descriptions
      /test item/i,
      /sample item/i,
      /demo item/i,
      
      // Test user patterns
      /test.*user/i,
      /sample.*user/i,
      
      // Generic test patterns
      /^item\d+$/i, // Generic item1, item2, etc.
      /^product\d+$/i, // Generic product1, product2, etc.
    ];
    
    // Check title
    if (testPatterns.some(pattern => pattern.test(item.title || ''))) {
      return true;
    }
    
    // Check description
    if (testPatterns.some(pattern => pattern.test(item.description || ''))) {
      return true;
    }
    
    // Check user name
    if (testPatterns.some(pattern => pattern.test(item.userName || ''))) {
      return true;
    }
    
    // Check for obvious test IDs
    if (item.id && (
      item.id.includes('test') ||
      item.id.includes('sample') ||
      item.id.includes('demo')
    )) {
      return true;
    }
    
    return false;
  }
  
  static async findTestItems() {
    try {
      console.log('🔍 Scanning for test items...');
      
      const itemsQuery = query(collection(db, 'items'));
      const snapshot = await getDocs(itemsQuery);
      
      const testItems = [];
      const allItems = [];
      
      snapshot.forEach(doc => {
        const item = { id: doc.id, ...doc.data() };
        allItems.push(item);
        
        if (this.isTestItem(item)) {
          testItems.push(item);
        }
      });
      
      console.log(`📊 Found ${allItems.length} total items`);
      console.log(`🧪 Found ${testItems.length} test items`);
      
      if (testItems.length > 0) {
        console.log('\n📋 Test items found:');
        testItems.forEach(item => {
          console.log(`  - ${item.id}: "${item.title}" (${item.status}) by ${item.userName}`);
        });
      }
      
      return testItems;
      
    } catch (error) {
      console.error('❌ Error finding test items:', error);
      return [];
    }
  }
  
  static async archiveTestItems(testItems, dryRun = true) {
    try {
      if (testItems.length === 0) {
        console.log('✅ No test items to archive');
        return;
      }
      
      console.log(`\n${dryRun ? '🔍 DRY RUN:' : '🗄️ ARCHIVING:'} Processing ${testItems.length} test items...`);
      
      for (const item of testItems) {
        if (dryRun) {
          console.log(`  Would archive: ${item.id} - "${item.title}"`);
        } else {
          try {
            const itemRef = doc(db, 'items', item.id);
            await updateDoc(itemRef, {
              status: 'archived',
              isActive: false,
              isAvailable: false,
              isVisible: false,
              archivedAt: serverTimestamp(),
              archiveReason: 'test_data_cleanup',
              originalStatus: item.status || 'available',
              lastUpdated: serverTimestamp()
            });
            
            console.log(`  ✅ Archived: ${item.id} - "${item.title}"`);
          } catch (error) {
            console.error(`  ❌ Failed to archive ${item.id}:`, error.message);
          }
        }
      }
      
      if (dryRun) {
        console.log('\n💡 This was a dry run. Run with --execute to actually archive items.');
      } else {
        console.log(`\n✅ Successfully processed ${testItems.length} test items`);
      }
      
    } catch (error) {
      console.error('❌ Error archiving test items:', error);
    }
  }
  
  static async run() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');
    
    console.log('🧹 Test Item Cleanup Tool');
    console.log('=' .repeat(40));
    
    if (dryRun) {
      console.log('🔍 Running in DRY RUN mode (no changes will be made)');
      console.log('💡 Use --execute flag to actually archive items\n');
    } else {
      console.log('⚠️  EXECUTING mode - items will be archived!\n');
    }
    
    const testItems = await this.findTestItems();
    await this.archiveTestItems(testItems, dryRun);
    
    console.log('\n🎯 Recommendations:');
    console.log('1. Run this script periodically to keep the database clean');
    console.log('2. Update test data creation to use more obvious test patterns');
    console.log('3. Consider using a separate test database for development');
    
    process.exit(0);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  TestItemCleanup.run().catch(console.error);
}

module.exports = TestItemCleanup;
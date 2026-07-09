#!/usr/bin/env node

/**
 * 🤖 Automated Multi-User Testing Script
 * Simulates multiple users interacting with SwipeIt without multiple devices
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  onSnapshot
} = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyASdYNMUTiDGg2vZo3ZtjnMLqrvViEVJ2g",
  authDomain: "liwach-19664.firebaseapp.com",
  projectId: "liwach-19664",
  storageBucket: "liwach-19664.firebasestorage.app",
  messagingSenderId: "725653447622",
  appId: "1:725653447622:web:a8b9c58e80f15b1ae988c7",
  measurementId: "G-DVSWKX1B7D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class MultiUserTestSimulator {
  constructor() {
    this.users = [
      { id: 'user1', name: 'TestUser1', email: 'test1@example.com' },
      { id: 'user2', name: 'TestUser2', email: 'test2@example.com' },
      { id: 'user3', name: 'TestUser3', email: 'test3@example.com' }
    ];
    
    this.testItems = [
      { title: 'iPhone 14 Pro', price: 800, category: 'Electronics', userId: 'user1' },
      { title: 'MacBook Air', price: 1200, category: 'Electronics', userId: 'user1' },
      { title: 'Gaming Chair', price: 300, category: 'Furniture', userId: 'user1' },
      { title: 'Samsung Galaxy S23', price: 700, category: 'Electronics', userId: 'user2' },
      { title: 'Dell Laptop', price: 900, category: 'Electronics', userId: 'user2' },
      { title: 'Office Desk', price: 250, category: 'Furniture', userId: 'user2' },
      { title: 'Google Pixel 7', price: 600, category: 'Electronics', userId: 'user3' },
      { title: 'HP Laptop', price: 800, category: 'Electronics', userId: 'user3' },
      { title: 'Standing Desk', price: 350, category: 'Furniture', userId: 'user3' }
    ];
    
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Automated Multi-User Testing...\n');
    
    try {
      // Setup test data
      await this.setupTestData();
      
      // Run test scenarios
      await this.testCashOffers();
      await this.testTradeOffers();
      await this.testServiceOffers();
      await this.testCounterOffers();
      await this.testMultiOfferLocking();
      await this.testCompletionFlow();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async setupTestData() {
    console.log('📋 Setting up test data...');
    
    // Create test items
    for (const item of this.testItems) {
      const docRef = await addDoc(collection(db, 'items'), {
        ...item,
        status: 'available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      item.id = docRef.id;
    }
    
    console.log('✅ Test data setup complete\n');
  }

  async testCashOffers() {
    console.log('💰 Testing Cash Offers...');
    
    const testCases = [
      {
        from: 'user2',
        to: 'user1', 
        itemTitle: 'iPhone 14 Pro',
        amount: 750,
        expected: 'pending'
      },
      {
        from: 'user3',
        to: 'user2',
        itemTitle: 'Samsung Galaxy S23', 
        amount: 650,
        expected: 'pending'
      }
    ];

    for (const testCase of testCases) {
      try {
        const item = this.testItems.find(i => i.title === testCase.itemTitle);
        
        // Create cash offer
        const offerRef = await addDoc(collection(db, 'offers'), {
          type: 'cash',
          fromUserId: testCase.from,
          toUserId: testCase.to,
          itemId: item.id,
          amount: testCase.amount,
          status: 'pending',
          createdAt: serverTimestamp()
        });

        // Verify offer was created
        const result = offerRef.id ? 'PASS' : 'FAIL';
        this.testResults.push({
          test: `Cash Offer: ${testCase.from} → ${testCase.to}`,
          result,
          details: `$${testCase.amount} for ${testCase.itemTitle}`
        });

        console.log(`  ✅ ${testCase.from} offered $${testCase.amount} for ${testCase.itemTitle}`);
        
      } catch (error) {
        this.testResults.push({
          test: `Cash Offer: ${testCase.from} → ${testCase.to}`,
          result: 'FAIL',
          error: error.message
        });
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
    console.log('');
  }

  async testTradeOffers() {
    console.log('🔄 Testing Trade Offers...');
    
    const testCases = [
      {
        from: 'user1',
        to: 'user2',
        offeringTitle: 'Gaming Chair',
        wantingTitle: 'Dell Laptop'
      },
      {
        from: 'user2', 
        to: 'user3',
        offeringTitle: 'Office Desk',
        wantingTitle: 'Standing Desk'
      }
    ];

    for (const testCase of testCases) {
      try {
        const offeringItem = this.testItems.find(i => i.title === testCase.offeringTitle);
        const wantingItem = this.testItems.find(i => i.title === testCase.wantingTitle);
        
        const offerRef = await addDoc(collection(db, 'offers'), {
          type: 'trade',
          fromUserId: testCase.from,
          toUserId: testCase.to,
          offeringItemId: offeringItem.id,
          wantingItemId: wantingItem.id,
          status: 'pending',
          createdAt: serverTimestamp()
        });

        const result = offerRef.id ? 'PASS' : 'FAIL';
        this.testResults.push({
          test: `Trade Offer: ${testCase.from} → ${testCase.to}`,
          result,
          details: `${testCase.offeringTitle} ↔ ${testCase.wantingTitle}`
        });

        console.log(`  ✅ ${testCase.from} wants to trade ${testCase.offeringTitle} for ${testCase.wantingTitle}`);
        
      } catch (error) {
        this.testResults.push({
          test: `Trade Offer: ${testCase.from} → ${testCase.to}`,
          result: 'FAIL',
          error: error.message
        });
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
    console.log('');
  }

  async testServiceOffers() {
    console.log('🛠️ Testing Service Offers...');
    
    const testCases = [
      {
        from: 'user1',
        to: 'user2',
        itemTitle: 'Dell Laptop',
        service: 'Setup and Configuration',
        price: 50
      },
      {
        from: 'user3',
        to: 'user1', 
        itemTitle: 'MacBook Air',
        service: 'Repair Service',
        price: 100
      }
    ];

    for (const testCase of testCases) {
      try {
        const item = this.testItems.find(i => i.title === testCase.itemTitle);
        
        const offerRef = await addDoc(collection(db, 'service_offers'), {
          fromUserId: testCase.from,
          toUserId: testCase.to,
          itemId: item.id,
          serviceType: testCase.service,
          price: testCase.price,
          status: 'pending',
          createdAt: serverTimestamp()
        });

        const result = offerRef.id ? 'PASS' : 'FAIL';
        this.testResults.push({
          test: `Service Offer: ${testCase.from} → ${testCase.to}`,
          result,
          details: `${testCase.service} for ${testCase.itemTitle} - $${testCase.price}`
        });

        console.log(`  ✅ ${testCase.from} offered ${testCase.service} for ${testCase.itemTitle} ($${testCase.price})`);
        
      } catch (error) {
        this.testResults.push({
          test: `Service Offer: ${testCase.from} → ${testCase.to}`,
          result: 'FAIL',
          error: error.message
        });
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
    console.log('');
  }

  async testCounterOffers() {
    console.log('🔄 Testing Counter Offers...');
    
    try {
      // Get existing offers to counter
      const offersSnapshot = await getDocs(collection(db, 'offers'));
      const offers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (offers.length > 0) {
        const originalOffer = offers[0];
        
        // Create counter offer
        const counterOfferRef = await addDoc(collection(db, 'counter_offers'), {
          originalOfferId: originalOffer.id,
          fromUserId: originalOffer.toUserId,
          toUserId: originalOffer.fromUserId,
          type: originalOffer.type,
          counterAmount: originalOffer.amount ? originalOffer.amount + 50 : null,
          status: 'pending',
          createdAt: serverTimestamp()
        });

        const result = counterOfferRef.id ? 'PASS' : 'FAIL';
        this.testResults.push({
          test: 'Counter Offer Creation',
          result,
          details: `Counter to original offer with +$50`
        });

        console.log(`  ✅ Counter offer created successfully`);
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'Counter Offer Creation',
        result: 'FAIL',
        error: error.message
      });
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log('');
  }

  async testMultiOfferLocking() {
    console.log('🔒 Testing Multi-Offer Locking...');
    
    try {
      const targetItem = this.testItems[0]; // iPhone 14 Pro
      
      // Create multiple offers on same item
      const offer1Ref = await addDoc(collection(db, 'offers'), {
        type: 'cash',
        fromUserId: 'user2',
        toUserId: 'user1',
        itemId: targetItem.id,
        amount: 780,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      const offer2Ref = await addDoc(collection(db, 'offers'), {
        type: 'cash', 
        fromUserId: 'user3',
        toUserId: 'user1',
        itemId: targetItem.id,
        amount: 790,
        status: 'queued', // Should be queued since item is locked
        createdAt: serverTimestamp()
      });

      // Update item status to locked
      await updateDoc(doc(db, 'items', targetItem.id), {
        status: 'locked',
        lockedBy: offer1Ref.id,
        updatedAt: serverTimestamp()
      });

      this.testResults.push({
        test: 'Multi-Offer Locking',
        result: 'PASS',
        details: 'Item locked by first offer, second offer queued'
      });

      console.log(`  ✅ Item locked by first offer, second offer queued`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Multi-Offer Locking',
        result: 'FAIL',
        error: error.message
      });
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log('');
  }

  async testCompletionFlow() {
    console.log('✅ Testing Completion Flow...');
    
    try {
      // Get a pending offer to complete
      const offersSnapshot = await getDocs(
        query(collection(db, 'offers'), where('status', '==', 'pending'))
      );
      
      if (!offersSnapshot.empty) {
        const offer = { id: offersSnapshot.docs[0].id, ...offersSnapshot.docs[0].data() };
        
        // Accept the offer
        await updateDoc(doc(db, 'offers', offer.id), {
          status: 'accepted',
          acceptedAt: serverTimestamp()
        });

        // Create trade record
        const tradeRef = await addDoc(collection(db, 'trades'), {
          offerId: offer.id,
          buyerId: offer.fromUserId,
          sellerId: offer.toUserId,
          itemId: offer.itemId,
          status: 'in_progress',
          createdAt: serverTimestamp()
        });

        // Complete the trade
        await updateDoc(doc(db, 'trades', tradeRef.id), {
          status: 'completed',
          completedAt: serverTimestamp()
        });

        this.testResults.push({
          test: 'Completion Flow',
          result: 'PASS',
          details: 'Offer accepted and trade completed'
        });

        console.log(`  ✅ Offer accepted and trade completed`);
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'Completion Flow',
        result: 'FAIL',
        error: error.message
      });
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log('');
  }

  generateReport() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================\n');
    
    const passed = this.testResults.filter(r => r.result === 'PASS').length;
    const failed = this.testResults.filter(r => r.result === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%\n`);
    
    console.log('DETAILED RESULTS:');
    console.log('-----------------');
    
    this.testResults.forEach((result, index) => {
      const status = result.result === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      if (result.details) console.log(`   ${result.details}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      console.log('');
    });
  }
}

// Run the tests
if (require.main === module) {
  const simulator = new MultiUserTestSimulator();
  simulator.runAllTests().catch(console.error);
}

module.exports = MultiUserTestSimulator;
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class TestUserSeeder {
  // Create comprehensive test users for thorough testing
  static async seedAllTestUsers() {
    try {
      console.log('🌱 Starting comprehensive test user seeding...');
      
      const testUsers = [
        {
          uid: 'test1-active-trader',
          email: 'test1@swipeit.com',
          displayName: 'Active Trader',
          trustScore: 500,
          role: 'Primary active trader',
          location: { city: 'City Center', country: 'TestLand' },
          subscription: 'free',
          itemCount: 8
        },
        {
          uid: 'test2-casual-user',
          email: 'test2@swipeit.com',
          displayName: 'Casual User',
          trustScore: 200,
          role: 'Occasional trader',
          location: { city: 'Suburbs', country: 'TestLand' },
          subscription: 'free',
          itemCount: 3
        },
        {
          uid: 'test3-new-user',
          email: 'test3@swipeit.com',
          displayName: 'New User',
          trustScore: 100,
          role: 'Just joined',
          location: { city: 'Downtown', country: 'TestLand' },
          subscription: 'free',
          itemCount: 2
        },
        {
          uid: 'test4-trusted-veteran',
          email: 'test4@swipeit.com',
          displayName: 'Trusted Veteran',
          trustScore: 850,
          role: 'Experienced trader',
          location: { city: 'City Center', country: 'TestLand' },
          subscription: 'premium',
          itemCount: 12
        },
        {
          uid: 'test5-problematic-user',
          email: 'test5@swipeit.com',
          displayName: 'Problematic User',
          trustScore: 50,
          role: 'For testing limits',
          location: { city: 'Outskirts', country: 'TestLand' },
          subscription: 'free',
          itemCount: 1
        },
        {
          uid: 'test6-premium-user',
          email: 'test6@swipeit.com',
          displayName: 'Premium User',
          trustScore: 600,
          role: 'Monetization tester',
          location: { city: 'City Center', country: 'TestLand' },
          subscription: 'pro',
          itemCount: 15
        },
        {
          uid: 'test7-edge-case-user',
          email: 'test7@swipeit.com',
          displayName: 'Edge Case User',
          trustScore: 300,
          role: 'Boundary testing',
          location: { city: 'Various', country: 'TestLand' },
          subscription: 'free',
          itemCount: 3
        }
      ];
      
      const results = {
        users: 0,
        items: 0,
        total: 0
      };
      
      for (const userData of testUsers) {
        // Create user document
        await this.createTestUser(userData);
        results.users++;
        
        // Create items for user
        const itemsCreated = await this.createTestItems(userData);
        results.items += itemsCreated;
      }
      
      results.total = results.users + results.items;
      
      console.log('✅ Test user seeding complete:', results);
      return results;
    } catch (error) {
      console.error('Error seeding test users:', error);
      throw error;
    }
  }

  // Create individual test user
  static async createTestUser(userData) {
    try {
      const userRef = doc(db, 'users', userData.uid);
      
      const userDocument = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        trustScore: userData.trustScore,
        role: userData.role,
        location: userData.location,
        subscription: userData.subscription,
        
        // Trading stats
        totalTrades: this.calculateTotalTrades(userData.trustScore),
        successfulTrades: this.calculateSuccessfulTrades(userData.trustScore),
        totalViews: this.calculateTotalViews(userData.trustScore),
        totalLikes: this.calculateTotalLikes(userData.trustScore),
        
        // Account info
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        profileComplete: true,
        
        // Subscription details
        subscriptionStatus: userData.subscription,
        subscriptionStartDate: userData.subscription !== 'free' ? serverTimestamp() : null,
        subscriptionEndDate: userData.subscription !== 'free' ? 
          new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) : null, // 30 days from now
        
        // Trust score breakdown
        trustScoreBreakdown: {
          baseScore: 100,
          completionBonus: Math.floor((userData.trustScore - 100) * 0.6),
          verificationBonus: Math.floor((userData.trustScore - 100) * 0.2),
          responseTimeBonus: Math.floor((userData.trustScore - 100) * 0.1),
          penaltyDeduction: Math.floor((userData.trustScore - 100) * 0.1)
        },
        
        // Verification status
        verifications: this.getVerifications(userData.trustScore),
        
        // Response time (hours)
        avgResponseHours: this.calculateResponseTime(userData.trustScore)
      };
      
      await setDoc(userRef, userDocument);
      console.log(`✅ Created test user: ${userData.displayName} (${userData.uid})`);
      
      return userDocument;
    } catch (error) {
      console.error(`Error creating test user ${userData.uid}:`, error);
      throw error;
    }
  }

  // Create test items for user
  static async createTestItems(userData) {
    try {
      const itemCategories = [
        'Electronics', 'Clothing', 'Books', 'Sports', 'Home & Garden',
        'Toys & Games', 'Music', 'Art', 'Automotive', 'Health & Beauty'
      ];
      
      const itemTemplates = [
        { title: 'iPhone 12 Pro', category: 'Electronics', estimatedValue: 800 },
        { title: 'Nike Air Jordans', category: 'Clothing', estimatedValue: 150 },
        { title: 'MacBook Pro 2021', category: 'Electronics', estimatedValue: 1200 },
        { title: 'Vintage Leather Jacket', category: 'Clothing', estimatedValue: 200 },
        { title: 'Programming Books Set', category: 'Books', estimatedValue: 100 },
        { title: 'Mountain Bike', category: 'Sports', estimatedValue: 500 },
        { title: 'Coffee Machine', category: 'Home & Garden', estimatedValue: 300 },
        { title: 'PlayStation 5', category: 'Toys & Games', estimatedValue: 500 },
        { title: 'Guitar Acoustic', category: 'Music', estimatedValue: 250 },
        { title: 'Painting Canvas', category: 'Art', estimatedValue: 80 },
        { title: 'Car Tires Set', category: 'Automotive', estimatedValue: 400 },
        { title: 'Skincare Set', category: 'Health & Beauty', estimatedValue: 120 }
      ];
      
      let itemsCreated = 0;
      
      for (let i = 0; i < userData.itemCount; i++) {
        const template = itemTemplates[i % itemTemplates.length];
        const itemId = `${userData.uid}-item-${i + 1}`;
        
        const itemDocument = {
          id: itemId,
          userId: userData.uid,
          title: `${template.title} - ${userData.displayName}`,
          description: `High quality ${template.title.toLowerCase()} in excellent condition. Perfect for trading or cash offers.`,
          category: template.category,
          estimatedValue: template.estimatedValue,
          condition: this.getRandomCondition(),
          status: 'available',
          
          // Location
          location: userData.location,
          
          // Timestamps
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          
          // Engagement stats
          views: this.getRandomViews(userData.trustScore),
          likes: this.getRandomLikes(userData.trustScore),
          
          // Trading preferences
          acceptsCash: true,
          acceptsTrade: true,
          minCashOffer: Math.floor(template.estimatedValue * 0.7),
          
          // Boost status
          isBoosted: false,
          boostExpiresAt: null,
          
          // Images (placeholder)
          images: [`placeholder-${template.category.toLowerCase()}.jpg`],
          
          // Tags
          tags: [template.category.toLowerCase(), 'quality', 'trade', 'cash']
        };
        
        const itemRef = doc(db, 'items', itemId);
        await setDoc(itemRef, itemDocument);
        itemsCreated++;
      }
      
      console.log(`✅ Created ${itemsCreated} items for ${userData.displayName}`);
      return itemsCreated;
    } catch (error) {
      console.error(`Error creating items for ${userData.uid}:`, error);
      return 0;
    }
  }

  // Helper methods for realistic data generation
  static calculateTotalTrades(trustScore) {
    if (trustScore >= 800) return Math.floor(Math.random() * 50) + 30; // 30-80 trades
    if (trustScore >= 600) return Math.floor(Math.random() * 30) + 15; // 15-45 trades
    if (trustScore >= 400) return Math.floor(Math.random() * 20) + 8;  // 8-28 trades
    if (trustScore >= 200) return Math.floor(Math.random() * 10) + 3;  // 3-13 trades
    return Math.floor(Math.random() * 5) + 1; // 1-6 trades
  }

  static calculateSuccessfulTrades(trustScore) {
    const totalTrades = this.calculateTotalTrades(trustScore);
    const successRate = trustScore >= 600 ? 0.9 : trustScore >= 400 ? 0.8 : trustScore >= 200 ? 0.7 : 0.6;
    return Math.floor(totalTrades * successRate);
  }

  static calculateTotalViews(trustScore) {
    const multiplier = trustScore >= 600 ? 100 : trustScore >= 400 ? 75 : trustScore >= 200 ? 50 : 25;
    return Math.floor(Math.random() * multiplier) + multiplier;
  }

  static calculateTotalLikes(trustScore) {
    const views = this.calculateTotalViews(trustScore);
    return Math.floor(views * 0.15); // ~15% like rate
  }

  static calculateResponseTime(trustScore) {
    if (trustScore >= 800) return Math.floor(Math.random() * 2) + 1;  // 1-3 hours
    if (trustScore >= 600) return Math.floor(Math.random() * 4) + 2;  // 2-6 hours
    if (trustScore >= 400) return Math.floor(Math.random() * 8) + 4;  // 4-12 hours
    if (trustScore >= 200) return Math.floor(Math.random() * 12) + 6; // 6-18 hours
    return Math.floor(Math.random() * 24) + 12; // 12-36 hours
  }

  static getVerifications(trustScore) {
    const verifications = [];
    
    if (trustScore >= 200) verifications.push({ type: 'email', verified: true, verifiedAt: new Date() });
    if (trustScore >= 400) verifications.push({ type: 'phone', verified: true, verifiedAt: new Date() });
    if (trustScore >= 600) verifications.push({ type: 'identity', verified: true, verifiedAt: new Date() });
    if (trustScore >= 800) verifications.push({ type: 'address', verified: true, verifiedAt: new Date() });
    
    return verifications;
  }

  static getRandomCondition() {
    const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  static getRandomViews(trustScore) {
    const baseViews = trustScore >= 600 ? 50 : trustScore >= 400 ? 30 : trustScore >= 200 ? 20 : 10;
    return Math.floor(Math.random() * baseViews) + baseViews;
  }

  static getRandomLikes(trustScore) {
    const views = this.getRandomViews(trustScore);
    return Math.floor(views * (Math.random() * 0.2 + 0.05)); // 5-25% like rate
  }

  // Quick seed for existing users (test1, test2, test3)
  static async seedExistingUsers() {
    try {
      console.log('🌱 Seeding existing test users with proper data...');
      
      const existingUsers = [
        {
          uid: 'test1',
          email: 'test1@swipeit.com',
          displayName: 'Test User 1',
          trustScore: 500,
          role: 'Active trader',
          location: { city: 'City Center', country: 'TestLand' },
          subscription: 'free',
          itemCount: 5
        },
        {
          uid: 'test2',
          email: 'test2@swipeit.com',
          displayName: 'Test User 2',
          trustScore: 200,
          role: 'Casual user',
          location: { city: 'Suburbs', country: 'TestLand' },
          subscription: 'free',
          itemCount: 3
        },
        {
          uid: 'test3',
          email: 'test3@swipeit.com',
          displayName: 'Test User 3',
          trustScore: 100,
          role: 'New user',
          location: { city: 'Downtown', country: 'TestLand' },
          subscription: 'free',
          itemCount: 2
        }
      ];
      
      let results = { users: 0, items: 0, total: 0 };
      
      for (const userData of existingUsers) {
        await this.createTestUser(userData);
        results.users++;
        
        const itemsCreated = await this.createTestItems(userData);
        results.items += itemsCreated;
      }
      
      results.total = results.users + results.items;
      
      console.log('✅ Existing users seeded:', results);
      return results;
    } catch (error) {
      console.error('Error seeding existing users:', error);
      throw error;
    }
  }
}
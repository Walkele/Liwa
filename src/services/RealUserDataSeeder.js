import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class RealUserDataSeeder {
  
  // Create realistic items for a real user
  static async createRealisticItems(userId) {
    try {
      console.log('📦 Creating realistic items for user:', userId);
      
      // Get user info
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userName = userData.name || userData.displayName || userData.email?.split('@')[0] || 'User';
      
      // Realistic item categories and data
      const realisticItems = [
        // Electronics
        {
          title: 'iPhone 14 Pro Max',
          description: 'Excellent condition iPhone 14 Pro Max, 256GB, Space Black. Includes original box, charger, and screen protector already applied.',
          price: 850,
          category: 'Electronics',
          condition: 'Like New',
          images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400'],
          location: 'Downtown',
          tags: ['smartphone', 'apple', 'ios', 'unlocked']
        },
        {
          title: 'MacBook Air M2',
          description: 'MacBook Air with M2 chip, 13-inch, 512GB SSD, 16GB RAM. Perfect for students and professionals. Barely used.',
          price: 1200,
          category: 'Electronics',
          condition: 'Excellent',
          images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'],
          location: 'University Area',
          tags: ['laptop', 'apple', 'macbook', 'student']
        },
        {
          title: 'Sony WH-1000XM4 Headphones',
          description: 'Premium noise-canceling headphones. Great for travel and work from home. Comes with carrying case.',
          price: 180,
          category: 'Electronics',
          condition: 'Good',
          images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400'],
          location: 'Midtown',
          tags: ['headphones', 'sony', 'wireless', 'noise-canceling']
        },
        
        // Furniture & Home
        {
          title: 'Mid-Century Modern Sofa',
          description: 'Beautiful mid-century modern 3-seater sofa in excellent condition. Navy blue fabric, very comfortable. Moving sale.',
          price: 450,
          category: 'Furniture',
          condition: 'Good',
          images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
          location: 'Suburbs',
          tags: ['sofa', 'furniture', 'mid-century', 'living-room']
        },
        {
          title: 'Dining Table Set',
          description: 'Solid wood dining table with 4 chairs. Perfect for small apartments or starter homes. Some minor wear.',
          price: 320,
          category: 'Furniture',
          condition: 'Fair',
          images: ['https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=400'],
          location: 'East Side',
          tags: ['dining', 'table', 'chairs', 'wood']
        },
        
        // Fashion & Accessories
        {
          title: 'Designer Leather Jacket',
          description: 'Genuine leather jacket from premium brand. Size Medium. Timeless style, perfect for fall and winter.',
          price: 280,
          category: 'Fashion',
          condition: 'Like New',
          images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400'],
          location: 'Fashion District',
          tags: ['jacket', 'leather', 'designer', 'medium']
        },
        
        // Sports & Recreation
        {
          title: 'Mountain Bike - Trek',
          description: 'Trek mountain bike, 21-speed, perfect for trails and city riding. Recently serviced, new tires.',
          price: 380,
          category: 'Sports',
          condition: 'Good',
          images: ['https://images.unsplash.com/photo-1544191696-15693072e0b5?w=400'],
          location: 'Park Area',
          tags: ['bike', 'mountain', 'trek', 'cycling']
        },
        
        // Books & Media
        {
          title: 'Programming Books Collection',
          description: 'Collection of 15 programming books including JavaScript, Python, React, and more. Great for developers.',
          price: 120,
          category: 'Books',
          condition: 'Good',
          images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'],
          location: 'Tech Hub',
          tags: ['books', 'programming', 'javascript', 'python']
        }
      ];
      
      // Add items to Firestore
      const createdItems = [];
      for (const itemData of realisticItems) {
        const item = {
          ...itemData,
          userId: userId,
          userName: userName,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'available',
          isLocked: false,
          views: Math.floor(Math.random() * 50) + 5, // Random views 5-55
          likes: Math.floor(Math.random() * 20), // Random likes 0-20
          isPromoted: Math.random() > 0.8, // 20% chance of being promoted
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };
        
        const itemRef = await addDoc(collection(db, 'items'), item);
        createdItems.push({ id: itemRef.id, ...item });
        console.log(`✅ Created: ${item.title} (${itemRef.id})`);
      }
      
      console.log(`🎉 Successfully created ${createdItems.length} realistic items for ${userName}`);
      return createdItems;
      
    } catch (error) {
      console.error('❌ Error creating realistic items:', error);
      throw error;
    }
  }
  
  // Create realistic user profiles
  static async createRealisticUsers() {
    try {
      console.log('👥 Creating realistic user profiles...');
      
      const realisticUsers = [
        {
          id: 'user_sarah_tech',
          name: 'Sarah Chen',
          email: 'sarah.chen@email.com',
          bio: 'Tech enthusiast and minimalist. Love trading gadgets and finding great deals!',
          location: 'San Francisco, CA',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
          rating: 4.8,
          totalTrades: 23,
          joinedAt: new Date('2023-06-15'),
          preferences: ['Electronics', 'Books', 'Gadgets'],
          isVerified: true
        },
        {
          id: 'user_mike_furniture',
          name: 'Mike Rodriguez',
          email: 'mike.rodriguez@email.com',
          bio: 'Interior designer helping people find perfect furniture pieces. Always fair trades!',
          location: 'Austin, TX',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          rating: 4.9,
          totalTrades: 45,
          joinedAt: new Date('2023-03-20'),
          preferences: ['Furniture', 'Home Decor', 'Art'],
          isVerified: true
        },
        {
          id: 'user_emma_fashion',
          name: 'Emma Thompson',
          email: 'emma.thompson@email.com',
          bio: 'Fashion lover and sustainable shopping advocate. Let\'s swap styles!',
          location: 'New York, NY',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
          rating: 4.7,
          totalTrades: 31,
          joinedAt: new Date('2023-08-10'),
          preferences: ['Fashion', 'Accessories', 'Vintage'],
          isVerified: true
        },
        {
          id: 'user_alex_sports',
          name: 'Alex Johnson',
          email: 'alex.johnson@email.com',
          bio: 'Outdoor enthusiast and gear collector. Always looking for quality sports equipment!',
          location: 'Denver, CO',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          rating: 4.6,
          totalTrades: 18,
          joinedAt: new Date('2023-09-05'),
          preferences: ['Sports', 'Outdoor Gear', 'Fitness'],
          isVerified: false
        }
      ];
      
      const createdUsers = [];
      for (const userData of realisticUsers) {
        // Note: In a real app, you'd create these through Firebase Auth
        // For demo purposes, we're just creating user profile documents
        const userRef = await addDoc(collection(db, 'user_profiles'), userData);
        createdUsers.push({ id: userRef.id, ...userData });
        console.log(`✅ Created user profile: ${userData.name}`);
      }
      
      console.log(`🎉 Successfully created ${createdUsers.length} realistic user profiles`);
      return createdUsers;
      
    } catch (error) {
      console.error('❌ Error creating realistic users:', error);
      throw error;
    }
  }
  
  // Create realistic conversations and offers
  static async createRealisticActivity(userId) {
    try {
      console.log('💬 Creating realistic trading activity...');
      
      // Create some realistic conversations
      const conversations = [
        {
          participants: [userId, 'user_sarah_tech'],
          participantNames: {
            [userId]: 'You',
            'user_sarah_tech': 'Sarah Chen'
          },
          itemId: 'sample_item_1',
          itemTitle: 'MacBook Pro 2021',
          conversationType: 'cash_offer',
          offerAmount: 1200,
          lastMessage: 'Hi! I\'m interested in your MacBook. Is it still available?',
          lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          unreadCount: { [userId]: 1, 'user_sarah_tech': 0 },
          status: 'pending',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          participants: [userId, 'user_mike_furniture'],
          participantNames: {
            [userId]: 'You',
            'user_mike_furniture': 'Mike Rodriguez'
          },
          itemId: 'sample_item_2',
          itemTitle: 'Vintage Dining Set',
          conversationType: 'trade_proposal',
          lastMessage: 'I have a beautiful coffee table I\'d love to trade for your dining set!',
          lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          unreadCount: { [userId]: 0, 'user_mike_furniture': 1 },
          status: 'pending',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ];
      
      const createdConversations = [];
      for (const convData of conversations) {
        const convRef = await addDoc(collection(db, 'conversations'), convData);
        createdConversations.push({ id: convRef.id, ...convData });
        console.log(`✅ Created conversation with ${convData.participantNames[Object.keys(convData.participantNames).find(k => k !== userId)]}`);
      }
      
      console.log(`🎉 Successfully created ${createdConversations.length} realistic conversations`);
      return createdConversations;
      
    } catch (error) {
      console.error('❌ Error creating realistic activity:', error);
      throw error;
    }
  }
  
  // Master function to seed all realistic data
  static async seedAllRealisticData(userId) {
    try {
      console.log('🌱 Starting comprehensive realistic data seeding...');
      
      const results = {
        items: await this.createRealisticItems(userId),
        users: await this.createRealisticUsers(),
        activity: await this.createRealisticActivity(userId)
      };
      
      console.log('🎉 Realistic data seeding completed successfully!');
      console.log(`📊 Summary:
        - ${results.items.length} realistic items created
        - ${results.users.length} user profiles created  
        - ${results.activity.length} conversations created`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error in comprehensive data seeding:', error);
      throw error;
    }
  }
}
   
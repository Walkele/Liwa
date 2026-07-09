/**
 * Database Seeding Script for Testing
 * 
 * This script populates the database with realistic test data for:
 * - Users with profile photos
 * - Items with photos
 * - Matches between users
 * - Conversations with messages
 * - Trade proposals
 * - Service listings
 * - Reviews and ratings
 * - Trust scores and verifications
 * 
 * Usage:
 * 1. Place this file in your project's scripts folder
 * 2. Run with: node scripts/seedDatabase.js
 * 3. Or import and call seedDatabase() from another script
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Test data
const testUsers = [
  {
    uid: 'test_user_1',
    name: 'Alice Johnson',
    email: 'alice@test.com',
    location: 'San Francisco, CA',
    rating: 4.8,
    totalTrades: 45,
    trustScore: 85,
    verificationLevel: 'VERIFIED',
    emailVerified: true,
    profilePhoto: null, // Will be set if we upload photos
    bio: 'Experienced trader, love finding unique items'
  },
  {
    uid: 'test_user_2',
    name: 'Bob Smith',
    email: 'bob@test.com',
    location: 'Los Angeles, CA',
    rating: 4.5,
    totalTrades: 32,
    trustScore: 78,
    verificationLevel: 'VERIFIED',
    emailVerified: true,
    profilePhoto: null,
    bio: 'Tech enthusiast, always looking for gadgets'
  },
  {
    uid: 'test_user_3',
    name: 'Carol Williams',
    email: 'carol@test.com',
    location: 'New York, NY',
    rating: 4.9,
    totalTrades: 67,
    trustScore: 92,
    verificationLevel: 'VERIFIED',
    emailVerified: true,
    profilePhoto: null,
    bio: 'Fashion lover, designer clothes trader'
  },
  {
    uid: 'test_user_4',
    name: 'David Brown',
    email: 'david@test.com',
    location: 'Chicago, IL',
    rating: 4.2,
    totalTrades: 18,
    trustScore: 70,
    verificationLevel: 'EMAIL',
    emailVerified: true,
    profilePhoto: null,
    bio: 'New to trading, excited to get started'
  },
  {
    uid: 'test_user_5',
    name: 'Eva Martinez',
    email: 'eva@test.com',
    location: 'Miami, FL',
    rating: 4.7,
    totalTrades: 54,
    trustScore: 88,
    verificationLevel: 'VERIFIED',
    emailVerified: true,
    profilePhoto: null,
    bio: 'Service provider: photographer and designer'
  }
];

const testItems = [
  {
    title: 'iPhone 13 Pro Max - Excellent Condition',
    description: 'iPhone 13 Pro Max in Sierra Blue, 256GB. Excellent condition, always kept in case. Includes original box and charger.',
    price: 800,
    estimatedValue: 750,
    category: 'Electronics',
    condition: 'Like New',
    images: [], // Will be populated with URLs
    userId: 'test_user_1',
    userName: 'Alice Johnson',
    userEmail: 'alice@test.com',
    location: 'San Francisco, CA',
    status: 'available',
    wantedItems: ['MacBook Pro', 'iPad Pro'],
    isOpenToAnything: false,
    tradePreferences: {
      acceptsCash: true,
      acceptsTrade: true,
      acceptsBarter: false,
      maxDistance: 50
    },
    valueTolerancePercent: 20,
    priorityScore: 0,
    views: 125,
    likes: 23,
    swipeRightCount: 15,
    swipeLeftCount: 8
  },
  {
    title: 'Vintage Levi\'s Denim Jacket',
    description: 'Authentic vintage Levi\'s denim jacket from the 90s. Size M, excellent condition. Perfect for street style.',
    price: 120,
    estimatedValue: 100,
    category: 'Clothing',
    condition: 'Good',
    images: [],
    userId: 'test_user_2',
    userName: 'Bob Smith',
    userEmail: 'bob@test.com',
    location: 'Los Angeles, CA',
    status: 'available',
    wantedItems: ['Vintage sneakers', 'Designer hoodie'],
    isOpenToAnything: false,
    tradePreferences: {
      acceptsCash: true,
      acceptsTrade: true,
      acceptsBarter: true,
      maxDistance: 100
    },
    valueTolerancePercent: 25,
    priorityScore: 0,
    views: 89,
    likes: 31,
    swipeRightCount: 28,
    swipeLeftCount: 5
  },
  {
    title: 'Gaming Setup - Complete',
    description: 'Complete gaming setup including 27" 144Hz monitor, mechanical keyboard, gaming mouse, and headset. All in excellent condition.',
    price: 600,
    estimatedValue: 550,
    category: 'Electronics',
    condition: 'Good',
    images: [],
    userId: 'test_user_3',
    userName: 'Carol Williams',
    userEmail: 'carol@test.com',
    location: 'New York, NY',
    status: 'available',
    wantedItems: ['Gaming PC', 'Nintendo Switch'],
    isOpenToAnything: true,
    tradePreferences: {
      acceptsCash: true,
      acceptsTrade: true,
      acceptsBarter: false,
      maxDistance: 75
    },
    valueTolerancePercent: 15,
    priorityScore: 0,
    views: 156,
    likes: 42,
    swipeRightCount: 38,
    swipeLeftCount: 12
  },
  {
    title: 'Professional Photography Service',
    description: 'Professional portrait and event photography. 2-hour session, edited photos delivered within 1 week.',
    price: 300,
    estimatedValue: 350,
    category: 'Services',
    condition: 'N/A',
    images: [],
    userId: 'test_user_5',
    userName: 'Eva Martinez',
    userEmail: 'eva@test.com',
    location: 'Miami, FL',
    status: 'available',
    wantedItems: ['Camera equipment', 'Lighting gear'],
    isOpenToAnything: false,
    tradePreferences: {
      acceptsCash: true,
      acceptsTrade: true,
      acceptsBarter: false,
      maxDistance: 200
    },
    valueTolerancePercent: 20,
    priorityScore: 0,
    views: 234,
    likes: 67,
    swipeRightCount: 55,
    swipeLeftCount: 18,
    isService: true,
    serviceDetails: {
      duration: '2 hours',
      location: 'On-site or studio',
      deliverables: '20 edited photos',
      availability: 'Weekends'
    }
  },
  {
    title: 'Rare Book Collection',
    description: 'Collection of 5 rare first-edition books from the 1950s. All in excellent condition with dust jackets.',
    price: 500,
    estimatedValue: 600,
    category: 'Books',
    condition: 'Like New',
    images: [],
    userId: 'test_user_4',
    userName: 'David Brown',
    userEmail: 'david@test.com',
    location: 'Chicago, IL',
    status: 'available',
    wantedItems: ['Modern literature', 'Art books'],
    isOpenToAnything: false,
    tradePreferences: {
      acceptsCash: true,
      acceptsTrade: true,
      acceptsBarter: true,
      maxDistance: 150
    },
    valueTolerancePercent: 30,
    priorityScore: 0,
    views: 78,
    likes: 19,
    swipeRightCount: 14,
    swipeLeftCount: 6
  }
];

const testServices = [
  {
    title: 'Graphic Design Services',
    description: 'Professional graphic design for logos, branding, and marketing materials. Quick turnaround and unlimited revisions.',
    providerId: 'test_user_5',
    providerName: 'Eva Martinez',
    providerEmail: 'eva@test.com',
    providerLocation: 'Miami, FL',
    category: 'Design',
    price: 250,
    estimatedValue: 300,
    status: 'available',
    rating: 4.8,
    totalReviews: 23,
    completionRate: 95,
    avgResponseTime: 2,
    availability: 'Mon-Fri',
    deliverables: 'High-res files, source files',
    duration: '3-5 business days',
    images: [],
    views: 145,
    likes: 38
  },
  {
    title: 'Web Development',
    description: 'Custom website development using React and Node.js. Responsive design, SEO optimized, and fast loading.',
    providerId: 'test_user_1',
    providerName: 'Alice Johnson',
    providerEmail: 'alice@test.com',
    providerLocation: 'San Francisco, CA',
    category: 'Technology',
    price: 1500,
    estimatedValue: 1800,
    status: 'available',
    rating: 4.9,
    totalReviews: 15,
    completionRate: 100,
    avgResponseTime: 4,
    availability: 'Flexible',
    deliverables: 'Source code, deployment support',
    duration: '2-4 weeks',
    images: [],
    views: 89,
    likes: 27
  }
];

const testReviews = [
  {
    reviewerId: 'test_user_2',
    reviewerName: 'Bob Smith',
    targetUserId: 'test_user_1',
    targetUserName: 'Alice Johnson',
    rating: 5,
    comment: 'Excellent trade! Item was exactly as described, very responsive and professional.',
    category: 'item_trade',
    relatedItemId: null,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  },
  {
    reviewerId: 'test_user_3',
    reviewerName: 'Carol Williams',
    targetUserId: 'test_user_5',
    targetUserName: 'Eva Martinez',
    rating: 5,
    comment: 'Amazing photography service! Eva captured exactly what I wanted. Highly recommend!',
    category: 'service',
    relatedServiceId: null,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
  },
  {
    reviewerId: 'test_user_1',
    reviewerName: 'Alice Johnson',
    targetUserId: 'test_user_3',
    targetUserName: 'Carol Williams',
    rating: 4,
    comment: 'Great experience overall. Item arrived safely and in good condition.',
    category: 'item_trade',
    relatedItemId: null,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  }
];

const testVerifications = [
  {
    userId: 'test_user_1',
    type: 'email',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    method: 'firebase_auth',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_1',
    type: 'phone',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)),
    method: 'sms',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_2',
    type: 'email',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
    method: 'firebase_auth',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_3',
    type: 'email',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    method: 'firebase_auth',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_3',
    type: 'phone',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    method: 'sms',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_5',
    type: 'email',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)),
    method: 'firebase_auth',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_5',
    type: 'phone',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)),
    method: 'sms',
    verifiedBy: 'system'
  },
  {
    userId: 'test_user_5',
    type: 'identity',
    status: 'verified',
    verifiedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    method: 'document_upload',
    verifiedBy: 'admin'
  }
];

// Helper function to create test data
async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // 1. Seed Users
    console.log('📝 Seeding users...');
    for (const user of testUsers) {
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        createdAt: serverTimestamp(),
        profilePhotoUpdatedAt: null
      });
      console.log(`✅ Created user: ${user.name}`);
    }

    // 2. Seed Items
    console.log('📦 Seeding items...');
    const itemIds = [];
    for (const item of testItems) {
      const itemRef = await addDoc(collection(db, 'items'), {
        ...item,
        createdAt: serverTimestamp()
      });
      itemIds.push(itemRef.id);
      console.log(`✅ Created item: ${item.title}`);
    }

    // 3. Seed Services
    console.log('🔧 Seeding services...');
    const serviceIds = [];
    for (const service of testServices) {
      const serviceRef = await addDoc(collection(db, 'services'), {
        ...service,
        createdAt: serverTimestamp()
      });
      serviceIds.push(serviceRef.id);
      console.log(`✅ Created service: ${service.title}`);
    }

    // 4. Seed Reviews
    console.log('⭐ Seeding reviews...');
    for (const review of testReviews) {
      await addDoc(collection(db, 'reviews'), review);
      console.log(`✅ Created review by ${review.reviewerName}`);
    }

    // 5. Seed Verifications
    console.log('✅ Seeding verifications...');
    for (const verification of testVerifications) {
      await addDoc(collection(db, 'verifications'), verification);
      console.log(`✅ Created verification for user ${verification.userId}`);
    }

    // 6. Seed Matches
    console.log('💕 Seeding matches...');
    const matchId1 = await createMatch(
      'test_user_1',
      'test_user_2',
      itemIds[0],
      itemIds[1]
    );
    console.log(`✅ Created match 1: Alice <-> Bob`);

    const matchId2 = await createMatch(
      'test_user_2',
      'test_user_3',
      itemIds[1],
      itemIds[2]
    );
    console.log(`✅ Created match 2: Bob <-> Carol`);

    // 7. Seed Conversations with Messages
    console.log('💬 Seeding conversations...');
    await seedConversationMessages(matchId1, 'test_user_1', 'test_user_2');
    await seedConversationMessages(matchId2, 'test_user_2', 'test_user_3');

    // 8. Seed Swipes
    console.log('👆 Seeding swipes...');
    await seedSwipes(itemIds);

    console.log('🎉 Database seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${testUsers.length}`);
    console.log(`- Items: ${testItems.length}`);
    console.log(`- Services: ${testServices.length}`);
    console.log(`- Reviews: ${testReviews.length}`);
    console.log(`- Verifications: ${testVerifications.length}`);
    console.log(`- Matches: 2`);
    console.log(`- Conversations: 2`);
    console.log(`- Messages: 6 per conversation`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

async function createMatch(user1Id, user2Id, item1Id, item2Id) {
  const matchData = {
    participants: [user1Id, user2Id],
    user1Id,
    user2Id,
    user1ItemId: item1Id,
    user2ItemId: item2Id,
    user1ItemTitle: testItems.find(i => i.userId === user1Id)?.title || 'Item 1',
    user2ItemTitle: testItems.find(i => i.userId === user2Id)?.title || 'Item 2',
    status: 'matched',
    createdAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
    conversationStarted: true,
    tradeCompleted: false,
    lockStatus: 'soft_locked'
  };

  const matchRef = await addDoc(collection(db, 'matches'), matchData);
  
  // Create conversation
  const conversationId = `match_${[user1Id, user2Id].sort().join('_')}_${Date.now()}`;
  const conversationData = {
    id: conversationId,
    type: 'match',
    matchId: matchRef.id,
    participants: [user1Id, user2Id],
    participantNames: {
      [user1Id]: testUsers.find(u => u.uid === user1Id)?.name || 'User 1',
      [user2Id]: testUsers.find(u => u.uid === user2Id)?.name || 'User 2'
    },
    participantPhotos: {
      [user1Id]: null,
      [user2Id]: null
    },
    status: 'active',
    lastMessage: '🎉 You matched! Compare items and make an offer',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, 'messages'), conversationData);
  
  // Update match with conversation ID
  await updateDoc(matchRef, { conversationId });
  
  return matchRef.id;
}

async function seedConversationMessages(matchId, user1Id, user2Id) {
  const conversationId = `match_${[user1Id, user2Id].sort().join('_')}`;
  
  const messages = [
    {
      conversationId,
      senderId: user1Id,
      text: 'Hey! I saw we matched on our items. Would you be interested in trading?',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
    },
    {
      conversationId,
      senderId: user2Id,
      text: 'Hi! Yes, I\'m definitely interested. Your item looks great!',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
    },
    {
      conversationId,
      senderId: user1Id,
      text: 'Awesome! Would you like to meet up to inspect the items before finalizing the trade?',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
    },
    {
      conversationId,
      senderId: user2Id,
      text: 'That sounds perfect. I\'m free this weekend if that works for you?',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 12 * 60 * 60 * 1000))
    },
    {
      conversationId,
      senderId: user1Id,
      text: 'Saturday afternoon works great for me. Let me know what time and location works best for you.',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000))
    },
    {
      conversationId,
      senderId: user2Id,
      text: 'How about 2pm at the downtown coffee shop? It\'s central for both of us.',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000))
    }
  ];

  for (const message of messages) {
    await addDoc(collection(db, 'messages'), message);
  }
}

async function seedSwipes(itemIds) {
  const swipes = [
    {
      userId: 'test_user_1',
      itemId: itemIds[1],
      itemOwnerId: 'test_user_2',
      direction: 'right',
      createdAt: serverTimestamp(),
      processed: true
    },
    {
      userId: 'test_user_2',
      itemId: itemIds[0],
      itemOwnerId: 'test_user_1',
      direction: 'right',
      createdAt: serverTimestamp(),
      processed: true
    },
    {
      userId: 'test_user_2',
      itemId: itemIds[2],
      itemOwnerId: 'test_user_3',
      direction: 'right',
      createdAt: serverTimestamp(),
      processed: true
    },
    {
      userId: 'test_user_3',
      itemId: itemIds[1],
      itemOwnerId: 'test_user_2',
      direction: 'right',
      createdAt: serverTimestamp(),
      processed: true
    },
    {
      userId: 'test_user_1',
      itemId: itemIds[2],
      itemOwnerId: 'test_user_3',
      direction: 'left',
      createdAt: serverTimestamp(),
      processed: true
    },
    {
      userId: 'test_user_3',
      itemId: itemIds[0],
      itemOwnerId: 'test_user_1',
      direction: 'left',
      createdAt: serverTimestamp(),
      processed: true
    }
  ];

  for (const swipe of swipes) {
    await addDoc(collection(db, 'swipes'), swipe);
  }
}

// Run seeding if this file is executed directly
if (typeof window === 'undefined') {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase, testUsers, testItems, testServices, testReviews, testVerifications };

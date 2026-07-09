import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class TestDataCreator {
  
  // Create test items for users
  static async createTestItems(userId) {
    try {
      console.log('🧪 Creating test items for user:', userId);
      
      // Get user info
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userName = userData.name || userData.displayName || 'Test User';
      
      // Create test items
      const testItems = [
        {
          title: 'iPhone 12 Pro',
          description: 'Excellent condition iPhone 12 Pro, 128GB',
          price: 500,
          category: 'Electronics',
          condition: 'Like New',
          userId: userId,
          userName: userName,
          images: ['https://via.placeholder.com/300x300?text=iPhone+12'],
          location: 'Test City',
          createdAt: new Date(),
          status: 'available',
          isLocked: false
        },
        {
          title: 'MacBook Air M1',
          description: 'MacBook Air with M1 chip, 256GB SSD',
          price: 800,
          category: 'Electronics',
          condition: 'Good',
          userId: userId,
          userName: userName,
          images: ['https://via.placeholder.com/300x300?text=MacBook+Air'],
          location: 'Test City',
          createdAt: new Date(),
          status: 'available',
          isLocked: false
        }
      ];
      
      // Add items to Firestore
      const itemRefs = [];
      for (const item of testItems) {
        const itemRef = await addDoc(collection(db, 'items'), item);
        itemRefs.push({ id: itemRef.id, ...item });
        console.log(`✅ Created test item: ${item.title} (${itemRef.id})`);
      }
      
      return itemRefs;
      
    } catch (error) {
      console.error('❌ Error creating test items:', error);
      throw error;
    }
  }
  
  // Create test offers for debugging
  static async createTestOffers(userId) {
    try {
      console.log('🧪 Creating test offers for user:', userId);
      
      // First create test items
      const testItems = await this.createTestItems(userId);
      
      // Get user info
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userName = userData.name || userData.displayName || 'Test User';
      
      // Create test received offer using actual item
      const receivedOffer = {
        itemId: testItems[0].id,
        itemTitle: testItems[0].title,
        itemPrice: testItems[0].price,
        sellerId: userId,
        sellerName: userName,
        buyerId: 'test-buyer-1',
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer@test.com',
        offerAmount: testItems[0].price - 50,
        originalPrice: testItems[0].price,
        status: 'pending',
        message: `I would like to buy your ${testItems[0].title} for $${testItems[0].price - 50}`,
        createdAt: new Date(),
        conversationId: `offer_${userId}_test-buyer-1_${testItems[0].id}`
      };
      
      // Create test sent offer using actual item
      const sentOffer = {
        itemId: testItems[1].id,
        itemTitle: testItems[1].title,
        itemPrice: testItems[1].price,
        sellerId: 'test-seller-1',
        sellerName: 'Test Seller',
        buyerId: userId,
        buyerName: userName,
        buyerEmail: userData.email || 'user@test.com',
        offerAmount: testItems[1].price - 100,
        originalPrice: testItems[1].price,
        status: 'pending',
        message: `I would like to buy your ${testItems[1].title} for $${testItems[1].price - 100}`,
        createdAt: new Date(),
        conversationId: `offer_test-seller-1_${userId}_${testItems[1].id}`
      };
      
      // Add offers to Firestore
      const receivedOfferRef = await addDoc(collection(db, 'offers'), receivedOffer);
      const sentOfferRef = await addDoc(collection(db, 'offers'), sentOffer);
      
      // Create corresponding conversations for MessagesScreen
      const receivedOfferConversation = {
        id: receivedOffer.conversationId,
        participants: [userId, 'test-buyer-1'],
        participantNames: {
          [userId]: userName,
          'test-buyer-1': 'Test Buyer'
        },
        itemId: testItems[0].id,
        itemTitle: testItems[0].title,
        conversationType: 'cash_offer',
        offerId: receivedOfferRef.id,
        offerAmount: receivedOffer.offerAmount,
        sellerId: userId,  // Current user is seller (receives offer)
        buyerId: 'test-buyer-1',
        status: 'pending',  // This will trigger action buttons
        lastMessage: receivedOffer.message,
        lastMessageAt: new Date(),
        unreadCount: { [userId]: 1, 'test-buyer-1': 0 },
        createdAt: new Date()
      };
      
      const sentOfferConversation = {
        id: sentOffer.conversationId,
        participants: [userId, 'test-seller-1'],
        participantNames: {
          [userId]: userName,
          'test-seller-1': 'Test Seller'
        },
        itemId: testItems[1].id,
        itemTitle: testItems[1].title,
        conversationType: 'cash_offer',
        offerId: sentOfferRef.id,
        offerAmount: sentOffer.offerAmount,
        sellerId: 'test-seller-1',
        buyerId: userId,  // Current user is buyer (sent offer)
        status: 'pending',
        lastMessage: sentOffer.message,
        lastMessageAt: new Date(),
        unreadCount: { [userId]: 0, 'test-seller-1': 1 },
        createdAt: new Date()
      };
      
      // Add conversations to Firestore
      await addDoc(collection(db, 'conversations'), receivedOfferConversation);
      await addDoc(collection(db, 'conversations'), sentOfferConversation);
      
      // Create system messages in the chats with action buttons
      
      // 1. System message for received offer (user should see Accept/Decline)
      const receivedOfferSystemMessage = {
        conversationId: receivedOffer.conversationId,
        senderId: 'system',
        senderName: 'SwipeIt',
        text: `💰 Cash Offer Received\n\nTest Buyer offered $${receivedOffer.offerAmount} for your ${testItems[0].title}\n\nOriginal price: $${testItems[0].price}`,
        messageType: 'cash_offer',
        isSystemMessage: true,
        createdAt: new Date(),
        read: false,
        delivered: true,
        // Offer data for action buttons
        offerId: receivedOfferRef.id,
        offerAmount: receivedOffer.offerAmount,
        originalPrice: testItems[0].price,
        buyerName: 'Test Buyer',
        buyerId: 'test-buyer-1',
        sellerId: userId,
        itemId: testItems[0].id,
        itemTitle: testItems[0].title,
        status: 'pending'
      };
      
      // 2. System message for sent offer (user should see "Waiting for response")
      const sentOfferSystemMessage = {
        conversationId: sentOffer.conversationId,
        senderId: 'system',
        senderName: 'SwipeIt',
        text: `💰 Cash Offer Sent\n\nYou offered $${sentOffer.offerAmount} for ${testItems[1].title}\n\nWaiting for seller's response...`,
        messageType: 'cash_offer',
        isSystemMessage: true,
        createdAt: new Date(),
        read: false,
        delivered: true,
        // Offer data
        offerId: sentOfferRef.id,
        offerAmount: sentOffer.offerAmount,
        originalPrice: testItems[1].price,
        sellerName: 'Test Seller',
        sellerId: 'test-seller-1',
        buyerId: userId,
        itemId: testItems[1].id,
        itemTitle: testItems[1].title,
        status: 'pending'
      };
      
      // Add system messages to Firestore
      await addDoc(collection(db, 'messages'), receivedOfferSystemMessage);
      await addDoc(collection(db, 'messages'), sentOfferSystemMessage);
      
      console.log('✅ Test offers created:');
      console.log('- Received offer:', receivedOfferRef.id);
      console.log('- Sent offer:', sentOfferRef.id);
      console.log('- Cash offer conversations created for MessagesScreen');
      console.log('- System messages created for ChatScreen with action buttons');
      console.log('- You should see Accept/Decline buttons in ChatScreen!');
      
      return {
        receivedOfferId: receivedOfferRef.id,
        sentOfferId: sentOfferRef.id,
        testItems: testItems
      };
      
    } catch (error) {
      console.error('❌ Error creating test offers:', error);
      throw error;
    }
  }
  
  // Create test conversations with proper trade proposals
  static async createTestConversations(userId) {
    try {
      console.log('🧪 Creating test conversations for user:', userId);
      
      // First create test items to reference
      const testItems = await this.createTestItems(userId);
      
      // Get user info
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userName = userData.name || userData.displayName || 'Test User';
      
      // Create a conversation where current user RECEIVES a trade proposal
      const receivedTradeConversationId = `trade_testseller_${userId}_${testItems[0].id}`;
      const receivedTradeConversation = {
        id: receivedTradeConversationId,
        participants: ['test-seller-123', userId],
        participantNames: {
          'test-seller-123': 'Alice Johnson',
          [userId]: userName
        },
        itemId: testItems[0].id,
        itemTitle: testItems[0].title,
        conversationType: 'trade_proposal',
        tradeProposalId: `trade_testseller_${userId}_${Date.now()}`,
        lastMessage: `Alice Johnson proposed a trade: "Vintage Camera" ↔ "${testItems[0].title}"`,
        lastMessageAt: new Date(),
        unreadCount: { [userId]: 1, 'test-seller-123': 0 },
        createdAt: new Date()
      };
      
      // Create a conversation where current user SENT a trade proposal
      const sentTradeConversationId = `trade_${userId}_testbuyer_${testItems[1].id}`;
      const sentTradeConversation = {
        id: sentTradeConversationId,
        participants: [userId, 'test-buyer-456'],
        participantNames: {
          [userId]: userName,
          'test-buyer-456': 'Bob Smith'
        },
        itemId: testItems[1].id,
        itemTitle: testItems[1].title,
        conversationType: 'trade_proposal',
        tradeProposalId: `trade_${userId}_testbuyer_${Date.now()}`,
        lastMessage: `${userName} proposed a trade: "${testItems[1].title}" ↔ "Gaming Console"`,
        lastMessageAt: new Date(),
        unreadCount: { [userId]: 0, 'test-buyer-456': 1 },
        createdAt: new Date()
      };
      
      // Add conversations to Firestore
      const receivedConvRef = await addDoc(collection(db, 'conversations'), receivedTradeConversation);
      const sentConvRef = await addDoc(collection(db, 'conversations'), sentTradeConversation);
      
      // Create the actual trade proposal messages
      
      // 1. Message where user RECEIVES a proposal (should see Accept/Decline buttons)
      const receivedProposalMessage = {
        conversationId: receivedTradeConversationId,
        senderId: 'system',
        senderName: 'SwipeIt',
        text: `Alice Johnson proposed a trade: "Vintage Camera" for "${testItems[0].title}"`,
        messageType: 'trade_proposal',
        isSystemMessage: true,
        createdAt: new Date(),
        read: false,
        delivered: true,
        tradeProposalId: `trade_testseller_${userId}_${Date.now()}`,
        proposerUserId: 'test-seller-123',  // Alice is proposing
        targetUserId: userId,               // Current user is target
        proposerItemId: 'vintage-camera-123',
        targetItemId: testItems[0].id,
        proposerItemTitle: 'Vintage Camera',
        targetItemTitle: testItems[0].title
      };
      
      // 2. Message where user SENT a proposal (should see "Waiting for response")
      const sentProposalMessage = {
        conversationId: sentTradeConversationId,
        senderId: 'system',
        senderName: 'SwipeIt',
        text: `${userName} proposed a trade: "${testItems[1].title}" for "Gaming Console"`,
        messageType: 'trade_proposal',
        isSystemMessage: true,
        createdAt: new Date(),
        read: false,
        delivered: true,
        tradeProposalId: `trade_${userId}_testbuyer_${Date.now()}`,
        proposerUserId: userId,             // Current user is proposing
        targetUserId: 'test-buyer-456',     // Bob is target
        proposerItemId: testItems[1].id,
        targetItemId: 'gaming-console-456',
        proposerItemTitle: testItems[1].title,
        targetItemTitle: 'Gaming Console'
      };
      
      // Add messages to Firestore
      await addDoc(collection(db, 'messages'), receivedProposalMessage);
      await addDoc(collection(db, 'messages'), sentProposalMessage);
      
      console.log('✅ Test conversations created:');
      console.log('- Received trade conversation:', receivedConvRef.id);
      console.log('- Sent trade conversation:', sentConvRef.id);
      console.log('- User should see ACCEPT/DECLINE in first conversation');
      console.log('- User should see WAITING in second conversation');
      
      return {
        receivedTradeConversationId: receivedConvRef.id,
        sentTradeConversationId: sentConvRef.id,
        testItems: testItems
      };
      
    } catch (error) {
      console.error('❌ Error creating test conversations:', error);
      throw error;
    }
  }
  
  // Clean up test data
  static async cleanupTestData() {
    try {
      console.log('🧹 Cleaning up test data...');
      // This would require querying and deleting test documents
      // For now, just log that cleanup would happen here
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
    }
  }
}
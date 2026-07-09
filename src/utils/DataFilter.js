// Data filtering utilities to ensure no test/mock data appears in production UI

export class DataFilter {
  
  // Check if an item is test/mock data
  static isTestItem(item) {
    if (!item) return false;
    
    // Only filter out obvious test patterns to avoid filtering real user data
    const obviousTestPatterns = {
      // Only filter obvious test IDs
      id: [
        'test_item_', 'sample_item_', 'demo_item_', 'mock_item_'
      ],
      
      // Only filter obvious test titles
      title: [
        'Test Item', 'Sample Item', 'Demo Item', 'Mock Item'
      ],
      
      // Only filter obvious test users
      userName: [
        'Test User', 'Sample User', 'Demo User', 'Mock User'
      ],
      
      // Only filter obvious test locations
      location: [
        'Test City', 'Sample Location', 'Demo Location'
      ]
    };
    
    // Check obvious test ID patterns
    if (obviousTestPatterns.id.some(pattern => item.id?.toLowerCase().includes(pattern.toLowerCase()))) {
      console.log('❌ Filtered out due to obvious test ID pattern:', item.id);
      return true;
    }
    
    // Check obvious test title patterns
    if (obviousTestPatterns.title.some(pattern => item.title?.includes(pattern))) {
      console.log('❌ Filtered out due to obvious test title pattern:', item.title);
      return true;
    }
    
    // Check obvious test user patterns
    if (obviousTestPatterns.userName.some(pattern => item.userName?.includes(pattern))) {
      console.log('❌ Filtered out due to obvious test user pattern:', item.userName);
      return true;
    }
    
    // Check obvious test location patterns
    if (obviousTestPatterns.location.some(pattern => item.location === pattern)) {
      console.log('❌ Filtered out due to obvious test location pattern:', item.location);
      return true;
    }
    
    // Don't filter based on other patterns that might catch real user data
    return false;
  }
  
  // Filter out test items from an array
  static filterTestItems(items) {
    if (!Array.isArray(items)) return items;
    
    return items.filter(item => !this.isTestItem(item));
  }
  
  // Check if a conversation is test data
  static isTestConversation(conversation) {
    if (!conversation) return false;
    
    // Check participant names
    if (conversation.participantNames) {
      const names = Object.values(conversation.participantNames);
      if (names.some(name => 
        name.includes('Test') || 
        name.includes('Alice') || 
        name.includes('Bob') ||
        name.includes('Sarah Chen') ||
        name.includes('Mike Rodriguez') ||
        name.includes('Emma Thompson') ||
        name.includes('Alex Johnson')
      )) {
        return true;
      }
    }
    
    // Check conversation ID
    if (conversation.id && (
      conversation.id.includes('test') ||
      conversation.id.includes('offer_') ||
      conversation.id.includes('trade_')
    )) {
      return true;
    }
    
    // Check participants
    if (conversation.participants && conversation.participants.some(id =>
      id.includes('test-') ||
      id.includes('testseller') ||
      id.includes('testbuyer')
    )) {
      return true;
    }
    
    return false;
  }
  
  // Filter out test conversations
  static filterTestConversations(conversations) {
    if (!Array.isArray(conversations)) return conversations;
    
    return conversations.filter(conversation => !this.isTestConversation(conversation));
  }
  
  // Check if a message is test data
  static isTestMessage(message) {
    if (!message) return false;
    
    // Check sender name
    if (message.senderName && (
      message.senderName.includes('Test') ||
      message.senderName.includes('Alice') ||
      message.senderName.includes('Bob')
    )) {
      return true;
    }
    
    // Check conversation ID
    if (message.conversationId && (
      message.conversationId.includes('test') ||
      message.conversationId.includes('offer_') ||
      message.conversationId.includes('trade_')
    )) {
      return true;
    }
    
    // Check sender ID
    if (message.senderId && message.senderId.includes('test-')) {
      return true;
    }
    
    return false;
  }
  
  // Filter out test messages
  static filterTestMessages(messages) {
    if (!Array.isArray(messages)) return messages;
    
    return messages.filter(message => !this.isTestMessage(message));
  }
  
  // Check if an offer is test data
  static isTestOffer(offer) {
    if (!offer) return false;
    
    // Check user names
    if ((offer.buyerName && offer.buyerName.includes('Test')) ||
        (offer.sellerName && offer.sellerName.includes('Test'))) {
      return true;
    }
    
    // Check user IDs
    if ((offer.buyerId && offer.buyerId.includes('test-')) ||
        (offer.sellerId && offer.sellerId.includes('test-'))) {
      return true;
    }
    
    // Check item title
    if (offer.itemTitle && offer.itemTitle.includes('Test')) {
      return true;
    }
    
    // Check conversation ID
    if (offer.conversationId && (
      offer.conversationId.includes('test') ||
      offer.conversationId.includes('offer_')
    )) {
      return true;
    }
    
    return false;
  }
  
  // Filter out test offers
  static filterTestOffers(offers) {
    if (!Array.isArray(offers)) return offers;
    
    return offers.filter(offer => !this.isTestOffer(offer));
  }
  
  // Production-safe data loader wrapper
  static async loadProductionData(loadFunction) {
    try {
      const data = await loadFunction();
      
      if (Array.isArray(data)) {
        // Filter based on data type
        if (data.length > 0) {
          const firstItem = data[0];
          
          if (firstItem.title && firstItem.price) {
            // Looks like items
            return this.filterTestItems(data);
          } else if (firstItem.participants) {
            // Looks like conversations
            return this.filterTestConversations(data);
          } else if (firstItem.conversationId) {
            // Looks like messages
            return this.filterTestMessages(data);
          } else if (firstItem.offerAmount) {
            // Looks like offers
            return this.filterTestOffers(data);
          }
        }
        
        return data;
      }
      
      return data;
      
    } catch (error) {
      console.error('Error loading production data:', error);
      return [];
    }
  }
}

export default DataFilter;
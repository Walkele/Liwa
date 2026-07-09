import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class DataCleanupService {
  // Clean all data for current user
  static async cleanAllUserData(userId) {
    try {
      console.log(`🧹 Starting complete data cleanup for user: ${userId}`);
      
      const results = {
        items: 0,
        offers: 0,
        conversations: 0,
        messages: 0,
        trades: 0,
        favorites: 0,
        swipes: 0,
        notifications: 0,
        userDocument: 0,
        total: 0
      };
      
      // Clean user's items
      results.items = await this.cleanUserItems(userId);
      
      // Clean user's offers (as buyer and seller)
      results.offers = await this.cleanUserOffers(userId);
      
      // Clean user's conversations
      results.conversations = await this.cleanUserConversations(userId);
      
      // Clean user's messages
      results.messages = await this.cleanUserMessages(userId);
      
      // Clean user's trades
      results.trades = await this.cleanUserTrades(userId);
      
      // Clean user's favorites
      results.favorites = await this.cleanUserFavorites(userId);
      
      // Clean user's swipes
      results.swipes = await this.cleanUserSwipes(userId);
      
      // Clean user's notifications
      results.notifications = await this.cleanUserNotifications(userId);
      
      // Finally, clean user document
      results.userDocument = await this.cleanUserDocument(userId);
      
      results.total = Object.values(results).reduce((sum, count) => sum + count, 0);
      
      console.log(`✅ Complete data cleanup finished:`, results);
      return results;
    } catch (error) {
      console.error('Error in complete data cleanup:', error);
      throw error;
    }
  }

  // Clean user's items
  static async cleanUserItems(userId) {
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', userId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const batch = writeBatch(db);
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (itemsSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${itemsSnapshot.size} items`);
      return itemsSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user items:', error);
      return 0;
    }
  }

  // Clean user's offers
  static async cleanUserOffers(userId) {
    try {
      // Get offers where user is buyer
      const buyerOffersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userId)
      );
      const buyerOffersSnapshot = await getDocs(buyerOffersQuery);
      
      // Get offers where user is seller
      const sellerOffersQuery = query(
        collection(db, 'offers'),
        where('sellerId', '==', userId)
      );
      const sellerOffersSnapshot = await getDocs(sellerOffersQuery);
      
      const batch = writeBatch(db);
      
      buyerOffersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      sellerOffersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const totalOffers = buyerOffersSnapshot.size + sellerOffersSnapshot.size;
      
      if (totalOffers > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${totalOffers} offers`);
      return totalOffers;
    } catch (error) {
      console.error('Error cleaning user offers:', error);
      return 0;
    }
  }

  // Clean user's conversations
  static async cleanUserConversations(userId) {
    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);
      
      const batch = writeBatch(db);
      conversationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (conversationsSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${conversationsSnapshot.size} conversations`);
      return conversationsSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user conversations:', error);
      return 0;
    }
  }

  // Clean user's messages
  static async cleanUserMessages(userId) {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', userId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (messagesSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${messagesSnapshot.size} messages`);
      return messagesSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user messages:', error);
      return 0;
    }
  }

  // Clean user's trades
  static async cleanUserTrades(userId) {
    try {
      const tradesQuery = query(
        collection(db, 'trades'),
        where('participants', 'array-contains', userId)
      );
      const tradesSnapshot = await getDocs(tradesQuery);
      
      const batch = writeBatch(db);
      tradesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (tradesSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${tradesSnapshot.size} trades`);
      return tradesSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user trades:', error);
      return 0;
    }
  }

  // Clean user's favorites
  static async cleanUserFavorites(userId) {
    try {
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', userId)
      );
      const favoritesSnapshot = await getDocs(favoritesQuery);
      
      const batch = writeBatch(db);
      favoritesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (favoritesSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${favoritesSnapshot.size} favorites`);
      return favoritesSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user favorites:', error);
      return 0;
    }
  }

  // Clean user's swipes
  static async cleanUserSwipes(userId) {
    try {
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId)
      );
      const swipesSnapshot = await getDocs(swipesQuery);
      
      const batch = writeBatch(db);
      swipesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (swipesSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${swipesSnapshot.size} swipes`);
      return swipesSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user swipes:', error);
      return 0;
    }
  }

  // Clean user's notifications
  static async cleanUserNotifications(userId) {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      const batch = writeBatch(db);
      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (notificationsSnapshot.size > 0) {
        await batch.commit();
      }
      
      console.log(`🗑️ Deleted ${notificationsSnapshot.size} notifications`);
      return notificationsSnapshot.size;
    } catch (error) {
      console.error('Error cleaning user notifications:', error);
      return 0;
    }
  }

  // Clean user document
  static async cleanUserDocument(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      console.log(`🗑️ Deleted user document`);
      return 1;
    } catch (error) {
      console.error('Error cleaning user document:', error);
      return 0;
    }
  }

  // Clean all data in the entire database (DANGEROUS - for development only)
  static async cleanAllDatabaseData() {
    try {
      console.log('🧹 Starting complete database cleanup...');
      
      const collections = [
        'items',
        'offers', 
        'conversations',
        'messages',
        'trades',
        'favorites',
        'swipes',
        'notifications',
        'users'
      ];
      
      const results = {};
      
      for (const collectionName of collections) {
        results[collectionName] = await this.cleanCollection(collectionName);
      }
      
      const total = Object.values(results).reduce((sum, count) => sum + count, 0);
      results.total = total;
      
      console.log('✅ Complete database cleanup finished:', results);
      return results;
    } catch (error) {
      console.error('Error in complete database cleanup:', error);
      throw error;
    }
  }

  // Clean a specific collection
  static async cleanCollection(collectionName) {
    try {
      const collectionRef = collection(db, collectionName);
      
      // Process in batches to avoid memory issues
      let totalDeleted = 0;
      let hasMore = true;
      
      while (hasMore) {
        const snapshot = await getDocs(query(collectionRef, limit(100)));
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        totalDeleted += snapshot.size;
        
        console.log(`🗑️ Deleted ${snapshot.size} documents from ${collectionName} (total: ${totalDeleted})`);
        
        // If we got less than 100 documents, we're done
        if (snapshot.size < 100) {
          hasMore = false;
        }
      }
      
      return totalDeleted;
    } catch (error) {
      console.error(`Error cleaning collection ${collectionName}:`, error);
      return 0;
    }
  }

  // Clean test data only (keeps real user data)
  static async cleanTestDataOnly() {
    try {
      console.log('🧹 Cleaning test data only...');
      
      const results = {
        testItems: 0,
        testUsers: 0,
        testOffers: 0,
        total: 0
      };
      
      // Clean items with test patterns
      const testItemsQuery = query(
        collection(db, 'items'),
        where('title', '>=', 'Test'),
        where('title', '<', 'Tesu')
      );
      const testItemsSnapshot = await getDocs(testItemsQuery);
      
      const batch1 = writeBatch(db);
      testItemsSnapshot.docs.forEach(doc => {
        batch1.delete(doc.ref);
      });
      
      if (testItemsSnapshot.size > 0) {
        await batch1.commit();
      }
      results.testItems = testItemsSnapshot.size;
      
      // Clean users with test emails
      const testUsersQuery = query(
        collection(db, 'users'),
        where('email', '>=', 'test'),
        where('email', '<', 'tesu')
      );
      const testUsersSnapshot = await getDocs(testUsersQuery);
      
      const batch2 = writeBatch(db);
      testUsersSnapshot.docs.forEach(doc => {
        batch2.delete(doc.ref);
      });
      
      if (testUsersSnapshot.size > 0) {
        await batch2.commit();
      }
      results.testUsers = testUsersSnapshot.size;
      
      results.total = results.testItems + results.testUsers + results.testOffers;
      
      console.log('✅ Test data cleanup finished:', results);
      return results;
    } catch (error) {
      console.error('Error cleaning test data:', error);
      throw error;
    }
  }

  // Get data statistics before cleanup
  static async getDataStatistics(userId = null) {
    try {
      const stats = {
        items: 0,
        offers: 0,
        conversations: 0,
        messages: 0,
        trades: 0,
        favorites: 0,
        swipes: 0,
        notifications: 0,
        users: 0
      };
      
      if (userId) {
        // Get stats for specific user
        const itemsQuery = query(collection(db, 'items'), where('userId', '==', userId));
        const itemsSnapshot = await getDocs(itemsQuery);
        stats.items = itemsSnapshot.size;
        
        const buyerOffersQuery = query(collection(db, 'offers'), where('buyerId', '==', userId));
        const sellerOffersQuery = query(collection(db, 'offers'), where('sellerId', '==', userId));
        const buyerOffersSnapshot = await getDocs(buyerOffersQuery);
        const sellerOffersSnapshot = await getDocs(sellerOffersQuery);
        stats.offers = buyerOffersSnapshot.size + sellerOffersSnapshot.size;
        
        const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
        const conversationsSnapshot = await getDocs(conversationsQuery);
        stats.conversations = conversationsSnapshot.size;
        
        const messagesQuery = query(collection(db, 'messages'), where('senderId', '==', userId));
        const messagesSnapshot = await getDocs(messagesQuery);
        stats.messages = messagesSnapshot.size;
        
        const tradesQuery = query(collection(db, 'trades'), where('participants', 'array-contains', userId));
        const tradesSnapshot = await getDocs(tradesQuery);
        stats.trades = tradesSnapshot.size;
        
        const favoritesQuery = query(collection(db, 'favorites'), where('userId', '==', userId));
        const favoritesSnapshot = await getDocs(favoritesQuery);
        stats.favorites = favoritesSnapshot.size;
        
        const swipesQuery = query(collection(db, 'swipes'), where('userId', '==', userId));
        const swipesSnapshot = await getDocs(swipesQuery);
        stats.swipes = swipesSnapshot.size;
        
        const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        stats.notifications = notificationsSnapshot.size;
        
        stats.users = 1; // The user document itself
      } else {
        // Get stats for entire database
        const collections = ['items', 'offers', 'conversations', 'messages', 'trades', 'favorites', 'swipes', 'notifications', 'users'];
        
        for (const collectionName of collections) {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          stats[collectionName] = snapshot.size;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting data statistics:', error);
      return {};
    }
  }
}
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';

export class MatchingService {
  
  // Record a swipe action
  static async recordSwipe(userId, itemId, direction, itemOwnerId) {
    try {
      console.log(`📱 Recording swipe: ${userId} swiped ${direction} on item ${itemId} by ${itemOwnerId}`);
      
      // Record the swipe
      const swipeData = {
        userId,
        itemId,
        itemOwnerId,
        direction, // 'left' or 'right'
        createdAt: serverTimestamp(),
        processed: false
      };
      
      const swipeRef = await addDoc(collection(db, 'swipes'), swipeData);
      console.log('✅ Swipe recorded with ID:', swipeRef.id);
      
      // If it's a right swipe, check for potential matches
      if (direction === 'right') {
        await this.checkForMatch(userId, itemId, itemOwnerId);
      }
      
      return { success: true, swipeId: swipeRef.id };
      
    } catch (error) {
      console.error('❌ Error recording swipe:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Check if there's a mutual interest (match)
  static async checkForMatch(userId, itemId, itemOwnerId) {
    try {
      console.log(`🔍 Checking for match between ${userId} and ${itemOwnerId} for item ${itemId}`);
      
      // Check if the item owner has swiped right on any of the current user's items
      const reverseSwipeQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', itemOwnerId),
        where('itemOwnerId', '==', userId),
        where('direction', '==', 'right')
      );
      
      const reverseSwipes = await getDocs(reverseSwipeQuery);
      
      if (!reverseSwipes.empty) {
        // It's a match! Create the match
        const reverseSwipeData = reverseSwipes.docs[0].data();
        await this.createMatch(userId, itemOwnerId, itemId, reverseSwipeData.itemId);
        return true;
      }
      
      console.log('❌ No mutual interest found yet');
      return false;
      
    } catch (error) {
      console.error('❌ Error checking for match:', error);
      return false;
    }
  }
  
  // Create a match between two users with item locking
  static async createMatch(user1Id, user2Id, item1Id, item2Id) {
    try {
      console.log(`🎉 Creating match between ${user1Id} and ${user2Id}`);
      
      // Get user and item details
      const [user1Items, user2Items, user1Profile, user2Profile] = await Promise.all([
        this.getItemDetails(item1Id),
        this.getItemDetails(item2Id),
        this.getUserProfile(user1Id),
        this.getUserProfile(user2Id)
      ]);
      
      if (!user1Items || !user2Items) {
        throw new Error('Could not fetch item details for match');
      }

      // Check if items are still available for matching
      const { ItemLockingService } = await import('./ItemLockingService');
      const [item1Availability, item2Availability] = await Promise.all([
        ItemLockingService.isItemAvailableForSwipe(item1Id),
        ItemLockingService.isItemAvailableForSwipe(item2Id)
      ]);

      if (!item1Availability.available && item1Availability.lockType === 'hard') {
        throw new Error(`Item "${user1Items.title}" is no longer available for matching`);
      }

      if (!item2Availability.available && item2Availability.lockType === 'hard') {
        throw new Error(`Item "${user2Items.title}" is no longer available for matching`);
      }
      
      // Create match record
      const matchData = {
        participants: [user1Id, user2Id],
        user1Id,
        user2Id,
        user1ItemId: item1Id,
        user2ItemId: item2Id,
        user1ItemTitle: user1Items.title,
        user2ItemTitle: user2Items.title,
        status: 'matched',
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        conversationStarted: false,
        tradeCompleted: false,
        lockStatus: 'soft_locked' // Items are soft-locked for negotiation
      };
      
      const matchRef = await addDoc(collection(db, 'matches'), matchData);
      console.log('✅ Match created with ID:', matchRef.id);

      // Apply soft locks to both items for negotiation period
      try {
        await Promise.all([
          ItemLockingService.lockItemForMatch(item1Id, user1Id, matchRef.id, 'match_created'),
          ItemLockingService.lockItemForMatch(item2Id, user2Id, matchRef.id, 'match_created')
        ]);
        console.log('🔒 Both items soft-locked for match negotiation');
      } catch (lockError) {
        console.error('⚠️ Could not lock items for match:', lockError.message);
        // Continue with match creation even if locking fails
      }
      
      // Create conversation for the match
      const conversationId = await this.createMatchConversation(
        matchRef.id,
        user1Id,
        user2Id,
        user1Items,
        user2Items
      );
      
      // Update match with conversation ID
      await updateDoc(matchRef, {
        conversationId,
        conversationStarted: true
      });
      
      // Send notifications to both users
      await this.sendMatchNotifications(user1Id, user2Id, user1Items, user2Items, matchRef.id);
      
      return {
        success: true,
        matchId: matchRef.id,
        conversationId,
        lockStatus: 'soft_locked'
      };
      
    } catch (error) {
      console.error('❌ Error creating match:', error);
      throw error;
    }
  }
  
  // Create a conversation for the match
  static async createMatchConversation(matchId, user1Id, user2Id, item1, item2) {
    try {
      console.log(`💬 Creating conversation for match ${matchId}`);
      
      // Generate consistent conversation ID
      const conversationId = `match_${[user1Id, user2Id].sort().join('_')}_${Date.now()}`;
      
      const conversationData = {
        id: conversationId,
        type: 'match',
        matchId,
        participants: [user1Id, user2Id],
        participantNames: {
          [user1Id]: item1.userName || 'User 1',
          [user2Id]: item2.userName || 'User 2'
        },
        participantPhotos: {
          [user1Id]: user1Profile?.profilePhoto || null,
          [user2Id]: user2Profile?.profilePhoto || null
        },
        items: {
          [user1Id]: {
            itemId: item1.id,
            title: item1.title,
            price: item1.price,
            images: item1.images || [],
            description: item1.description || '',
            condition: item1.condition || 'Good'
          },
          [user2Id]: {
            itemId: item2.id,
            title: item2.title,
            price: item2.price,
            images: item2.images || [],
            description: item2.description || '',
            condition: item2.condition || 'Good'
          }
        },
        status: 'active',
        lastMessage: `🎉 You matched! Compare items and make an offer`,
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [user1Id]: 1,
          [user2Id]: 1
        },
        createdAt: serverTimestamp(),
        // Match-specific fields
        matchStatus: 'new',
        tradeStatus: 'pending',
        allowOffers: true,
        allowCounterOffers: true
      };
      
      await addDoc(collection(db, 'conversations'), conversationData);
      
      // Add initial system message with item comparison
      const initialMessage = {
        conversationId,
        senderId: 'system',
        senderName: 'Liwa',
        text: `🎉 Congratulations! You both showed interest in each other's items.

${item1.userName || 'test1'} has "${item1.title}"
${item2.userName || 'test3'} has "${item2.title}"

Start chatting to arrange your trade!`,
        messageType: 'match_notification',
        isSystemMessage: true,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true,
        matchId,
        items: [
          { 
            id: item1.id, 
            title: item1.title, 
            price: item1.price,
            userId: user1Id,
            userName: item1.userName,
            images: item1.images || []
          },
          { 
            id: item2.id, 
            title: item2.title, 
            price: item2.price,
            userId: user2Id,
            userName: item2.userName,
            images: item2.images || []
          }
        ],
        // Add item comparison data for UI
        itemComparison: {
          item1: {
            id: item1.id,
            title: item1.title,
            price: item1.price,
            condition: item1.condition,
            images: item1.images || [],
            userId: user1Id,
            userName: item1.userName
          },
          item2: {
            id: item2.id,
            title: item2.title,
            price: item2.price,
            condition: item2.condition,
            images: item2.images || [],
            userId: user2Id,
            userName: item2.userName
          }
        }
      };
      
      await addDoc(collection(db, 'messages'), initialMessage);
      
      console.log('✅ Match conversation created:', conversationId);
      return conversationId;
      
    } catch (error) {
      console.error('❌ Error creating match conversation:', error);
      throw error;
    }
  }
  
  // Get item details
  static async getItemDetails(itemId) {
    try {
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        return { id: itemDoc.id, ...itemDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting item details:', error);
      return null;
    }
  }

  // Get user profile with photo
  static async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }
  
  // Send match notifications
  static async sendMatchNotifications(user1Id, user2Id, item1, item2, matchId) {
    try {
      console.log('📧 Sending match notifications');
      
      // Notification to user1
      await NotificationService.sendNotification(user1Id, {
        type: 'match',
        title: '🎉 It\'s a Match!',
        body: `You and ${item2.userName} both showed interest! Start chatting about "${item1.title}" ↔ "${item2.title}"`,
        data: {
          matchId,
          otherUserId: user2Id,
          yourItemId: item1.id,
          theirItemId: item2.id,
          action: 'open_match_conversation'
        }
      });
      
      // Notification to user2
      await NotificationService.sendNotification(user2Id, {
        type: 'match',
        title: '🎉 It\'s a Match!',
        body: `You and ${item1.userName} both showed interest! Start chatting about "${item2.title}" ↔ "${item1.title}"`,
        data: {
          matchId,
          otherUserId: user1Id,
          yourItemId: item2.id,
          theirItemId: item1.id,
          action: 'open_match_conversation'
        }
      });
      
      console.log('✅ Match notifications sent');
      
    } catch (error) {
      console.error('❌ Error sending match notifications:', error);
    }
  }
  
  // Get user's matches
  static async getUserMatches(userId) {
    try {
      const matchesQuery = query(
        collection(db, 'matches'),
        where('participants', 'array-contains', userId)
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const matches = [];
      
      for (const doc of matchesSnapshot.docs) {
        const matchData = { id: doc.id, ...doc.data() };
        
        // Get other user's profile photo
        const otherUserId = matchData.user1Id === userId ? matchData.user2Id : matchData.user1Id;
        const otherUserProfile = await this.getUserProfile(otherUserId);
        
        matchData.otherUserPhoto = otherUserProfile?.profilePhoto || null;
        matchData.otherUserName = otherUserProfile?.name || null;
        
        matches.push(matchData);
      }
      
      // Sort by most recent
      matches.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      return matches;
      
    } catch (error) {
      console.error('❌ Error getting user matches:', error);
      return [];
    }
  }
  
  // Check if two users have already matched
  static async hasExistingMatch(user1Id, user2Id) {
    try {
      const matchQuery = query(
        collection(db, 'matches'),
        where('participants', 'array-contains', user1Id)
      );
      
      const matchSnapshot = await getDocs(matchQuery);
      
      for (const doc of matchSnapshot.docs) {
        const matchData = doc.data();
        if (matchData.participants.includes(user2Id)) {
          return { exists: true, matchId: doc.id, matchData };
        }
      }
      
      return { exists: false };
      
    } catch (error) {
      console.error('❌ Error checking existing match:', error);
      return { exists: false };
    }
  }
  
  // Get swipe history for user (to avoid showing already swiped items)
  static async getUserSwipeHistory(userId) {
    try {
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId)
      );
      
      const swipesSnapshot = await getDocs(swipesQuery);
      const swipedItemIds = [];
      
      swipesSnapshot.forEach(doc => {
        swipedItemIds.push(doc.data().itemId);
      });
      
      return swipedItemIds;
      
    } catch (error) {
      console.error('❌ Error getting swipe history:', error);
      return [];
    }
  }
  
  // Clear user's swipe history (reset function)
  static async clearSwipeHistory(userId) {
    try {
      console.log(`🧹 Clearing swipe history for user ${userId}`);
      
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId)
      );
      
      const swipesSnapshot = await getDocs(swipesQuery);
      const deletePromises = [];
      
      swipesSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Cleared ${deletePromises.length} swipe records`);
      return { success: true, clearedCount: deletePromises.length };
      
    } catch (error) {
      console.error('❌ Error clearing swipe history:', error);
      return { success: false, error: error.message };
    }
  }
}

export default MatchingService;
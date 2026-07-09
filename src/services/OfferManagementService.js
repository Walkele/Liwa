import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';
import { LockLifecycleService } from './LockLifecycleService';

export class OfferManagementService {
  
  // Get all offers for a specific item with detailed information (OPTIMIZED)
  static async getItemOffers(itemId, includeMessages = false) {
    try {
      console.log(`📋 Getting offers for item: ${itemId}`);
      
      // Use Promise.all to run queries in parallel instead of sequentially
      const [cashOffersSnapshot, tradeOffersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'offers'), where('itemId', '==', itemId))),
        getDocs(query(collection(db, 'tradeProposals'), where('targetItemId', '==', itemId)))
      ]);
      
      // Process cash offers
      const cashOffers = cashOffersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'cash'
      }));
      
      // Process trade offers
      const tradeOffers = tradeOffersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'trade'
      }));
      
      // Combine offers
      const allOffers = [...cashOffers, ...tradeOffers];
      
      // Only get conversation details if specifically requested (expensive operation)
      if (includeMessages && allOffers.length > 0) {
        // Get conversation details in parallel
        const conversationPromises = allOffers.map(async (offer) => {
          if (offer.conversationId) {
            try {
              const conversation = await this.getOfferConversation(offer.conversationId);
              offer.conversation = conversation;
              offer.messageCount = conversation?.messageCount || 0;
              offer.lastActivity = conversation?.lastMessageAt || offer.createdAt;
            } catch (error) {
              console.log(`⚠️ Could not load conversation for offer ${offer.id}`);
              offer.messageCount = 0;
              offer.lastActivity = offer.createdAt;
            }
          }
          return offer;
        });
        
        const offersWithConversations = await Promise.all(conversationPromises);
        return this.sortOffers(offersWithConversations);
      }
      
      // Sort and return without conversation details for faster loading
      const sortedOffers = this.sortOffers(allOffers);
      console.log(`✅ Found ${sortedOffers.length} offers for item ${itemId}`);
      return sortedOffers;
      
    } catch (error) {
      console.error('❌ Error getting item offers:', error);
      return [];
    }
  }
  
  // Helper method to sort offers consistently
  static sortOffers(offers) {
    return offers.sort((a, b) => {
      // Priority: pending > accepted > rejected
      const statusPriority = { pending: 3, accepted: 2, rejected: 1 };
      const aPriority = statusPriority[a.status] || 0;
      const bPriority = statusPriority[b.status] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by value (higher first)
      const aValue = a.type === 'cash' ? a.amount : (a.proposerItemPrice || 0);
      const bValue = b.type === 'cash' ? b.amount : (b.proposerItemPrice || 0);
      
      return bValue - aValue;
    });
  }
  
  // Get conversation details for an offer
  static async getOfferConversation(conversationId) {
    if (!conversationId) return null;
    
    try {
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      if (!conversationDoc.exists()) return null;
      
      const conversationData = conversationDoc.data();
      
      // Get message count
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      return {
        ...conversationData,
        messageCount: messagesSnapshot.docs.length,
        lastMessageAt: conversationData.lastMessageAt
      };
      
    } catch (error) {
      console.error('Error getting offer conversation:', error);
      return null;
    }
  }
  
  // Accept an offer and automatically reject all others
  static async acceptOffer(offerId, offerType, acceptingUserId, itemId) {
    try {
      console.log(`✅ Accepting ${offerType} offer: ${offerId}`);
      
      // Get the offer details
      const offerCollection = offerType === 'cash' ? 'offers' : 'tradeProposals';
      const offerDoc = await getDoc(doc(db, offerCollection, offerId));
      
      if (!offerDoc.exists()) {
        throw new Error('Offer not found');
      }
      
      const offerData = offerDoc.data();
      
      // Verify user has permission to accept
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (!itemDoc.exists() || itemDoc.data().userId !== acceptingUserId) {
        throw new Error('You do not have permission to accept offers for this item');
      }
      
      // Accept the chosen offer
      await updateDoc(doc(db, offerCollection, offerId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: acceptingUserId
      });
      
      // Get all other offers for this item
      const allOffers = await this.getItemOffers(itemId, false);
      const otherOffers = allOffers.filter(offer => offer.id !== offerId);
      
      // Reject all other pending offers
      const rejectionPromises = otherOffers
        .filter(offer => offer.status === 'pending')
        .map(offer => this.rejectOffer(offer.id, offer.type, acceptingUserId, 'other_offer_accepted'));
      
      await Promise.all(rejectionPromises);
      
      // Upgrade item lock to hard lock
      await LockLifecycleService.upgradeMatchToTradeLock(
        offerData.matchId || 'direct_offer',
        offerId,
        acceptingUserId
      );
      
      // Send notifications
      await this.sendOfferAcceptedNotifications(offerData, offerType, otherOffers);
      
      console.log(`✅ Offer accepted and ${otherOffers.length} other offers rejected`);
      
      return {
        success: true,
        acceptedOffer: { id: offerId, type: offerType, ...offerData },
        rejectedOffers: otherOffers.filter(o => o.status === 'pending').length
      };
      
    } catch (error) {
      console.error('❌ Error accepting offer:', error);
      throw error;
    }
  }
  
  // Reject an offer with reason
  static async rejectOffer(offerId, offerType, rejectingUserId, reason = 'declined') {
    try {
      console.log(`❌ Rejecting ${offerType} offer: ${offerId}`);
      
      const offerCollection = offerType === 'cash' ? 'offers' : 'tradeProposals';
      
      await updateDoc(doc(db, offerCollection, offerId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: rejectingUserId,
        rejectionReason: reason
      });
      
      // Send notification to offer maker
      const offerDoc = await getDoc(doc(db, offerCollection, offerId));
      if (offerDoc.exists()) {
        const offerData = offerDoc.data();
        await this.sendOfferRejectedNotification(offerData, offerType, reason);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error rejecting offer:', error);
      throw error;
    }
  }
  
  // Get offer summary for user's items (OPTIMIZED)
  static async getUserItemOffersSummary(userId) {
    try {
      console.log(`📊 Getting offer summary for user: ${userId}`);
      
      // Get user's items first
      const userItemsSnapshot = await getDocs(query(
        collection(db, 'items'),
        where('userId', '==', userId)
      ));
      
      if (userItemsSnapshot.empty) {
        console.log('📦 No items found for user');
        return [];
      }
      
      const userItems = userItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📦 Found ${userItems.length} user items`);
      
      // Get all offers for user's items in parallel (much faster)
      const itemIds = userItems.map(item => item.id);
      
      const [cashOffersSnapshot, tradeOffersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'offers'), where('itemId', 'in', itemIds.slice(0, 10)))), // Firestore 'in' limit is 10
        getDocs(query(collection(db, 'tradeProposals'), where('targetItemId', 'in', itemIds.slice(0, 10))))
      ]);
      
      // Process offers by item
      const offersByItem = {};
      
      // Process cash offers
      cashOffersSnapshot.docs.forEach(doc => {
        const offer = { id: doc.id, ...doc.data(), type: 'cash' };
        if (!offersByItem[offer.itemId]) {
          offersByItem[offer.itemId] = [];
        }
        offersByItem[offer.itemId].push(offer);
      });
      
      // Process trade offers
      tradeOffersSnapshot.docs.forEach(doc => {
        const offer = { id: doc.id, ...doc.data(), type: 'trade' };
        const itemId = offer.targetItemId;
        if (!offersByItem[itemId]) {
          offersByItem[itemId] = [];
        }
        offersByItem[itemId].push(offer);
      });
      
      // If user has more than 10 items, get remaining offers
      if (itemIds.length > 10) {
        const remainingIds = itemIds.slice(10);
        const [remainingCashOffers, remainingTradeOffers] = await Promise.all([
          getDocs(query(collection(db, 'offers'), where('itemId', 'in', remainingIds.slice(0, 10)))),
          getDocs(query(collection(db, 'tradeProposals'), where('targetItemId', 'in', remainingIds.slice(0, 10))))
        ]);
        
        // Process remaining offers
        [...remainingCashOffers.docs, ...remainingTradeOffers.docs].forEach(doc => {
          const offer = { id: doc.id, ...doc.data() };
          const itemId = offer.itemId || offer.targetItemId;
          if (!offersByItem[itemId]) {
            offersByItem[itemId] = [];
          }
          offersByItem[itemId].push(offer);
        });
      }
      
      // Build summary for items with offers
      const itemsWithOffers = [];
      
      userItems.forEach(item => {
        const offers = offersByItem[item.id] || [];
        
        if (offers.length > 0) {
          const pendingOffers = offers.filter(offer => offer.status === 'pending');
          const acceptedOffers = offers.filter(offer => offer.status === 'accepted');
          const cashOffers = offers.filter(o => o.type === 'cash');
          const tradeOffers = offers.filter(o => o.type === 'trade');
          
          itemsWithOffers.push({
            ...item,
            totalOffers: offers.length,
            pendingOffers: pendingOffers.length,
            acceptedOffers: acceptedOffers.length,
            highestCashOffer: cashOffers.length > 0 ? Math.max(...cashOffers.map(o => o.amount || 0)) : 0,
            tradeOffers: tradeOffers.length,
            lastOfferAt: offers.length > 0 ? 
              Math.max(...offers.map(o => (o.createdAt?.toDate?.() || new Date(o.createdAt)).getTime())) : 
              null
          });
        }
      });
      
      // Sort by items with most pending offers first
      itemsWithOffers.sort((a, b) => {
        if (a.pendingOffers !== b.pendingOffers) {
          return b.pendingOffers - a.pendingOffers;
        }
        return (b.lastOfferAt || 0) - (a.lastOfferAt || 0);
      });
      
      console.log(`✅ Found ${itemsWithOffers.length} items with offers`);
      return itemsWithOffers;
      
    } catch (error) {
      console.error('❌ Error getting user offer summary:', error);
      return [];
    }
  }
  
  // Send notifications when offer is accepted
  static async sendOfferAcceptedNotifications(offerData, offerType, rejectedOffers) {
    try {
      // Notify the accepted offer maker
      const acceptedMessage = offerType === 'cash' 
        ? `Your cash offer of $${offerData.amount} was accepted!`
        : `Your trade proposal was accepted!`;
        
      await NotificationService.sendNotification(offerData.userId || offerData.proposerUserId, {
        type: 'offer_accepted',
        title: '🎉 Offer Accepted!',
        body: acceptedMessage,
        data: {
          offerId: offerData.id,
          offerType,
          conversationId: offerData.conversationId
        }
      });
      
      // Notify rejected offer makers
      for (const rejectedOffer of rejectedOffers.filter(o => o.status === 'pending')) {
        const rejectedMessage = `Another offer was accepted for the item you were interested in.`;
        
        await NotificationService.sendNotification(
          rejectedOffer.userId || rejectedOffer.proposerUserId, 
          {
            type: 'offer_rejected',
            title: '😔 Offer Not Selected',
            body: rejectedMessage,
            data: {
              offerId: rejectedOffer.id,
              offerType: rejectedOffer.type,
              reason: 'other_offer_accepted'
            }
          }
        );
      }
      
    } catch (error) {
      console.error('❌ Error sending offer notifications:', error);
    }
  }
  
  // Send notification when offer is rejected
  static async sendOfferRejectedNotification(offerData, offerType, reason) {
    try {
      const reasonMessages = {
        declined: 'The seller declined your offer.',
        other_offer_accepted: 'Another offer was accepted.',
        item_no_longer_available: 'The item is no longer available.',
        expired: 'Your offer expired.'
      };
      
      const message = reasonMessages[reason] || 'Your offer was not accepted.';
      
      await NotificationService.sendNotification(
        offerData.userId || offerData.proposerUserId,
        {
          type: 'offer_rejected',
          title: '😔 Offer Declined',
          body: message,
          data: {
            offerId: offerData.id,
            offerType,
            reason
          }
        }
      );
      
    } catch (error) {
      console.error('❌ Error sending rejection notification:', error);
    }
  }
  
  // Auto-expire old offers
  static async expireOldOffers(daysOld = 7) {
    try {
      console.log(`🧹 Expiring offers older than ${daysOld} days...`);
      
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      let expiredCount = 0;
      
      // Expire cash offers
      const oldCashOffersQuery = query(
        collection(db, 'offers'),
        where('status', '==', 'pending')
      );
      
      const cashOffersSnapshot = await getDocs(oldCashOffersQuery);
      
      for (const offerDoc of cashOffersSnapshot.docs) {
        const offerData = offerDoc.data();
        const createdAt = offerData.createdAt?.toDate?.() || new Date(offerData.createdAt);
        
        if (createdAt < cutoffDate) {
          await this.rejectOffer(offerDoc.id, 'cash', 'system', 'expired');
          expiredCount++;
        }
      }
      
      // Expire trade proposals
      const oldTradeOffersQuery = query(
        collection(db, 'tradeProposals'),
        where('status', '==', 'pending')
      );
      
      const tradeOffersSnapshot = await getDocs(oldTradeOffersQuery);
      
      for (const tradeDoc of tradeOffersSnapshot.docs) {
        const tradeData = tradeDoc.data();
        const createdAt = tradeData.createdAt?.toDate?.() || new Date(tradeData.createdAt);
        
        if (createdAt < cutoffDate) {
          await this.rejectOffer(tradeDoc.id, 'trade', 'system', 'expired');
          expiredCount++;
        }
      }
      
      console.log(`✅ Expired ${expiredCount} old offers`);
      return expiredCount;
      
    } catch (error) {
      console.error('❌ Error expiring old offers:', error);
      return 0;
    }
  }
}

export default OfferManagementService;
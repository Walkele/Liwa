// Service to determine the transaction status of items
// Differentiates between available, in-transaction, and completed items

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ItemTransactionStatusService {
  
  // Get comprehensive transaction status for an item
  static async getItemTransactionStatus(itemId) {
    try {
      console.log(`🔍 Checking transaction status for item: ${itemId}`);
      
      const status = {
        itemId,
        isAvailable: true,
        hasActiveOffers: false,
        hasAcceptedOffers: false,
        hasActiveTrades: false,
        hasCompletedTrades: false,
        transactionStage: 'available', // available, offers_pending, trade_active, completed
        details: {}
      };
      
      // 1. Check for cash offers
      const offersQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId)
      );
      
      const offersSnapshot = await getDocs(offersQuery);
      const offers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Analyze offers
      const pendingOffers = offers.filter(offer => offer.status === 'pending');
      const acceptedOffers = offers.filter(offer => offer.status === 'accepted');
      const completedOffers = offers.filter(offer => offer.status === 'completed');
      
      if (pendingOffers.length > 0) {
        status.hasActiveOffers = true;
        status.transactionStage = 'offers_pending';
      }
      
      if (acceptedOffers.length > 0) {
        status.hasAcceptedOffers = true;
        status.transactionStage = 'trade_active';
        status.isAvailable = false;
      }
      
      if (completedOffers.length > 0) {
        status.hasCompletedTrades = true;
        status.transactionStage = 'completed';
        status.isAvailable = false;
      }
      
      // 2. Check for trade proposals
      const tradeProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('targetItemId', '==', itemId)
      );
      
      const tradeProposalsSnapshot = await getDocs(tradeProposalsQuery);
      const tradeProposals = tradeProposalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Also check if this item is being proposed in trades
      const proposerTradesQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerItemId', '==', itemId)
      );
      
      const proposerTradesSnapshot = await getDocs(proposerTradesQuery);
      const proposerTrades = proposerTradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const allTrades = [...tradeProposals, ...proposerTrades];
      
      // Analyze trades
      const pendingTrades = allTrades.filter(trade => trade.status === 'pending');
      const acceptedTrades = allTrades.filter(trade => trade.status === 'accepted');
      const completedTrades = allTrades.filter(trade => trade.status === 'completed');
      
      if (pendingTrades.length > 0) {
        status.hasActiveOffers = true;
        if (status.transactionStage === 'available') {
          status.transactionStage = 'offers_pending';
        }
      }
      
      if (acceptedTrades.length > 0) {
        status.hasActiveTrades = true;
        status.transactionStage = 'trade_active';
        status.isAvailable = false;
      }
      
      if (completedTrades.length > 0) {
        status.hasCompletedTrades = true;
        status.transactionStage = 'completed';
        status.isAvailable = false;
      }
      
      // 3. Check for accepted offers (different collection)
      const acceptedOffersQuery = query(
        collection(db, 'acceptedOffers'),
        where('itemId', '==', itemId)
      );
      
      const acceptedOffersSnapshot = await getDocs(acceptedOffersQuery);
      const acceptedOffersList = acceptedOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (acceptedOffersList.length > 0) {
        status.hasAcceptedOffers = true;
        status.transactionStage = 'trade_active';
        status.isAvailable = false;
        
        // Check if any accepted offers are completed
        const completedAcceptedOffers = acceptedOffersList.filter(offer => 
          offer.status === 'completed' || offer.currentStep >= 5
        );
        
        if (completedAcceptedOffers.length > 0) {
          status.hasCompletedTrades = true;
          status.transactionStage = 'completed';
        }
      }
      
      // 4. Store details for debugging
      status.details = {
        offers: {
          total: offers.length,
          pending: pendingOffers.length,
          accepted: acceptedOffers.length,
          completed: completedOffers.length
        },
        trades: {
          total: allTrades.length,
          pending: pendingTrades.length,
          accepted: acceptedTrades.length,
          completed: completedTrades.length
        },
        acceptedOffers: {
          total: acceptedOffersList.length,
          completed: acceptedOffersList.filter(o => o.status === 'completed').length
        }
      };
      
      console.log(`✅ Item ${itemId} status:`, status);
      return status;
      
    } catch (error) {
      console.error(`❌ Error checking transaction status for item ${itemId}:`, error);
      return {
        itemId,
        isAvailable: true, // Default to available on error
        hasActiveOffers: false,
        hasAcceptedOffers: false,
        hasActiveTrades: false,
        hasCompletedTrades: false,
        transactionStage: 'available',
        details: { error: error.message }
      };
    }
  }
  
  // Filter items based on transaction status for HomeScreen
  static async filterItemsByTransactionStatus(items, options = {}) {
    const {
      showAvailable = true,
      showWithOffers = true,
      showInTrade = false,
      showCompleted = false,
      maxConcurrentChecks = 5
    } = options;
    
    console.log(`🔍 Filtering ${items.length} items by transaction status...`);
    
    try {
      // Validate input items
      if (!Array.isArray(items)) {
        console.error('❌ Items is not an array:', items);
        return [];
      }
      
      // Filter out invalid items before processing
      const validItems = items.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('⚠️ Skipping invalid item:', item);
          return false;
        }
        if (!item.id) {
          console.warn('⚠️ Skipping item without ID:', item);
          return false;
        }
        return true;
      });
      
      console.log(`📋 Processing ${validItems.length} valid items (filtered from ${items.length})`);
      
      // Process items in batches to avoid overwhelming Firebase
      const filteredItems = [];
      
      for (let i = 0; i < validItems.length; i += maxConcurrentChecks) {
        const batch = validItems.slice(i, i + maxConcurrentChecks);
        
        const statusPromises = batch.map(item => {
          try {
            return this.getItemTransactionStatus(item.id);
          } catch (error) {
            console.error(`❌ Error getting status for item ${item.id}:`, error);
            return {
              itemId: item.id,
              isAvailable: true,
              hasActiveOffers: false,
              hasAcceptedOffers: false,
              hasActiveTrades: false,
              hasCompletedTrades: false,
              transactionStage: 'available',
              details: { error: error.message }
            };
          }
        });
        
        const statuses = await Promise.all(statusPromises);
        
        // Filter based on transaction status
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const status = statuses[j];
          
          // Ensure we have valid item and status objects
          if (!item || !status) {
            console.warn('⚠️ Skipping item due to missing data:', { item: !!item, status: !!status });
            continue;
          }
          
          let shouldInclude = false;
          
          switch (status.transactionStage) {
            case 'available':
              shouldInclude = showAvailable;
              break;
            case 'offers_pending':
              shouldInclude = showWithOffers;
              break;
            case 'trade_active':
              shouldInclude = showInTrade;
              break;
            case 'completed':
              shouldInclude = showCompleted;
              break;
            default:
              shouldInclude = showAvailable; // Default case
          }
          
          if (shouldInclude) {
            // Safely merge item with transaction status
            try {
              const itemWithStatus = {
                ...item,
                transactionStatus: status
              };
              filteredItems.push(itemWithStatus);
            } catch (mergeError) {
              console.error('❌ Error merging item with status:', mergeError, { item, status });
              // Add item without transaction status as fallback
              filteredItems.push(item);
            }
          } else {
            console.log(`🚫 Filtered out item "${item.title || 'Unknown'}" - Stage: ${status.transactionStage}`);
          }
        }
      }
      
      console.log(`✅ Filtered to ${filteredItems.length} items (from ${validItems.length})`);
      return filteredItems;
      
    } catch (error) {
      console.error('❌ Error filtering items by transaction status:', error);
      // Return original items on error to avoid breaking the UI
      return items.filter(item => item && typeof item === 'object' && item.id);
    }
  }
  
  // Get items that are truly available for new offers
  static async getAvailableItemsForOffers(items) {
    return this.filterItemsByTransactionStatus(items, {
      showAvailable: true,
      showWithOffers: true, // Items with pending offers can still receive more offers
      showInTrade: false,   // Items in active trades cannot receive new offers
      showCompleted: false  // Completed items should not receive offers
    });
  }
  
  // Get items for HomeScreen discovery (available + items with pending offers)
  static async getHomeScreenItems(items) {
    return this.filterItemsByTransactionStatus(items, {
      showAvailable: true,
      showWithOffers: true,
      showInTrade: false,
      showCompleted: false
    });
  }
  
  // Get all items including those in transactions (for debugging)
  static async getAllItemsWithStatus(items) {
    return this.filterItemsByTransactionStatus(items, {
      showAvailable: true,
      showWithOffers: true,
      showInTrade: true,
      showCompleted: true
    });
  }
  
  // Quick check if item is available for offers
  static async isItemAvailableForOffers(itemId) {
    const status = await this.getItemTransactionStatus(itemId);
    return status.isAvailable && !status.hasCompletedTrades;
  }
  
  // Get summary of transaction statuses for multiple items
  static async getTransactionStatusSummary(itemIds) {
    try {
      const statuses = await Promise.all(
        itemIds.map(id => this.getItemTransactionStatus(id))
      );
      
      const summary = {
        total: itemIds.length,
        available: 0,
        withOffers: 0,
        inTrade: 0,
        completed: 0,
        breakdown: {}
      };
      
      statuses.forEach(status => {
        switch (status.transactionStage) {
          case 'available':
            summary.available++;
            break;
          case 'offers_pending':
            summary.withOffers++;
            break;
          case 'trade_active':
            summary.inTrade++;
            break;
          case 'completed':
            summary.completed++;
            break;
        }
        
        summary.breakdown[status.itemId] = status.transactionStage;
      });
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error getting transaction status summary:', error);
      return null;
    }
  }
}

export default ItemTransactionStatusService;
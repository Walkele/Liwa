import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, addDoc, serverTimestamp, sum, average } from 'firebase/firestore';
import { db } from '../config/firebase';

export class SellerAnalyticsService {
  
  // Get comprehensive seller analytics
  static async getSellerAnalytics(userId, timeRange = '30d') {
    try {
      console.log(`📊 Getting seller analytics for user ${userId}, range: ${timeRange}`);
      
      const { startDate, endDate } = this.getDateRange(timeRange);
      
      // Get all user's items
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', userId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Get completed trades
      const tradesQuery = query(
        collection(db, 'trades'),
        where('participants', 'array-contains', userId),
        where('status', '==', 'completed'),
        where('completedAt', '>=', startDate),
        where('completedAt', '<=', endDate)
      );
      const tradesSnapshot = await getDocs(tradesQuery);
      const completedTrades = tradesSnapshot.docs.map(doc => doc.data());
      
      // Get offers received
      const offersQuery = query(
        collection(db, 'offers'),
        where('targetUserId', '==', userId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      const offersSnapshot = await getDocs(offersQuery);
      const offersReceived = offersSnapshot.docs.map(doc => doc.data());
      
      // Calculate analytics
      const analytics = {
        overview: this.calculateOverview(items, completedTrades, offersReceived),
        sales: this.calculateSalesMetrics(completedTrades),
        inventory: this.calculateInventoryMetrics(items),
        engagement: this.calculateEngagementMetrics(items, offersReceived),
        pricing: await this.calculatePricingInsights(items, completedTrades),
        performance: this.calculatePerformanceMetrics(items, completedTrades, offersReceived),
        trends: this.calculateTrends(completedTrades, offersReceived, timeRange)
      };
      
      console.log('✅ Seller analytics calculated successfully');
      return analytics;
      
    } catch (error) {
      console.error('❌ Error getting seller analytics:', error);
      throw error;
    }
  }
  
  // Calculate overview metrics
  static calculateOverview(items, trades, offers) {
    const totalItems = items.length;
    const activeItems = items.filter(item => item.status === 'available').length;
    const soldItems = items.filter(item => item.status === 'sold' || item.status === 'traded').length;
    const totalRevenue = trades.reduce((sum, trade) => sum + (trade.totalValue || 0), 0);
    const totalOffers = offers.length;
    
    return {
      totalItems,
      activeItems,
      soldItems,
      totalRevenue,
      totalOffers,
      sellThroughRate: totalItems > 0 ? (soldItems / totalItems * 100).toFixed(1) : 0,
      averageOrderValue: trades.length > 0 ? (totalRevenue / trades.length).toFixed(2) : 0
    };
  }
  
  // Calculate sales metrics
  static calculateSalesMetrics(trades) {
    if (trades.length === 0) {
      return {
        totalSales: 0,
        totalTrades: 0,
        averageSaleValue: 0,
        salesByCategory: {},
        salesByCondition: {},
        salesByMonth: {}
      };
    }
    
    const totalSales = trades.reduce((sum, trade) => sum + (trade.totalValue || 0), 0);
    const salesByCategory = {};
    const salesByCondition = {};
    const salesByMonth = {};
    
    trades.forEach(trade => {
      // By category
      if (trade.category) {
        salesByCategory[trade.category] = (salesByCategory[trade.category] || 0) + (trade.totalValue || 0);
      }
      
      // By condition
      if (trade.condition) {
        salesByCondition[trade.condition] = (salesByCondition[trade.condition] || 0) + (trade.totalValue || 0);
      }
      
      // By month
      const month = trade.completedAt?.toDate?.().toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) || 'Unknown';
      salesByMonth[month] = (salesByMonth[month] || 0) + (trade.totalValue || 0);
    });
    
    return {
      totalSales,
      totalTrades: trades.length,
      averageSaleValue: (totalSales / trades.length).toFixed(2),
      salesByCategory,
      salesByCondition,
      salesByMonth
    };
  }
  
  // Calculate inventory metrics
  static calculateInventoryMetrics(items) {
    const activeItems = items.filter(item => item.status === 'available');
    const totalInventoryValue = activeItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    const categoryBreakdown = {};
    const conditionBreakdown = {};
    const priceRanges = {
      '0-25': 0,
      '25-50': 0,
      '50-100': 0,
      '100-250': 0,
      '250+': 0
    };
    
    activeItems.forEach(item => {
      // By category
      categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;
      
      // By condition
      conditionBreakdown[item.condition] = (conditionBreakdown[item.condition] || 0) + 1;
      
      // By price range
      const price = item.price || 0;
      if (price < 25) priceRanges['0-25']++;
      else if (price < 50) priceRanges['25-50']++;
      else if (price < 100) priceRanges['50-100']++;
      else if (price < 250) priceRanges['100-250']++;
      else priceRanges['250+']++;
    });
    
    // Calculate average days listed
    const now = new Date();
    const totalDaysListed = activeItems.reduce((sum, item) => {
      const created = item.createdAt?.toDate?.() || new Date();
      const daysListed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return sum + daysListed;
    }, 0);
    const averageDaysListed = activeItems.length > 0 ? (totalDaysListed / activeItems.length).toFixed(1) : 0;
    
    return {
      totalActiveItems: activeItems.length,
      totalInventoryValue,
      averageDaysListed,
      categoryBreakdown,
      conditionBreakdown,
      priceRanges,
      averageItemPrice: activeItems.length > 0 ? (totalInventoryValue / activeItems.length).toFixed(2) : 0
    };
  }
  
  // Calculate engagement metrics
  static calculateEngagementMetrics(items, offers) {
    let totalViews = 0;
    let totalLikes = 0;
    let totalFavorites = 0;
    
    items.forEach(item => {
      totalViews += item.views || 0;
      totalLikes += item.likes || 0;
      totalFavorites += item.favorites || 0;
    });
    
    const responseRate = offers.length > 0 
      ? (offers.filter(offer => offer.status === 'accepted' || offer.status === 'responded').length / offers.length * 100).toFixed(1)
      : 0;
    
    const averageResponseTime = this.calculateAverageResponseTime(offers);
    
    return {
      totalViews,
      totalLikes,
      totalFavorites,
      averageViewsPerItem: items.length > 0 ? (totalViews / items.length).toFixed(1) : 0,
      totalOffersReceived: offers.length,
      responseRate,
      averageResponseTime,
      engagementRate: items.length > 0 ? ((totalViews + totalLikes) / items.length).toFixed(1) : 0
    };
  }
  
  // Calculate pricing insights
  static async calculatePricingInsights(items, trades) {
    const pricingSuggestions = [];
    
    // Find items that have been listed for a long time without offers
    const now = new Date();
    const staleItems = items.filter(item => {
      const created = item.createdAt?.toDate?.() || new Date();
      const daysListed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return item.status === 'available' && daysListed > 30 && (!item.offers || item.offers.length === 0);
    });
    
    staleItems.forEach(item => {
      const suggestedPrice = Math.floor(item.price * 0.85); // Suggest 15% price reduction
      pricingSuggestions.push({
        itemId: item.id,
        itemTitle: item.title,
        currentPrice: item.price,
        suggestedPrice,
        reason: 'Listed for 30+ days with no offers',
        potentialImpact: 'May increase visibility and buyer interest'
      });
    });
    
    // Analyze sold items for pricing patterns
    const soldItems = items.filter(item => item.status === 'sold' || item.status === 'traded');
    const categoryPricing = {};
    
    soldItems.forEach(item => {
      if (!categoryPricing[item.category]) {
        categoryPricing[item.category] = { total: 0, count: 0 };
      }
      categoryPricing[item.category].total += item.price;
      categoryPricing[item.category].count += 1;
    });
    
    const averagePricingByCategory = {};
    Object.keys(categoryPricing).forEach(category => {
      averagePricingByCategory[category] = (categoryPricing[category].total / categoryPricing[category].count).toFixed(2);
    });
    
    return {
      pricingSuggestions,
      averagePricingByCategory,
      totalItemsAnalyzed: items.length,
      soldItemsAnalyzed: soldItems.length
    };
  }
  
  // Calculate performance metrics
  static calculatePerformanceMetrics(items, trades, offers) {
    const completedTrades = trades.filter(trade => trade.status === 'completed');
    const averageTimeToSell = this.calculateAverageTimeToSell(items, completedTrades);
    const acceptanceRate = offers.length > 0 
      ? (completedTrades.length / offers.length * 100).toFixed(1)
      : 0;
    
    // Calculate repeat customers
    const customerTrades = {};
    completedTrades.forEach(trade => {
      const customerId = trade.buyerId || trade.traderId;
      if (customerId) {
        customerTrades[customerId] = (customerTrades[customerId] || 0) + 1;
      }
    });
    
    const repeatCustomers = Object.values(customerTrades).filter(count => count > 1).length;
    
    return {
      averageTimeToSell,
      acceptanceRate,
      repeatCustomers,
      totalCustomers: Object.keys(customerTrades).length,
      customerRetentionRate: Object.keys(customerTrades).length > 0 
        ? (repeatCustomers / Object.keys(customerTrades).length * 100).toFixed(1)
        : 0
    };
  }
  
  // Calculate trends over time
  static calculateTrends(trades, offers, timeRange) {
    const trends = {
      salesTrend: [],
      offersTrend: [],
      period: timeRange
    };
    
    // Group by day/week based on time range
    const groupedData = {};
    
    trades.forEach(trade => {
      const date = trade.completedAt?.toDate?.().toLocaleDateString() || 'Unknown';
      if (!groupedData[date]) {
        groupedData[date] = { sales: 0, offers: 0 };
      }
      groupedData[date].sales += trade.totalValue || 0;
    });
    
    offers.forEach(offer => {
      const date = offer.createdAt?.toDate?.().toLocaleDateString() || 'Unknown';
      if (!groupedData[date]) {
        groupedData[date] = { sales: 0, offers: 0 };
      }
      groupedData[date].offers += 1;
    });
    
    // Convert to arrays
    Object.keys(groupedData).sort().forEach(date => {
      trends.salesTrend.push({ date, value: groupedData[date].sales });
      trends.offersTrend.push({ date, value: groupedData[date].offers });
    });
    
    return trends;
  }
  
  // Helper: Calculate average response time
  static calculateAverageResponseTime(offers) {
    const respondedOffers = offers.filter(offer => offer.respondedAt || offer.acceptedAt);
    if (respondedOffers.length === 0) return null;
    
    const totalResponseTime = respondedOffers.reduce((sum, offer) => {
      const created = offer.createdAt?.toDate?.() || new Date();
      const responded = offer.respondedAt?.toDate?.() || offer.acceptedAt?.toDate?.() || new Date();
      return sum + (responded - created);
    }, 0);
    
    const avgMs = totalResponseTime / respondedOffers.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }
  
  // Helper: Calculate average time to sell
  static calculateAverageTimeToSell(items, trades) {
    if (trades.length === 0) return null;
    
    const totalTime = trades.reduce((sum, trade) => {
      const created = trade.itemCreatedAt?.toDate?.() || trade.createdAt?.toDate?.() || new Date();
      const completed = trade.completedAt?.toDate?.() || new Date();
      return sum + (completed - created);
    }, 0);
    
    const avgMs = totalTime / trades.length;
    const days = Math.floor(avgMs / (1000 * 60 * 60 * 24));
    
    return `${days} days`;
  }
  
  // Helper: Get date range based on time range
  static getDateRange(timeRange) {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { startDate, endDate: now };
  }
  
  // Pricing suggestion based on market data
  static async getPricingSuggestion(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const item = itemDoc.data();
      
      // Get similar items
      const similarItemsQuery = query(
        collection(db, 'items'),
        where('category', '==', item.category),
        where('condition', '==', item.condition),
        where('status', '==', 'sold')
      );
      const similarItemsSnapshot = await getDocs(similarItemsQuery);
      const similarItems = similarItemsSnapshot.docs.map(doc => doc.data());
      
      if (similarItems.length === 0) {
        return {
          currentPrice: item.price,
          suggestedPrice: item.price,
          confidence: 'low',
          reason: 'Not enough similar items sold for comparison'
        };
      }
      
      // Calculate average price of similar items
      const avgPrice = similarItems.reduce((sum, i) => sum + (i.price || 0), 0) / similarItems.length;
      const medianPrice = this.calculateMedian(similarItems.map(i => i.price));
      
      // Suggest price based on market data
      const suggestedPrice = Math.floor((avgPrice + medianPrice) / 2);
      
      return {
        currentPrice: item.price,
        suggestedPrice,
        marketAverage: Math.floor(avgPrice),
        marketMedian: medianPrice,
        similarItemsCount: similarItems.length,
        confidence: similarItems.length >= 5 ? 'high' : 'medium',
        reason: similarItems.length >= 5 
          ? 'Based on similar sold items in your category'
          : 'Limited data - based on few similar items'
      };
      
    } catch (error) {
      console.error('❌ Error getting pricing suggestion:', error);
      throw error;
    }
  }
  
  // Helper: Calculate median
  static calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  // Track item performance
  static async trackItemView(itemId) {
    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        views: (await getDoc(itemRef)).data().views + 1,
        lastViewedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error tracking item view:', error);
    }
  }
  
  // Bulk operations for inventory management
  static async bulkUpdateItems(itemIds, updates) {
    try {
      const updatePromises = itemIds.map(itemId => 
        updateDoc(doc(db, 'items', itemId), updates)
      );
      
      await Promise.all(updatePromises);
      console.log(`✅ Bulk updated ${itemIds.length} items`);
      return { success: true, updatedCount: itemIds.length };
    } catch (error) {
      console.error('❌ Error in bulk update:', error);
      throw error;
    }
  }
  
  // Get seller leaderboard position
  static async getSellerRanking(userId) {
    try {
      // This would require a more complex query in production
      // For now, return a placeholder
      return {
        userId,
        rank: 'Not available',
        totalSellers: 0,
        percentile: 0,
        message: 'Leaderboard feature coming soon'
      };
    } catch (error) {
      console.error('❌ Error getting seller ranking:', error);
      throw error;
    }
  }
}

export default SellerAnalyticsService;
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc,
  serverTimestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { OfferComparisonService } from './OfferComparisonService';
import { ValueAnalysisService } from './ValueAnalysisService';

/**
 * Item Portfolio Service
 * 
 * Manages user's item portfolio with comprehensive offer tracking
 * Inspired by:
 * - Shopify: Multi-product inventory management
 * - Etsy: Seller dashboard with portfolio analytics
 * - StockX: Portfolio tracking with market insights
 */
export class ItemPortfolioService {
  
  /**
   * Get user's complete item portfolio with offers
   */
  static async getUserPortfolio(userId) {
    try {
      // Get all user's items
      const itemsRef = collection(db, 'items');
      const itemsQuery = query(itemsRef, where('userId', '==', userId));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get offers for each item
      const portfolio = await Promise.all(
        items.map(async (item) => {
          const offerData = await OfferComparisonService.getOfferComparisonData(userId, item.id);
          const valueAnalysis = await ValueAnalysisService.analyzeItemValue(item, offerData.offers);
          
          return {
            ...item,
            offers: offerData.offers,
            offerCount: offerData.offerCount,
            topOffer: offerData.topOffer,
            userOffers: offerData.userOffers,
            availability: offerData.availability,
            valueAnalysis
          };
        })
      );
      
      // Calculate portfolio metrics
      const portfolioMetrics = this.calculatePortfolioMetrics(portfolio);
      
      return {
        items: portfolio,
        metrics: portfolioMetrics,
        totalItems: portfolio.length,
        totalValue: portfolioMetrics.totalValue,
        potentialProfit: portfolioMetrics.potentialProfit
      };
    } catch (error) {
      console.error('Error getting user portfolio:', error);
      throw error;
    }
  }

  /**
   * Calculate portfolio-wide metrics
   */
  static calculatePortfolioMetrics(items) {
    let totalValue = 0;
    let potentialProfit = 0;
    let activeNegotiations = 0;
    let softLockedItems = 0;
    let hardLockedItems = 0;
    
    items.forEach(item => {
      // Item's estimated value
      totalValue += item.estimatedValue || 0;
      
      // Potential profit from top offer
      if (item.topOffer && item.topOffer.cashAmount) {
        potentialProfit += (item.topOffer.cashAmount - (item.estimatedValue || 0));
      }
      
      // Count locked items
      if (item.availability.softLocked) softLockedItems++;
      if (item.status === 'hard_locked') hardLockedItems++;
      
      // Count active negotiations
      if (item.offerCount > 0) activeNegotiations++;
    });
    
    return {
      totalValue,
      potentialProfit,
      activeNegotiations,
      softLockedItems,
      hardLockedItems,
      averageItemValue: items.length > 0 ? totalValue / items.length : 0,
      lockedItemsRatio: items.length > 0 ? (softLockedItems + hardLockedItems) / items.length : 0
    };
  }

  /**
   * Get competing offers across all user's items
   */
  static async getCompetingOffersAcrossPortfolio(userId) {
    try {
      const portfolio = await this.getUserPortfolio(userId);
      
      const competingOffers = [];
      
      portfolio.items.forEach(item => {
        if (item.offers && item.offers.length > 0) {
          item.offers.forEach(offer => {
            if (offer.senderId !== userId) {
              competingOffers.push({
                ...offer,
                itemId: item.id,
                itemTitle: item.title,
                itemValue: item.estimatedValue,
                valueGap: offer.cashAmount - (item.estimatedValue || 0),
                profitability: this.calculateProfitability(offer, item)
              });
            }
          });
        }
      });
      
      // Sort by profitability
      competingOffers.sort((a, b) => b.profitability - a.profitability);
      
      return {
        competingOffers,
        totalCompetingOffers: competingOffers.length,
        portfolio
      };
    } catch (error) {
      console.error('Error getting competing offers:', error);
      throw error;
    }
  }

  /**
   * Calculate profitability percentage
   */
  static calculateProfitability(offer, item) {
    const itemValue = item.estimatedValue || 0;
    const offerValue = offer.cashAmount || 0;
    
    if (itemValue === 0) return 0;
    
    return ((offerValue - itemValue) / itemValue) * 100;
  }

  /**
   * Get portfolio recommendations
   */
  static async getPortfolioRecommendations(userId) {
    try {
      const portfolio = await this.getUserPortfolio(userId);
      const recommendations = [];
      
      portfolio.items.forEach(item => {
        // Check for items with no offers
        if (item.offerCount === 0 && item.status === 'available') {
          recommendations.push({
            type: 'no_offers',
            priority: 'high',
            itemId: item.id,
            itemTitle: item.title,
            message: 'No offers yet. Consider promoting this item.',
            action: 'promote_item'
          });
        }
        
        // Check for items with low-value offers
        if (item.topOffer && item.valueAnalysis) {
          const valueGap = item.valueAnalysis.valueGap;
          if (valueGap < -0.2) { // More than 20% below value
            recommendations.push({
              type: 'low_offer',
              priority: 'medium',
              itemId: item.id,
              itemTitle: item.title,
              message: `Top offer is ${Math.abs(valueGap * 100).toFixed(0)}% below item value.`,
              action: 'wait_for_better_offer'
            });
          }
        }
        
        // Check for highly profitable offers
        if (item.topOffer && item.valueAnalysis) {
          const profitability = item.valueAnalysis.profitability;
          if (profitability > 0.3) { // More than 30% profit
            recommendations.push({
              type: 'high_profit',
              priority: 'high',
              itemId: item.id,
              itemTitle: item.title,
              message: `Top offer offers ${profitability.toFixed(0)}% profit. Consider accepting.`,
              action: 'accept_offer'
            });
          }
        }
        
        // Check for soft-locked items with better offers
        if (item.availability.softLocked && item.offerCount > 1) {
          recommendations.push({
            type: 'competing_offer',
            priority: 'high',
            itemId: item.id,
            itemTitle: item.title,
            message: `${item.offerCount - 1} competing offers available. Consider better offer.`,
            action: 'review_competing_offers'
          });
        }
      });
      
      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      return {
        recommendations,
        totalRecommendations: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length
      };
    } catch (error) {
      console.error('Error getting portfolio recommendations:', error);
      throw error;
    }
  }

  /**
   * Listen to portfolio changes
   */
  static listenToPortfolio(userId, callback) {
    const itemsRef = collection(db, 'items');
    const q = query(itemsRef, where('userId', '==', userId));
    
    return onSnapshot(q, async (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      try {
        const portfolio = await this.getUserPortfolio(userId);
        callback(portfolio);
      } catch (error) {
        console.error('Error in portfolio listener:', error);
      }
    });
  }

  /**
   * Get market comparison for user's items
   */
  static async getMarketComparison(userId) {
    try {
      const portfolio = await this.getUserPortfolio(userId);
      
      // Get all similar items in the market
      const marketItems = await this.getSimilarItemsInMarket(portfolio.items);
      
      const marketComparison = portfolio.items.map(item => {
        const similarItems = marketItems.filter(m => 
          m.category === item.category && 
          Math.abs(m.estimatedValue - item.estimatedValue) < (item.estimatedValue * 0.2)
        );
        
        const avgMarketValue = similarItems.length > 0
          ? similarItems.reduce((sum, m) => sum + (m.estimatedValue || 0), 0) / similarItems.length
          : item.estimatedValue;
        
        const marketPosition = item.estimatedValue > avgMarketValue ? 'above' : 'below';
        const marketDiff = ((item.estimatedValue - avgMarketValue) / avgMarketValue) * 100;
        
        return {
          ...item,
          marketComparison: {
            avgMarketValue,
            marketPosition,
            marketDiff: marketDiff.toFixed(1),
            similarItemsCount: similarItems.length
          }
        };
      });
      
      return {
        marketComparison,
        portfolioMetrics: portfolio.metrics
      };
    } catch (error) {
      console.error('Error getting market comparison:', error);
      throw error;
    }
  }

  /**
   * Get similar items in the market
   */
  static async getSimilarItemsInMarket(userItems) {
    try {
      const categories = [...new Set(userItems.map(item => item.category).filter(Boolean))];
      
      if (categories.length === 0) return [];
      
      const itemsRef = collection(db, 'items');
      const marketItems = [];
      
      for (const category of categories) {
        const q = query(
          itemsRef,
          where('category', '==', category),
          where('status', '==', 'available')
        );
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const item = doc.data();
          if (item.userId !== userItems[0]?.userId) { // Exclude user's own items
            marketItems.push({
              id: doc.id,
              ...item
            });
          }
        });
      }
      
      return marketItems;
    } catch (error) {
      console.error('Error getting similar items:', error);
      return [];
    }
  }

  /**
   * Get portfolio performance over time
   */
  static async getPortfolioPerformance(userId, days = 30) {
    try {
      const portfolio = await this.getUserPortfolio(userId);
      
      // Calculate performance metrics
      const performance = {
        totalViews: 0,
        totalOffers: 0,
        acceptedOffers: 0,
        averageResponseTime: 0,
        conversionRate: 0
      };
      
      portfolio.items.forEach(item => {
        performance.totalViews += item.viewCount || 0;
        performance.totalOffers += item.offerCount || 0;
        if (item.status === 'sold') {
          performance.acceptedOffers++;
        }
      });
      
      performance.conversionRate = performance.totalViews > 0
        ? (performance.acceptedOffers / performance.totalViews) * 100
        : 0;
      
      return {
        performance,
        portfolio,
        timeframe: `${days} days`
      };
    } catch (error) {
      console.error('Error getting portfolio performance:', error);
      throw error;
    }
  }
}

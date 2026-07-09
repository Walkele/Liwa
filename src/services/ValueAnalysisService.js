import { OfferComparisonService } from './OfferComparisonService';

/**
 * Value Analysis Service
 * 
 * Analyzes item value, offers, and profitability
 * Inspired by:
 * - StockX: Market value analysis
 * - Kelley Blue Book: Vehicle valuation
 * - Zillow: Real estate market analysis
 */
export class ValueAnalysisService {
  
  /**
   * Analyze item value with offers
   */
  static async analyzeItemValue(item, offers = []) {
    try {
      const itemValue = item.estimatedValue || 0;
      const rankedOffers = OfferComparisonService.rankOffers(offers);
      
      if (rankedOffers.length === 0) {
        return {
          itemValue,
          averageOffer: 0,
          valueGap: 0,
          profitability: 0,
          offerCount: 0,
          topOffer: null,
          marketPosition: 'unknown',
          recommendation: 'wait_for_offers'
        };
      }
      
      const topOffer = rankedOffers[0];
      const averageOffer = rankedOffers.reduce((sum, o) => {
        const offerValue = o.cashAmount || (o.estimatedValue || 0);
        return sum + offerValue;
      }, 0) / rankedOffers.length;
      
      const valueGap = (topOffer.cashAmount || (topOffer.estimatedValue || 0)) - itemValue;
      const profitability = itemValue > 0 ? (valueGap / itemValue) * 100 : 0;
      
      // Determine market position
      let marketPosition = 'fair';
      if (profitability > 20) marketPosition = 'above_market';
      else if (profitability < -20) marketPosition = 'below_market';
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(profitability, offers.length);
      
      return {
        itemValue,
        averageOffer,
        valueGap,
        profitability,
        offerCount: offers.length,
        topOffer,
        marketPosition,
        recommendation,
        suggestedPrice: this.calculateSuggestedPrice(itemValue, averageOffer),
        priceRange: this.calculatePriceRange(itemValue, averageOffer)
      };
    } catch (error) {
      console.error('Error analyzing item value:', error);
      throw error;
    }
  }

  /**
   * Generate recommendation based on profitability
   */
  static generateRecommendation(profitability, offerCount) {
    if (offerCount === 0) {
      return 'wait_for_offers';
    }
    
    if (profitability > 30) {
      return 'accept_immediately';
    } else if (profitability > 15) {
      return 'consider_accepting';
    } else if (profitability > 0) {
      return 'good_offer';
    } else if (profitability > -10) {
      return 'fair_offer';
    } else if (profitability > -20) {
      return 'low_offer_negotiate';
    } else {
      return 'reject_low_offer';
    }
  }

  /**
   * Calculate suggested price based on market data
   */
  static calculateSuggestedPrice(itemValue, averageOffer) {
    if (averageOffer === 0) return itemValue;
    
    // Weight item value and average offer
    const suggestedPrice = (itemValue * 0.6) + (averageOffer * 0.4);
    return Math.round(suggestedPrice);
  }

  /**
   * Calculate reasonable price range
   */
  static calculatePriceRange(itemValue, averageOffer) {
    const basePrice = averageOffer > 0 ? averageOffer : itemValue;
    
    return {
      minimum: Math.round(basePrice * 0.8),
      maximum: Math.round(basePrice * 1.2),
      recommended: Math.round(basePrice)
    };
  }

  /**
   * Compare multiple offers
   */
  static compareOffers(offers, itemValue) {
    return offers.map(offer => {
      const offerValue = offer.cashAmount || (offer.estimatedValue || 0);
      const valueGap = offerValue - itemValue;
      const profitability = itemValue > 0 ? (valueGap / itemValue) * 100 : 0;
      
      return {
        ...offer,
        valueGap,
        profitability,
        isAboveValue: valueGap > 0,
        percentageDiff: profitability.toFixed(1),
        score: this.calculateOfferScore(offer, itemValue)
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate offer score for comparison
   */
  static calculateOfferScore(offer, itemValue) {
    let score = 0;
    
    const offerValue = offer.cashAmount || (offer.estimatedValue || 0);
    const valueGap = offerValue - itemValue;
    const profitability = itemValue > 0 ? (valueGap / itemValue) * 100 : 0;
    
    // Base score from offer value
    score += offerValue;
    
    // Bonus for profitability
    if (profitability > 0) {
      score += profitability * 2;
    }
    
    // Penalty for low offers
    if (profitability < -20) {
      score -= Math.abs(profitability) * 3;
    }
    
    // Recency bonus
    if (offer.createdAt) {
      const daysSinceCreation = (Date.now() - offer.createdAt.toDate()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - daysSinceCreation);
    }
    
    return score;
  }

  /**
   * Detect price manipulation attempts
   */
  static detectPriceManipulation(item, offers) {
    const warnings = [];
    
    // Check for extremely low offers
    const lowOffers = offers.filter(o => {
      const offerValue = o.cashAmount || (o.estimatedValue || 0);
      return offerValue < (item.estimatedValue * 0.3);
    });
    
    if (lowOffers.length > 0) {
      warnings.push({
        type: 'suspicious_low_offers',
        count: lowOffers.length,
        message: `${lowOffers.length} offers significantly below item value detected`
      });
    }
    
    // Check for rapid offer changes
    if (offers.length > 2) {
      const recentOffers = offers.slice(-3);
      const values = recentOffers.map(o => o.cashAmount || (o.estimatedValue || 0));
      const variance = Math.max(...values) - Math.min(...values);
      
      if (variance > (item.estimatedValue * 0.5)) {
        warnings.push({
          type: 'high_variance',
          variance: variance,
          message: 'High variance in recent offers detected'
        });
      }
    }
    
    // Check for same user making multiple offers
    const userOffers = {};
    offers.forEach(offer => {
      if (offer.senderId) {
        userOffers[offer.senderId] = (userOffers[offer.senderId] || 0) + 1;
      }
    });
    
    const multipleOfferUsers = Object.entries(userOffers)
      .filter(([userId, count]) => count > 2)
      .map(([userId, count]) => ({ userId, count }));
    
    if (multipleOfferUsers.length > 0) {
      warnings.push({
        type: 'multiple_offers_same_user',
        users: multipleOfferUsers,
        message: 'Multiple offers from same user detected'
      });
    }
    
    return {
      hasWarnings: warnings.length > 0,
      warnings,
      riskLevel: warnings.length > 2 ? 'high' : warnings.length > 0 ? 'medium' : 'low'
    };
  }
}

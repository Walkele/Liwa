/**
 * OfferValueCalculator
 * Calculates offer values, detects imbalances, and suggests cash additions
 */

export class OfferValueCalculator {
  
  /**
   * Calculate total value of an offer
   */
  static calculateOfferValue(offer) {
    const cashAmount = offer.cashAmount || offer.newTerms?.cashAmount || 0;
    const itemsValue = this.calculateItemsValue(offer.offeredItems || offer.newTerms?.offeredItems || []);
    
    return {
      cash: cashAmount,
      items: itemsValue,
      total: cashAmount + itemsValue
    };
  }

  /**
   * Calculate total value of items
   */
  static calculateItemsValue(items) {
    if (!items || items.length === 0) return 0;
    
    return items.reduce((sum, item) => {
      return sum + (item.estimatedValue || item.price || 0);
    }, 0);
  }

  /**
   * Calculate value difference between two items/offers
   */
  static calculateValueDifference(targetItem, offeredItems, cashAmount = 0) {
    const targetValue = targetItem.price || targetItem.estimatedValue || 0;
    const offeredItemsValue = this.calculateItemsValue(offeredItems);
    const totalOffered = offeredItemsValue + cashAmount;
    
    const difference = targetValue - totalOffered;
    const percentageDifference = targetValue > 0 ? (difference / targetValue) * 100 : 0;
    
    return {
      targetValue,
      offeredItemsValue,
      cashAmount,
      totalOffered,
      difference,
      percentageDifference,
      isBalanced: Math.abs(difference) <= (targetValue * 0.1), // Within 10%
      needsCash: difference > 0,
      excessValue: difference < 0 ? Math.abs(difference) : 0
    };
  }

  /**
   * Suggest cash addition to balance trade
   */
  static suggestCashAddition(targetItem, offeredItems, currentCash = 0) {
    const analysis = this.calculateValueDifference(targetItem, offeredItems, currentCash);
    
    if (analysis.isBalanced) {
      return {
        needsSuggestion: false,
        message: '✅ Trade is balanced',
        analysis
      };
    }

    if (!analysis.needsCash) {
      return {
        needsSuggestion: false,
        message: `✅ Your offer exceeds the item value by $${analysis.excessValue.toFixed(0)}`,
        analysis
      };
    }

    // Generate cash suggestions
    const suggestions = [];
    
    // Exact match
    suggestions.push({
      amount: Math.ceil(analysis.difference),
      label: 'Exact Match',
      description: 'Matches item value exactly',
      reasoning: 'Fair 1:1 value trade',
      color: '#4CAF50'
    });

    // Slightly over (5% more)
    const slightlyOver = Math.ceil(analysis.difference * 1.05);
    if (slightlyOver !== suggestions[0].amount) {
      suggestions.push({
        amount: slightlyOver,
        label: 'Generous',
        description: '5% above value',
        reasoning: 'Shows strong interest',
        color: '#2196F3'
      });
    }

    // Slightly under (10% less)
    const slightlyUnder = Math.ceil(analysis.difference * 0.9);
    if (slightlyUnder > 0 && slightlyUnder !== suggestions[0].amount) {
      suggestions.push({
        amount: slightlyUnder,
        label: 'Conservative',
        description: '10% below value',
        reasoning: 'Room for negotiation',
        color: '#FF9800'
      });
    }

    return {
      needsSuggestion: true,
      message: `💡 Consider adding $${Math.ceil(analysis.difference)} to balance the trade`,
      analysis,
      suggestions,
      recommendedAmount: Math.ceil(analysis.difference)
    };
  }

  /**
   * Format offer display with value breakdown
   */
  static formatOfferDisplay(offer, targetItem = null) {
    const value = this.calculateOfferValue(offer);
    const hasItems = offer.offeredItems && offer.offeredItems.length > 0;
    const hasCash = value.cash > 0;

    let displayText = '';
    let components = [];

    if (hasItems) {
      const itemNames = offer.offeredItems.map(item => item.title).join(', ');
      components.push(`${itemNames} ($${value.items})`);
    }

    if (hasCash) {
      components.push(`$${value.cash} cash`);
    }

    displayText = components.join(' + ');

    // Add value analysis if target item provided
    let valueAnalysis = null;
    if (targetItem) {
      const analysis = this.calculateValueDifference(
        targetItem, 
        offer.offeredItems || [], 
        value.cash
      );
      valueAnalysis = analysis;
    }

    return {
      displayText: displayText || 'No offer',
      value,
      hasItems,
      hasCash,
      valueAnalysis
    };
  }

  /**
   * Generate counter-offer suggestions with value awareness
   */
  static generateCounterOfferSuggestions(originalOffer, targetItem, offerHistory = []) {
    const originalValue = this.calculateOfferValue(originalOffer);
    const targetValue = targetItem.price || targetItem.estimatedValue || 0;
    
    const suggestions = [];

    // If offer is item-only, suggest cash additions
    if (originalValue.items > 0 && originalValue.cash === 0) {
      const valueDiff = targetValue - originalValue.items;
      
      if (valueDiff > 0) {
        suggestions.push({
          type: 'add_cash',
          amount: Math.ceil(valueDiff),
          label: 'Request Cash Addition',
          description: `Items + $${Math.ceil(valueDiff)} cash`,
          reasoning: `Your items are worth $${originalValue.items}, add cash to match $${targetValue} value`,
          color: '#4CAF50',
          keepItems: true
        });

        // Suggest partial cash
        const partialCash = Math.ceil(valueDiff * 0.7);
        if (partialCash > 0 && partialCash !== Math.ceil(valueDiff)) {
          suggestions.push({
            type: 'add_cash',
            amount: partialCash,
            label: 'Partial Cash',
            description: `Items + $${partialCash} cash`,
            reasoning: 'Compromise on cash addition',
            color: '#2196F3',
            keepItems: true
          });
        }
      }
    }

    // If offer has cash, suggest adjustments
    if (originalValue.cash > 0) {
      const difference = targetValue - originalValue.total;
      
      if (Math.abs(difference) > targetValue * 0.1) {
        // Suggest meeting in middle
        const middleGround = Math.ceil(originalValue.cash + (difference / 2));
        if (middleGround > 0 && middleGround !== originalValue.cash) {
          suggestions.push({
            type: 'adjust_cash',
            amount: middleGround,
            label: 'Meet in Middle',
            description: originalValue.items > 0 
              ? `Items + $${middleGround} cash`
              : `$${middleGround} cash`,
            reasoning: 'Compromise between offers',
            color: '#FF9800',
            keepItems: originalValue.items > 0
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Validate if offer is reasonable
   */
  static validateOffer(offer, targetItem) {
    const value = this.calculateOfferValue(offer);
    const targetValue = targetItem.price || targetItem.estimatedValue || 0;
    
    const percentageOfTarget = targetValue > 0 ? (value.total / targetValue) * 100 : 0;
    
    return {
      isValid: value.total > 0,
      isReasonable: percentageOfTarget >= 50, // At least 50% of target value
      isFair: percentageOfTarget >= 80 && percentageOfTarget <= 120, // Within 20% of target
      isGenerous: percentageOfTarget > 120,
      isLowball: percentageOfTarget < 50,
      percentageOfTarget,
      message: this.getValidationMessage(percentageOfTarget, value.total)
    };
  }

  /**
   * Get validation message
   */
  static getValidationMessage(percentage, totalValue) {
    if (totalValue === 0) return '❌ Offer cannot be empty';
    if (percentage < 50) return '⚠️ This offer is significantly below the item value';
    if (percentage < 80) return '💭 This offer is below the item value';
    if (percentage >= 80 && percentage <= 120) return '✅ This is a fair offer';
    if (percentage > 120) return '🎁 This is a generous offer';
    return '';
  }
}

export default OfferValueCalculator;

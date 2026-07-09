import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OfferValueCalculator } from '../services/OfferValueCalculator';

export default function CounterOfferSuggestions({ 
  originalOffer, 
  targetItem = null,
  offerHistory = [], 
  onSuggestionSelect,
  style 
}) {
  
  // Generate smart suggestions based on negotiation history
  const generateSuggestions = () => {
    const originalAmount = originalOffer.newTerms?.cashAmount || originalOffer.cashAmount || 0;
    const offeredItems = originalOffer.newTerms?.offeredItems || originalOffer.offeredItems || [];
    const hasItems = offeredItems.length > 0;
    
    const suggestions = [];

    // If target item provided and offer has items but no cash, suggest cash addition
    if (targetItem && hasItems && originalAmount === 0) {
      const valueSuggestion = OfferValueCalculator.suggestCashAddition(
        targetItem,
        offeredItems,
        0
      );

      if (valueSuggestion.needsSuggestion && valueSuggestion.suggestions) {
        // Add item + cash suggestions
        valueSuggestion.suggestions.forEach(sug => {
          const itemNames = offeredItems.map(item => item.title).join(', ');
          suggestions.push({
            amount: sug.amount,
            label: sug.label,
            description: `${itemNames} + $${sug.amount}`,
            reasoning: sug.reasoning,
            color: sug.color,
            hasItems: true,
            items: offeredItems
          });
        });

        return suggestions;
      }
    }

    // Original cash-only logic
    if (originalAmount <= 0 && !hasItems) {
      return [];
    }

    // Show item value in descriptions if items are included
    const itemsValue = OfferValueCalculator.calculateItemsValue(offeredItems);
    const totalValue = originalAmount + itemsValue;

    if (offerHistory.length === 0) {
      // First counter-offer suggestions
      if (hasItems) {
        // For item + cash offers, suggest cash adjustments
        suggestions.push({
          amount: Math.floor(originalAmount * 0.9),
          label: 'Reduce Cash',
          description: `Items + $${Math.floor(originalAmount * 0.9)}`,
          reasoning: 'Keep items, reduce cash by 10%',
          color: '#4CAF50',
          hasItems: true,
          items: offeredItems
        });

        if (originalAmount > 0) {
          suggestions.push({
            amount: Math.floor(originalAmount * 0.7),
            label: 'Lower Cash',
            description: `Items + $${Math.floor(originalAmount * 0.7)}`,
            reasoning: 'Keep items, reduce cash by 30%',
            color: '#FF9800',
            hasItems: true,
            items: offeredItems
          });
        }
      } else {
        // Cash-only offers
        suggestions.push({
          amount: Math.floor(originalAmount * 0.9),
          label: 'Conservative',
          description: '10% lower',
          reasoning: 'Small reduction to test flexibility',
          color: '#4CAF50'
        });
        
        suggestions.push({
          amount: Math.floor(originalAmount * 0.8),
          label: 'Moderate',
          description: '20% lower',
          reasoning: 'Reasonable counter-offer',
          color: '#FF9800'
        });
        
        suggestions.push({
          amount: Math.floor(originalAmount * 0.7),
          label: 'Aggressive',
          description: '30% lower',
          reasoning: 'Strong negotiation position',
          color: '#F44336'
        });
      }
    } else {
      // Subsequent counter-offers - find middle ground
      const lastAmount = offerHistory[offerHistory.length - 1].newTerms?.cashAmount || 
                         offerHistory[offerHistory.length - 1].cashAmount || 0;
      
      const middleGround = Math.round((originalAmount + lastAmount) / 2);
      const quarterStep = Math.round((originalAmount + middleGround) / 2);
      
      const itemDesc = hasItems ? `Items + $` : '$';
      
      suggestions.push({
        amount: middleGround,
        label: 'Meet in Middle',
        description: `${itemDesc}${middleGround}${hasItems ? '' : ' (between offers)'}`,
        reasoning: 'Fair compromise between offers',
        color: '#4CAF50',
        hasItems,
        items: offeredItems
      });
      
      if (quarterStep !== middleGround && quarterStep !== originalAmount) {
        suggestions.push({
          amount: quarterStep,
          label: 'Quarter Step',
          description: `${itemDesc}${quarterStep}`,
          reasoning: 'Gradual movement toward agreement',
          color: '#2196F3',
          hasItems,
          items: offeredItems
        });
      }

      // Add a slightly more aggressive option
      const aggressiveAmount = Math.round(lastAmount + (middleGround - lastAmount) * 0.3);
      if (aggressiveAmount !== middleGround && aggressiveAmount !== quarterStep) {
        suggestions.push({
          amount: aggressiveAmount,
          label: 'Small Step',
          description: `${itemDesc}${aggressiveAmount}`,
          reasoning: 'Minimal movement to show flexibility',
          color: '#FF9800',
          hasItems,
          items: offeredItems
        });
      }
    }

    return suggestions.filter(s => s.amount > 0 && s.amount !== originalAmount);
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={16} color="#FF6B6B" />
        <Text style={styles.headerText}>Smart Suggestions</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Based on negotiation patterns, here are strategic counter-offers:
      </Text>

      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestionCard, { borderLeftColor: suggestion.color }]}
            onPress={() => onSuggestionSelect(suggestion.amount)}
            activeOpacity={0.7}
          >
            <View style={styles.suggestionHeader}>
              <View style={styles.suggestionAmount}>
                <Text style={styles.amountText}>${suggestion.amount}</Text>
                <Text style={styles.descriptionText}>{suggestion.description}</Text>
              </View>
              <View style={[styles.labelBadge, { backgroundColor: suggestion.color }]}>
                <Text style={styles.labelText}>{suggestion.label}</Text>
              </View>
            </View>
            
            <Text style={styles.reasoningText}>{suggestion.reasoning}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Ionicons name="information-circle" size={14} color="#666" />
        <Text style={styles.footerText}>
          These suggestions are based on successful negotiation patterns
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  suggestionsContainer: {
    gap: 8,
  },
  suggestionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionAmount: {
    flex: 1,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  descriptionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  reasoningText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
});
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { AdvancedOfferManagementService } from '../services/AdvancedOfferManagementService';
import { OfferValueCalculator } from '../services/OfferValueCalculator';

export default function MakeBetterOfferScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { 
    itemId, 
    sellerId, 
    conversationId, 
    previousOffer = null,
    itemTitle = 'Item',
    itemPrice = 0,
    targetItem = null
  } = route.params;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [offerHistory, setOfferHistory] = useState([]);
  const [canMakeOffer, setCanMakeOffer] = useState(true);
  const [throttleInfo, setThrottleInfo] = useState(null);
  const [valueSuggestion, setValueSuggestion] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Recalculate value suggestion when items or cash changes
    if (targetItem || itemPrice > 0) {
      const item = targetItem || { price: itemPrice, title: itemTitle };
      const suggestion = OfferValueCalculator.suggestCashAddition(
        item,
        selectedItems,
        parseFloat(cashAmount) || 0
      );
      setValueSuggestion(suggestion);
    }
  }, [selectedItems, cashAmount, targetItem, itemPrice]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user's available items
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', user.uid),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc')
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const availableItems = items.filter(item => item.id !== itemId);
      setUserItems(availableItems);
      
      // Load offer history
      const history = await AdvancedOfferManagementService.getOfferHistory(itemId, user.uid);
      setOfferHistory(history);
      
      // Check if user can make an offer
      const canMakeCheck = await AdvancedOfferManagementService.canMakeOffer(user.uid, itemId);
      setCanMakeOffer(canMakeCheck.canMake);
      
      if (!canMakeCheck.canMake) {
        if (canMakeCheck.reason === 'throttled') {
          setThrottleInfo({
            endTime: canMakeCheck.throttleEndTime,
            reason: 'You\'ve been throttled due to multiple rejections'
          });
        } else if (canMakeCheck.reason === 'active_offer_exists') {
          setThrottleInfo({
            reason: 'You already have an active offer for this item'
          });
        }
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load offer data');
    } finally {
      setLoading(false);
    }
  };

  const calculateOfferValue = () => {
    const cash = parseFloat(cashAmount) || 0;
    const itemsValue = selectedItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
    return cash + itemsValue;
  };

  const validateBetterOffer = () => {
    if (!previousOffer) return true;
    
    const currentValue = calculateOfferValue();
    const previousValue = AdvancedOfferManagementService.calculateOfferValue(previousOffer);
    
    return currentValue > previousValue;
  };

  const handleItemToggle = (item) => {
    const isSelected = selectedItems.find(selected => selected.id === item.id);
    
    if (isSelected) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSubmitOffer = async () => {
    try {
      // Validation
      const currentValue = calculateOfferValue();
      if (currentValue === 0) {
        Alert.alert('Invalid Offer', 'Please add cash or items to your offer');
        return;
      }

      if (!validateBetterOffer()) {
        const previousValue = AdvancedOfferManagementService.calculateOfferValue(previousOffer);
        Alert.alert(
          'Offer Too Low',
          `Your new offer ($${currentValue}) must be higher than your previous rejected offer ($${previousValue})`
        );
        return;
      }

      setSubmitting(true);

      const offerData = {
        buyerId: user.uid,
        sellerId,
        itemId,
        conversationId,
        cashAmount: parseFloat(cashAmount) || 0,
        offeredItems: selectedItems.map(item => ({
          id: item.id,
          title: item.title,
          estimatedValue: item.estimatedValue || 0
        })),
        message: `Better offer for ${itemTitle}`
      };

      const result = await AdvancedOfferManagementService.submitOffer(offerData);

      if (result.success) {
        Alert.alert(
          'Offer Submitted! 🎉',
          'Your improved offer has been sent. The seller will be notified.',
          [
            {
              text: 'View Chat',
              onPress: () => {
                navigation.goBack();
                // Navigate to chat if needed
              }
            }
          ]
        );
      }

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderOfferHistory = () => {
    if (offerHistory.length === 0) return null;

    return (
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Your Offer History</Text>
        {offerHistory.slice(0, 3).map((offer, index) => (
          <View key={offer.id} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyStatus}>
                {offer.status.toUpperCase()}
              </Text>
              <Text style={styles.historyValue}>
                ${AdvancedOfferManagementService.calculateOfferValue(offer)}
              </Text>
            </View>
            {offer.rejectionReason && (
              <Text style={styles.rejectionReason}>
                Reason: {offer.rejectionReason}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderThrottleMessage = () => {
    if (!throttleInfo) return null;

    return (
      <View style={styles.throttleContainer}>
        <Ionicons name="warning" size={24} color="#FF9800" />
        <View style={styles.throttleContent}>
          <Text style={styles.throttleTitle}>Cannot Make Offer</Text>
          <Text style={styles.throttleMessage}>{throttleInfo.reason}</Text>
          {throttleInfo.endTime && (
            <Text style={styles.throttleEndTime}>
              Try again after: {throttleInfo.endTime.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderBetterOfferRequirement = () => {
    if (!previousOffer) return null;

    const previousValue = AdvancedOfferManagementService.calculateOfferValue(previousOffer);
    const currentValue = calculateOfferValue();
    const isValid = currentValue > previousValue;

    return (
      <View style={[styles.requirementContainer, isValid ? styles.requirementValid : styles.requirementInvalid]}>
        <Ionicons 
          name={isValid ? "checkmark-circle" : "alert-circle"} 
          size={20} 
          color={isValid ? "#4CAF50" : "#F44336"} 
        />
        <View style={styles.requirementContent}>
          <Text style={styles.requirementTitle}>Better Offer Required</Text>
          <Text style={styles.requirementText}>
            Previous offer: ${previousValue} → New offer: ${currentValue}
          </Text>
          {!isValid && (
            <Text style={styles.requirementError}>
              Your new offer must be higher than ${previousValue}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderValueSuggestion = () => {
    if (!valueSuggestion) return null;

    const { needsSuggestion, message, analysis, suggestions } = valueSuggestion;

    // Show balance indicator
    if (!needsSuggestion && analysis.isBalanced) {
      return (
        <View style={styles.balancedContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.balancedText}>{message}</Text>
        </View>
      );
    }

    // Show value difference warning
    if (needsSuggestion && selectedItems.length > 0) {
      return (
        <View style={styles.valueSuggestionContainer}>
          <View style={styles.suggestionHeader}>
            <Ionicons name="calculator" size={20} color="#FF9800" />
            <Text style={styles.suggestionTitle}>Value Analysis</Text>
          </View>

          <View style={styles.valueBreakdown}>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Target Item Value:</Text>
              <Text style={styles.valueAmount}>${analysis.targetValue}</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Your Items Value:</Text>
              <Text style={styles.valueAmount}>${analysis.offeredItemsValue}</Text>
            </View>
            {analysis.cashAmount > 0 && (
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Cash Added:</Text>
                <Text style={styles.valueAmount}>${analysis.cashAmount}</Text>
              </View>
            )}
            <View style={[styles.valueRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Offered:</Text>
              <Text style={styles.totalAmount}>${analysis.totalOffered}</Text>
            </View>
            <View style={[styles.valueRow, styles.differenceRow]}>
              <Text style={styles.differenceLabel}>Difference:</Text>
              <Text style={[
                styles.differenceAmount,
                analysis.needsCash ? styles.negativeAmount : styles.positiveAmount
              ]}>
                {analysis.needsCash ? '-' : '+'}${Math.abs(analysis.difference).toFixed(0)}
              </Text>
            </View>
          </View>

          {suggestions && suggestions.length > 0 && (
            <>
              <Text style={styles.suggestionMessage}>{message}</Text>
              <View style={styles.cashSuggestions}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.cashSuggestionCard, { borderLeftColor: suggestion.color }]}
                    onPress={() => setCashAmount(suggestion.amount.toString())}
                  >
                    <View style={styles.suggestionCardHeader}>
                      <Text style={styles.suggestionAmount}>${suggestion.amount}</Text>
                      <View style={[styles.suggestionBadge, { backgroundColor: suggestion.color }]}>
                        <Text style={styles.suggestionBadgeText}>{suggestion.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                    <Text style={styles.suggestionReasoning}>{suggestion.reasoning}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      );
    }

    return null;
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedItems.find(selected => selected.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.selectedItemCard]}
        onPress={() => handleItemToggle(item)}
      >
        <View style={styles.itemImagePlaceholder}>
          <Ionicons name="image-outline" size={30} color="#666" />
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
          {item.estimatedValue > 0 && (
            <Text style={styles.itemValue}>~${item.estimatedValue}</Text>
          )}
        </View>
        
        <View style={styles.itemSelection}>
          <Ionicons 
            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={isSelected ? "#4CAF50" : "#CCC"} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading offer data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Make Better Offer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Info */}
        <View style={styles.itemInfoCard}>
          <Text style={styles.itemInfoTitle}>Making offer for:</Text>
          <Text style={styles.itemInfoName}>{itemTitle}</Text>
        </View>

        {/* Throttle Message */}
        {renderThrottleMessage()}

        {/* Offer History */}
        {renderOfferHistory()}

        {/* Better Offer Requirement */}
        {renderBetterOfferRequirement()}

        {/* Value Suggestion */}
        {renderValueSuggestion()}

        {canMakeOffer && (
          <>
            {/* Cash Offer */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cash Offer</Text>
              <View style={styles.cashInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.cashInput}
                  value={cashAmount}
                  onChangeText={setCashAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Item Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Add Items ({selectedItems.length} selected)
              </Text>
              
              {userItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cube-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateText}>No items available to offer</Text>
                </View>
              ) : (
                <FlatList
                  data={userItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderUserItem}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Offer Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Offer Summary</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cash:</Text>
                <Text style={styles.summaryValue}>
                  ${parseFloat(cashAmount) || 0}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Value:</Text>
                <Text style={styles.summaryValue}>
                  ${selectedItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0)}
                </Text>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Value:</Text>
                <Text style={styles.totalValue}>
                  ${calculateOfferValue()}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Submit Button */}
      {canMakeOffer && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!validateBetterOffer() || calculateOfferValue() === 0 || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitOffer}
            disabled={!validateBetterOffer() || calculateOfferValue() === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Better Offer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    flex: 1,
    padding: 16
  },
  itemInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  itemInfoTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  itemInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  throttleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start'
  },
  throttleContent: {
    flex: 1,
    marginLeft: 12
  },
  throttleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4
  },
  throttleMessage: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4
  },
  throttleEndTime: {
    fontSize: 12,
    color: '#FF9800'
  },
  historySection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 8,
    marginBottom: 8
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666'
  },
  historyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B'
  },
  rejectionReason: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic'
  },
  requirementContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start'
  },
  requirementValid: {
    backgroundColor: '#E8F5E8'
  },
  requirementInvalid: {
    backgroundColor: '#FFEBEE'
  },
  requirementContent: {
    flex: 1,
    marginLeft: 12
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  requirementError: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500'
  },
  balancedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  balancedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
  },
  valueSuggestionContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  valueBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  valueLabel: {
    fontSize: 13,
    color: '#666',
  },
  valueAmount: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 4,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  differenceRow: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: -12,
    marginBottom: -12,
    marginTop: 8,
    padding: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  differenceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  differenceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  negativeAmount: {
    color: '#F44336',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  suggestionMessage: {
    fontSize: 13,
    color: '#FF9800',
    marginBottom: 12,
    fontWeight: '500',
  },
  cashSuggestions: {
    gap: 8,
  },
  cashSuggestionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
  },
  suggestionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  suggestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  suggestionReasoning: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8
  },
  cashInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    color: '#333'
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    backgroundColor: '#FFF'
  },
  selectedItemCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9'
  },
  itemImagePlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  itemInfo: {
    flex: 1
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  itemValue: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500'
  },
  itemSelection: {
    marginLeft: 12
  },
  emptyState: {
    alignItems: 'center',
    padding: 32
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8
  },
  summarySection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B'
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC'
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  }
});
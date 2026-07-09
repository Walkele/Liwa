import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const LiwaCounterOfferModal = ({
  visible,
  onClose,
  onSubmit,
  currentAmount,
  itemTitle,
  itemPrice = 0,
  counterOfferCount = 0,
  maxCounterOffers = 4,
  userRole = 'buyer', // 'buyer' or 'seller' - determines negotiation direction
  originalOffer = null,
  offeredItems = [], // Items being offered in exchange
  offeredItemsValue = 0 // Total value of offered items
}) => {
  const [counterAmount, setCounterAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [inputMode, setInputMode] = useState(false);

  const roundsRemaining = maxCounterOffers - counterOfferCount;
  const isLastRound = roundsRemaining <= 1;

  // Determine negotiation direction based on user role
  const isBuyer = userRole === 'buyer';
  const isSeller = userRole === 'seller';
  
  // Check if this is an item exchange (items offered but no/little cash)
  const hasOfferedItems = offeredItems && offeredItems.length > 0;
  const isItemExchange = hasOfferedItems && currentAmount === 0;
  const isItemPlusCash = hasOfferedItems && currentAmount > 0;
  const totalOfferValue = offeredItemsValue + currentAmount;

  // Smart amount suggestions based on role and offer type
  const generateSuggestions = () => {
    if (isItemExchange) {
      // For item-only exchanges, suggest cash ADDITIONS
      const valueDiff = itemPrice - offeredItemsValue;
      
      if (isSeller && valueDiff > 0) {
        // Seller wants more value - suggest cash additions
        return [
          { label: 'Fair', amount: Math.ceil(valueDiff), color: '#4CAF50', description: 'Balance value' },
          { label: 'Generous', amount: Math.ceil(valueDiff * 1.2), color: '#2196F3', description: '+20% more' },
          { label: 'Premium', amount: Math.ceil(valueDiff * 1.5), color: '#FF6B6B', description: '+50% more' }
        ];
      } else if (isBuyer && valueDiff < 0) {
        // Buyer's items are worth more - can ask for cash back
        return [
          { label: 'Fair', amount: Math.ceil(Math.abs(valueDiff)), color: '#4CAF50', description: 'Balance value' },
          { label: 'Modest', amount: Math.ceil(Math.abs(valueDiff) * 0.7), color: '#FF9800', description: 'Partial' },
          { label: 'Small', amount: Math.ceil(Math.abs(valueDiff) * 0.5), color: '#FF6B6B', description: 'Minimal' }
        ];
      } else {
        // Values are close, suggest small adjustments
        const baseAmount = Math.max(10, Math.ceil(itemPrice * 0.1));
        return [
          { label: 'Small', amount: baseAmount, color: '#4CAF50', description: 'Minor adjust' },
          { label: 'Medium', amount: baseAmount * 2, color: '#FF9800', description: 'Moderate' },
          { label: 'Large', amount: baseAmount * 3, color: '#FF6B6B', description: 'Significant' }
        ];
      }
    } else if (isItemPlusCash) {
      // For item + cash offers, adjust the cash portion
      if (isBuyer) {
        return [
          { label: '-20%', amount: Math.max(1, Math.round(currentAmount * 0.8)), color: '#4CAF50', description: 'Less cash' },
          { label: '-40%', amount: Math.max(1, Math.round(currentAmount * 0.6)), color: '#FF9800', description: 'Much less' },
          { label: 'No cash', amount: 0, color: '#FF6B6B', description: 'Items only' }
        ];
      } else {
        return [
          { label: '+20%', amount: Math.round(currentAmount * 1.2), color: '#4CAF50', description: 'More cash' },
          { label: '+50%', amount: Math.round(currentAmount * 1.5), color: '#FF9800', description: 'Much more' },
          { label: '+100%', amount: Math.round(currentAmount * 2), color: '#FF6B6B', description: 'Double cash' }
        ];
      }
    } else {
      // Cash-only offers
      if (isBuyer) {
        return [
          { label: '-10%', amount: Math.max(1, Math.round(currentAmount * 0.9)), color: '#4CAF50', description: 'Small cut' },
          { label: '-20%', amount: Math.max(1, Math.round(currentAmount * 0.8)), color: '#FF9800', description: 'Moderate' },
          { label: '-30%', amount: Math.max(1, Math.round(currentAmount * 0.7)), color: '#FF6B6B', description: 'Aggressive' }
        ];
      } else {
        return [
          { label: '+10%', amount: Math.round(currentAmount * 1.1) || 10, color: '#4CAF50', description: 'Small bump' },
          { label: '+25%', amount: Math.round(currentAmount * 1.25) || 25, color: '#FF9800', description: 'Moderate' },
          { label: '+50%', amount: Math.round(currentAmount * 1.5) || 50, color: '#FF6B6B', description: 'Significant' }
        ];
      }
    }
  };

  const suggestions = generateSuggestions();

  // Validate negotiation direction
  const validateNegotiationDirection = (amount) => {
    // For item exchanges, cash is ADDITIONAL, so different rules apply
    if (isItemExchange) {
      // Any positive cash addition is valid for item exchanges
      if (amount < 0) {
        return {
          isValid: false,
          message: '⚠️ Cash amount cannot be negative. Enter the additional cash to add to the item exchange.'
        };
      }
      return { isValid: true };
    }

    // For cash-only or item+cash, apply normal negotiation rules
    if (isBuyer && amount >= currentAmount && currentAmount > 0) {
      return {
        isValid: false,
        message: '⚠️ As a buyer, your counter-offer should be LOWER than their asking price. You\'re trying to negotiate DOWN.'
      };
    }
    
    if (isSeller && amount <= currentAmount && currentAmount > 0) {
      return {
        isValid: false,
        message: '⚠️ As a seller, your counter-offer should be HIGHER than their offer. You\'re trying to negotiate UP.'
      };
    }

    // Check if amount is reasonable (not too extreme) - only if currentAmount > 0
    if (currentAmount > 0) {
      const percentageChange = Math.abs((amount - currentAmount) / currentAmount) * 100;
      
      if (percentageChange > 70) {
        return {
          isValid: false,
          message: `⚠️ Your counter-offer is ${percentageChange.toFixed(0)}% different. Consider a more reasonable adjustment to keep negotiations productive.`
        };
      }
    }

    return { isValid: true };
  };

  const handleSubmit = () => {
    const amount = selectedAmount || parseFloat(counterAmount);
    
    if (!amount || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (must be $0 or greater)');
      return;
    }
    
    // For item exchanges with $0 current amount, allow any positive amount
    if (isItemExchange && currentAmount === 0) {
      onSubmit(amount);
      handleClose();
      return;
    }
    
    if (amount === currentAmount && currentAmount > 0) {
      Alert.alert('Same Amount', 'Your counter-offer must be different from the current offer');
      return;
    }

    // Validate negotiation direction
    const validation = validateNegotiationDirection(amount);
    if (!validation.isValid) {
      Alert.alert(
        'Invalid Counter-Offer',
        validation.message,
        [
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }
    
    onSubmit(amount);
    handleClose();
  };

  const handleClose = () => {
    setCounterAmount('');
    setSelectedAmount(null);
    setInputMode(false);
    onClose();
  };

  const selectAmount = (amount) => {
    setSelectedAmount(amount);
    setCounterAmount(amount.toString());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="swap-horizontal" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Make Counter-Offer</Text>
                <Text style={styles.subtitle}>
                  Round {counterOfferCount + 2} of {maxCounterOffers + 1}
                  {roundsRemaining > 1 && ` • ${roundsRemaining - 1} left`}
                  {isLastRound && ' • Final round!'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current offer display */}
            <View style={styles.currentOffer}>
              {hasOfferedItems && (
                <>
                  <View style={styles.itemsOfferedSection}>
                    <Text style={styles.itemsOfferedLabel}>📦 Items Being Exchanged:</Text>
                    {offeredItems.map((item, index) => (
                      <Text key={index} style={styles.itemName}>• {item.title || item.name}</Text>
                    ))}
                    <Text style={styles.itemsValue}>Items Value: ${offeredItemsValue}</Text>
                  </View>
                  
                  <View style={styles.plusCashSection}>
                    <Ionicons name="add-circle" size={24} color="#2196F3" />
                    <Text style={styles.plusCashText}>PLUS</Text>
                  </View>
                </>
              )}
              
              <Text style={styles.currentLabel}>
                {isItemExchange ? '💵 Additional Cash' : '💵 Cash Offer'}
              </Text>
              <Text style={styles.currentAmount}>
                ${currentAmount || 0}
              </Text>
              
              {hasOfferedItems && (
                <>
                  <View style={styles.totalOfferSection}>
                    <Text style={styles.totalOfferLabel}>= Total Offer Value:</Text>
                    <Text style={styles.totalOfferAmount}>${totalOfferValue}</Text>
                  </View>
                  
                  <View style={styles.additionalCashReminder}>
                    <Ionicons name="information-circle" size={16} color="#2196F3" />
                    <Text style={styles.additionalCashReminderText}>
                      The cash you enter is ADDED to the items above, not replacing them
                    </Text>
                  </View>
                </>
              )}
              
              {itemPrice > 0 && (
                <Text style={styles.itemPriceLabel}>🎯 Target item value: ${itemPrice}</Text>
              )}
            </View>

            {/* Negotiation direction hint */}
            <View style={[styles.negotiationHint, isItemExchange ? styles.exchangeHint : (isBuyer ? styles.buyerHint : styles.sellerHint)]}>
              <Ionicons 
                name={isItemExchange ? "add-circle" : (isBuyer ? "arrow-down-circle" : "arrow-up-circle")} 
                size={20} 
                color={isItemExchange ? "#2196F3" : (isBuyer ? "#4CAF50" : "#FF6B6B")} 
              />
              <Text style={styles.negotiationHintText}>
                {isItemExchange 
                  ? `💡 You're ${isBuyer ? 'BUYER' : 'SELLER'}: Enter cash to ADD to the items (not replace them)`
                  : isBuyer 
                    ? "💡 You're BUYER: Counter with LOWER cash amount"
                    : "💡 You're SELLER: Counter with HIGHER cash amount"}
              </Text>
            </View>

            {/* Quick suggestions */}
            {!inputMode && (
              <View style={styles.suggestions}>
                <Text style={styles.sectionTitle}>
                  {isItemExchange ? 'Suggested Cash Additions' : 'Quick Counter-Offers'}
                </Text>
                <View style={styles.suggestionButtons}>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionButton,
                        { backgroundColor: suggestion.color },
                        selectedAmount === suggestion.amount && styles.selectedSuggestion
                      ]}
                      onPress={() => selectAmount(suggestion.amount)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                        <Text style={styles.suggestionAmount}>${suggestion.amount}</Text>
                        {suggestion.description && (
                          <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                        )}
                        {selectedAmount === suggestion.amount && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={16} color="white" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.customButton}
                  onPress={() => setInputMode(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.customButtonContent}>
                    <View style={styles.customButtonIcon}>
                      <Ionicons name="create-outline" size={20} color="#FF6B6B" />
                    </View>
                    <Text style={styles.customButtonText}>Enter Custom Amount</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Custom input */}
            {inputMode && (
              <View style={styles.customInput}>
                <Text style={styles.sectionTitle}>Your Counter-Offer</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={counterAmount}
                    onChangeText={setCounterAmount}
                    placeholder="0"
                    keyboardType="numeric"
                    autoFocus
                    selectTextOnFocus
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => {
                    setInputMode(false);
                    setCounterAmount('');
                    setSelectedAmount(null);
                  }}
                >
                  <Ionicons name="arrow-back" size={16} color="#666" />
                  <Text style={styles.backButtonText}>Back to suggestions</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Warning for final round */}
            {isLastRound && (
              <View style={styles.warning}>
                <Ionicons name="warning" size={16} color="#FF9800" />
                <Text style={styles.warningText}>
                  This is your final counter-offer. They must accept or decline.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Fixed Action buttons at bottom */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <View style={styles.modalButtonContent}>
                <Ionicons name="close-outline" size={18} color="#666" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!selectedAmount && !counterAmount) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={!selectedAmount && !counterAmount}
              activeOpacity={0.8}
            >
              <View style={styles.modalButtonContent}>
                <Ionicons name="paper-plane" size={18} color="white" />
                <Text style={styles.submitButtonText}>
                  Send ${selectedAmount || counterAmount || '0'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
    flexDirection: 'column',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  currentOffer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
  },
  itemsOfferedSection: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 8,
  },
  itemsOfferedLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  itemName: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  itemsValue: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  plusCashSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  plusCashText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  totalOfferSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
    borderStyle: 'dashed',
  },
  totalOfferLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  totalOfferAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  additionalCashReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  additionalCashReminderText: {
    flex: 1,
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
    lineHeight: 16,
  },
  currentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  currentAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPriceLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  zeroOfferHint: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 6,
    fontStyle: 'italic',
  },
  negotiationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  buyerHint: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  sellerHint: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF6B6B',
  },
  exchangeHint: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  negotiationHintText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  suggestions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  suggestionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  suggestionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative',
  },
  selectedSuggestion: {
    transform: [{ scale: 1.05 }],
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  suggestionContent: {
    alignItems: 'center',
    position: 'relative',
  },
  suggestionLabel: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionAmount: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  suggestionDescription: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 2,
  },
  customButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
  },
  customButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  customInput: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  dollarSign: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    padding: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  modalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    elevation: 2,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8E1',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#FF9800',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
});

export default LiwaCounterOfferModal;
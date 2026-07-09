import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { TradeNegotiationService } from '../services/TradeNegotiationService';
import { EscrowService } from '../services/EscrowService';
import ItemSelectionModal from '../components/ItemSelectionModal';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function TradeProposalScreen({ route, navigation }) {
  const { user } = useAuth();
  const { targetItem, myItem, otherUserId, otherUserName } = route.params || {};
  
  // Handle missing parameters
  if (!targetItem || !otherUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Missing Information</Text>
          <Text style={styles.errorSubtext}>
            Required trade information not available. Please try again from the chat.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const [selectedItems, setSelectedItems] = useState(myItem ? [myItem] : []);
  const [offerMessage, setOfferMessage] = useState('');
  const [cashOffer, setCashOffer] = useState('');
  const [tradeType, setTradeType] = useState('trade'); // 'trade' or 'cash'
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isMatchBased, setIsMatchBased] = useState(!!myItem); // Track if this is from a match

  const totalValue = selectedItems.reduce((sum, item) => sum + (item.price || item.estimatedValue || 0), 0);
  const targetValue = targetItem?.price || targetItem?.estimatedValue || 0;

  const handleCreateProposal = async () => {
    if (selectedItems.length === 0 && tradeType === 'trade') {
      Alert.alert('Items Required', 'Please select at least one item to trade');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the trading terms');
      return;
    }

    try {
      setLoading(true);

      // Deep sanitize to remove ALL Firebase-specific fields and potential timestamp objects
      const deepSanitize = (obj) => {
        if (!obj) return null;
        
        const sanitized = {};
        const safeFields = [
          'id', 'title', 'price', 'estimatedValue', 'images', 'imageURL', 
          'description', 'category', 'condition', 'tags', 'location'
        ];
        
        safeFields.forEach(field => {
          if (obj[field] !== undefined) {
            // Check if the value is a timestamp object
            if (obj[field] && typeof obj[field] === 'object' && obj[field].toDate) {
              // It's a Firebase timestamp, convert to regular date
              sanitized[field] = obj[field].toDate().toISOString();
            } else if (Array.isArray(obj[field])) {
              // Sanitize arrays recursively
              sanitized[field] = obj[field].map(item => 
                typeof item === 'object' ? deepSanitize(item) : item
              );
            } else if (typeof obj[field] === 'object' && obj[field] !== null) {
              // Sanitize nested objects
              sanitized[field] = deepSanitize(obj[field]);
            } else {
              sanitized[field] = obj[field];
            }
          }
        });
        
        return sanitized;
      };

      const sanitizedSelectedItems = selectedItems.map(deepSanitize).filter(Boolean);
      const sanitizedMyItem = isMatchBased ? deepSanitize(myItem) : null;
      const sanitizedTargetItem = deepSanitize(targetItem);

      const proposalData = {
        proposerUserId: user.uid,
        targetUserId: otherUserId,
        targetItemId: targetItem.id,
        targetItemTitle: targetItem.title,
        targetItemPrice: targetValue,
        estimatedValue: targetValue,
        tradeType: tradeType,
        participantIds: [user.uid, otherUserId],
        proposerSelectedItems: sanitizedSelectedItems,
        offerMessage: offerMessage,
        cashOffer: tradeType === 'cash' ? parseFloat(cashOffer) : 0,
        termsAccepted: true,
        // Include match-specific data if this is from a match
        isMatchBased: isMatchBased,
        matchedItem: sanitizedMyItem,
        targetItemData: sanitizedTargetItem,
        valueComparison: {
          targetValue: targetValue,
          proposerValue: totalValue,
          difference: totalValue - targetValue,
          percentage: targetValue > 0 ? ((totalValue / targetValue) * 100).toFixed(1) : 0
        }
      };

      console.log('📝 Creating trade proposal with deep sanitized data:', {
        hasSelectedItems: sanitizedSelectedItems.length > 0,
        hasMatchedItem: !!sanitizedMyItem,
        hasTargetItem: !!sanitizedTargetItem,
        itemCount: sanitizedSelectedItems.length,
        sampleItem: sanitizedSelectedItems[0] || 'none'
      });

      const result = await TradeNegotiationService.createTradeProposal(proposalData);

      if (result.success) {
        // Send a message to the conversation about the trade proposal
        try {
          // Generate conversation ID for the trade
          const conversationId = `trade_${result.proposalId}`;
          
          // Create the conversation
          await addDoc(collection(db, 'conversations'), {
            id: conversationId,
            type: 'trade',
            tradeProposalId: result.proposalId,
            participants: [user.uid, otherUserId],
            participantNames: {
              [user.uid]: user.displayName || user.email?.split('@')[0] || 'You',
              [otherUserId]: otherUserName
            },
            status: 'active',
            lastMessage: `Trade proposal: ${targetItem.title}`,
            lastMessageAt: serverTimestamp(),
            unreadCount: {
              [user.uid]: 0,
              [otherUserId]: 1
            },
            createdAt: serverTimestamp()
          });

          // Send the trade proposal message
          await addDoc(collection(db, 'messages'), {
            conversationId,
            senderId: user.uid,
            senderName: user.displayName || user.email?.split('@')[0] || 'You',
            targetUserId: otherUserId,
            messageType: 'trade_proposal',
            text: `proposed a trade for "${targetItem.title}"`,
            tradeProposalId: result.proposalId,
            targetItemId: targetItem.id,
            targetItemTitle: targetItem.title,
            targetItemPrice: targetValue,
            estimatedValue: targetValue,
            proposerSelectedItems: sanitizedSelectedItems,
            cashOffer: tradeType === 'cash' ? parseFloat(cashOffer) : 0,
            tradeType: tradeType,
            isMatchBased: isMatchBased,
            matchedItem: sanitizedMyItem,
            valueComparison: proposalData.valueComparison,
            status: 'pending',
            // Additional fields for CounterOfferCard compatibility
            buyerId: user.uid, // The person proposing the trade is the buyer
            sellerId: otherUserId, // The person receiving the proposal is the seller
            originalBuyerId: user.uid, // Track who initiated the trade
            createdAt: serverTimestamp(),
            read: false,
            delivered: true
          });

          console.log('✅ Trade proposal message sent to conversation');
        } catch (messageError) {
          console.error('❌ Error sending trade proposal message:', messageError);
          // Continue even if message fails - the proposal was created
        }

        Alert.alert(
          'Trade Proposal Created',
          'Your trade proposal has been sent. You can track its progress in the chat.',
          [
            {
              text: 'Go to Chat',
              onPress: () => navigation.navigate('Chat', {
                conversationId: `trade_${result.proposalId}`,
                otherUserId: otherUserId,
                otherUserName: otherUserName,
                itemTitle: targetItem.title,
                targetItem: targetItem,
                myItem: myItem
              })
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create trade proposal');
      }
    } catch (error) {
      console.error('Error creating proposal:', error);
      Alert.alert('Error', 'Failed to create trade proposal');
    } finally {
      setLoading(false);
    }
  };

  const renderTradeTypeSelector = () => {
    return (
      <View style={styles.tradeTypeSelector}>
        <TouchableOpacity
          style={[
            styles.tradeTypeButton,
            tradeType === 'trade' && styles.tradeTypeButtonActive
          ]}
          onPress={() => setTradeType('trade')}
        >
          <Ionicons 
            name="swap-horizontal" 
            size={24} 
            color={tradeType === 'trade' ? '#FF6B6B' : '#999'} 
          />
          <Text style={[
            styles.tradeTypeText,
            tradeType === 'trade' && styles.tradeTypeTextActive
          ]}>
            Item Trade
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tradeTypeButton,
            tradeType === 'cash' && styles.tradeTypeButtonActive
          ]}
          onPress={() => setTradeType('cash')}
        >
          <Ionicons 
            name="cash" 
            size={24} 
            color={tradeType === 'cash' ? '#FF6B6B' : '#999'} 
          />
          <Text style={[
            styles.tradeTypeText,
            tradeType === 'cash' && styles.tradeTypeTextActive
          ]}>
            Cash Offer
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTargetItem = () => {
    if (!targetItem) return null;

    return (
      <View style={styles.targetItemCard}>
        <Text style={styles.sectionTitle}>
          {isMatchBased ? 'Their Matched Item' : 'Item You Want'}
        </Text>
        <View style={styles.itemDisplay}>
          {targetItem.images && targetItem.images.length > 0 ? (
            <Image source={{ uri: targetItem.images[0] }} style={styles.itemImage} />
          ) : targetItem.imageURL ? (
            <Image source={{ uri: targetItem.imageURL }} style={styles.itemImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
          <View style={styles.itemDetails}>
            <Text style={styles.itemTitle}>{targetItem.title}</Text>
            <Text style={styles.itemPrice}>${targetValue}</Text>
            <Text style={styles.itemOwner}>by {otherUserName}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderYourItems = () => {
    if (tradeType === 'cash') return null;

    return (
      <View style={styles.yourItemsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isMatchBased ? 'Matched Item + Additional Items' : 'Your Items for Trade'}
          </Text>
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={() => setShowItemSelection(true)}
          >
            <Ionicons name="add-circle" size={20} color="#FF6B6B" />
            <Text style={styles.addItemText}>
              {isMatchBased ? 'Add More Items' : 'Add Items'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedItems.length === 0 ? (
          <View style={styles.emptyItems}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No items selected</Text>
            <Text style={styles.emptySubtext}>
              Select items from your inventory to offer for trade
            </Text>
          </View>
        ) : (
          <View style={styles.selectedItemsList}>
            {selectedItems.map((item, index) => (
              <View key={item.id} style={styles.selectedItem}>
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} style={styles.selectedItemImage} />
                ) : item.imageURL ? (
                  <Image source={{ uri: item.imageURL }} style={styles.selectedItemImage} />
                ) : (
                  <View style={styles.selectedItemImage}>
                    <Ionicons name="image-outline" size={24} color="#ccc" />
                  </View>
                )}
                <View style={styles.selectedItemInfo}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.selectedItemTitle}>{item.title}</Text>
                    {isMatchBased && index === 0 && (
                      <View style={styles.matchedBadge}>
                        <Text style={styles.matchedBadgeText}>MATCHED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.selectedItemPrice}>${item.price || item.estimatedValue || 0}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => {
                    // Don't allow removing the matched item if this is a match-based proposal
                    if (isMatchBased && index === 0) {
                      Alert.alert('Matched Item', 'This is the item that was matched. You can add more items but cannot remove the matched item.');
                      return;
                    }
                    setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                  }}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={24} 
                    color={isMatchBased && index === 0 ? "#ccc" : "#F44336"} 
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCashOffer = () => {
    if (tradeType !== 'cash') return null;

    return (
      <View style={styles.cashOfferCard}>
        <Text style={styles.sectionTitle}>Your Cash Offer</Text>
        <View style={styles.cashInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.cashInput}
            value={cashOffer}
            onChangeText={setCashOffer}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        <Text style={styles.cashHint}>
          Suggested range: ${Math.round(targetValue * 0.8)} - ${Math.round(targetValue * 1.2)}
        </Text>
      </View>
    );
  };

  const renderValueComparison = () => {
    const difference = totalValue - targetValue;
    const cashAmount = tradeType === 'cash' ? parseFloat(cashOffer) || 0 : 0;
    const totalOffer = tradeType === 'cash' ? cashAmount : totalValue;

    const comparison = totalOffer - targetValue;
    const percentage = targetValue > 0 ? (totalOffer / targetValue) * 100 : 0;

    let status, color, message;
    if (Math.abs(comparison) < targetValue * 0.1) {
      status = 'fair';
      color = '#4CAF50';
      message = 'Fair Trade';
    } else if (comparison > 0) {
      status = 'generous';
      color = '#FF9800';
      message = `Your offer is $${comparison} higher`;
    } else {
      status = 'low';
      color = '#F44336';
      message = `Your offer is $${Math.abs(comparison)} lower`;
    }

    return (
      <View style={[styles.valueComparison, { backgroundColor: `${color}20` }]}>
        <Ionicons name={status === 'fair' ? 'checkmark-circle' : 'information-circle'} size={24} color={color} />
        <View style={styles.valueComparisonInfo}>
          <Text style={[styles.valueComparisonTitle, { color }]}>Value Assessment</Text>
          <Text style={styles.valueComparisonMessage}>{message}</Text>
          <Text style={styles.valueComparisonPercentage}>{percentage.toFixed(0)}% of target value</Text>
        </View>
      </View>
    );
  };

  const renderEscrowInfo = () => {
    const fees = EscrowService.calculateEscrowFees({
      totalValue: tradeType === 'cash' ? parseFloat(cashOffer) || 0 : totalValue,
      tradeType: tradeType
    });

    return (
      <View style={styles.escrowInfoCard}>
        <View style={styles.escrowHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <Text style={styles.escrowTitle}>Binance-Like Escrow Protection</Text>
        </View>
        <Text style={styles.escrowDescription}>
          Your items will be locked in secure escrow until both parties confirm the trade is complete.
        </Text>
        <View style={styles.escrowFees}>
          <Text style={styles.escrowFeeLabel}>Service Fee:</Text>
          <Text style={styles.escrowFeeValue}>{fees.percentage}% (${fees.amount.toFixed(2)})</Text>
        </View>
      </View>
    );
  };

  const renderTerms = () => {
    return (
      <View style={styles.termsCard}>
        <Text style={styles.termsTitle}>Trading Terms</Text>
        <View style={styles.termsList}>
          <View style={styles.termItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.termText}>Items locked in secure escrow</Text>
          </View>
          <View style={styles.termItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.termText}>Both parties must confirm exchange</Text>
          </View>
          <View style={styles.termItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.termText}>7-day dispute resolution period</Text>
          </View>
          <View style={styles.termItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.termText}>Smart contract guarantees execution</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.termsAgreement}
          onPress={() => setTermsAccepted(!termsAccepted)}
        >
          <Ionicons 
            name={termsAccepted ? "checkbox" : "square-outline"} 
            size={24} 
            color={termsAccepted ? "#4CAF50" : "#999"} 
          />
          <Text style={styles.termsAgreementText}>
            I agree to the trading terms and escrow conditions
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trade Proposal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {renderTradeTypeSelector()}
        {renderTargetItem()}
        {renderYourItems()}
        {renderCashOffer()}
        
        {(selectedItems.length > 0 || (tradeType === 'cash' && cashOffer)) && (
          <>
            {renderValueComparison()}
            {renderEscrowInfo()}
          </>
        )}

        <View style={styles.messageCard}>
          <Text style={styles.sectionTitle}>Message (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            value={offerMessage}
            onChangeText={setOfferMessage}
            placeholder="Add a personal message to your offer..."
            multiline
            maxLength={500}
            placeholderTextColor="#999"
          />
        </View>

        {renderTerms()}

        <TouchableOpacity
          style={[
            styles.createButton,
            (!termsAccepted || (selectedItems.length === 0 && tradeType === 'trade') || (tradeType === 'cash' && !cashOffer)) && styles.createButtonDisabled
          ]}
          onPress={handleCreateProposal}
          disabled={loading || !termsAccepted || (selectedItems.length === 0 && tradeType === 'trade') || (tradeType === 'cash' && !cashOffer)}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Trade Proposal'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ItemSelectionModal
        visible={showItemSelection}
        onClose={() => setShowItemSelection(false)}
        onItemsSelected={setSelectedItems}
        maxItems={isMatchBased ? 4 : 3}
        targetItemValue={targetValue}
        title="Select Items to Offer"
        preSelectedItems={isMatchBased ? [myItem] : []}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tradeTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  tradeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tradeTypeButtonActive: {
    backgroundColor: '#FFF0F0',
  },
  tradeTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tradeTypeTextActive: {
    color: '#FF6B6B',
  },
  targetItemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  itemDisplay: {
    flexDirection: 'row',
    gap: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  itemOwner: {
    fontSize: 12,
    color: '#666',
  },
  yourItemsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  emptyItems: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedItemsList: {
    gap: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  selectedItemImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  selectedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  matchedBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  matchedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  selectedItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  removeItemButton: {
    padding: 4,
  },
  cashOfferCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginRight: 8,
  },
  cashInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cashHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  valueComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  valueComparisonInfo: {
    flex: 1,
  },
  valueComparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  valueComparisonMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  valueComparisonPercentage: {
    fontSize: 12,
    color: '#999',
  },
  escrowInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  escrowDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  escrowFees: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  escrowFeeLabel: {
    fontSize: 14,
    color: '#666',
  },
  escrowFeeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  messageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  termsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  termsList: {
    gap: 8,
    marginBottom: 16,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termText: {
    fontSize: 14,
    color: '#666',
  },
  termsAgreement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  termsAgreementText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
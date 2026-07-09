import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiwaCounterOfferModal from './LiwaCounterOfferModal';

// Decline Reason Modal Component
const DeclineReasonModal = ({ visible, onClose, onSubmit, offerAmount }) => {
  const [selectedReason, setSelectedReason] = useState(null);

  const reasons = [
    { 
      id: 'not_interested', 
      label: 'Not interested in these items',
      icon: 'close-circle-outline',
      color: '#F44336'
    },
    { 
      id: 'need_more_cash', 
      label: 'Need more cash to balance the deal',
      icon: 'cash-outline',
      color: '#FF9800',
      suggestion: `Consider asking for $${Math.ceil(offerAmount * 0.2)} more`
    },
    { 
      id: 'wrong_condition', 
      label: 'Item condition not as described',
      icon: 'warning-outline',
      color: '#FF5722'
    },
    { 
      id: 'changed_mind', 
      label: 'Changed my mind about trading',
      icon: 'refresh-outline',
      color: '#9C27B0'
    },
    { 
      id: 'safety_concern', 
      label: 'Safety or trust concern',
      icon: 'shield-outline',
      color: '#E91E63'
    }
  ];

  const handleSubmit = () => {
    if (!selectedReason) {
      Alert.alert('Please select a reason', 'This helps the other person understand your decision');
      return;
    }
    
    const reason = reasons.find(r => r.id === selectedReason);
    onSubmit(selectedReason, reason.label);
    setSelectedReason(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.declineModal}>
          <View style={styles.declineHeader}>
            <Ionicons name="help-circle" size={24} color="#FF6B6B" />
            <Text style={styles.declineTitle}>Why are you declining?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.declineSubtitle}>
            This helps them understand and potentially make a better offer
          </Text>

          <ScrollView 
            style={styles.reasonsScrollView}
            contentContainerStyle={styles.reasonsListContainer}
            showsVerticalScrollIndicator={false}
          >
            {reasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && styles.selectedReason
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={[styles.reasonIcon, { backgroundColor: `${reason.color}20` }]}>
                  <Ionicons name={reason.icon} size={20} color={reason.color} />
                </View>
                <View style={styles.reasonContent}>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                  {reason.suggestion && (
                    <Text style={styles.reasonSuggestion}>{reason.suggestion}</Text>
                  )}
                </View>
                {selectedReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.declineModalActions}>
            <TouchableOpacity style={styles.declineCancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.declineSubmitButton, !selectedReason && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={!selectedReason}
            >
              <Text style={styles.submitText}>Send Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Main Counter Offer Card Component
const CounterOfferCard = ({ 
  offer, 
  currentUserId, 
  onAction,
  counterOfferCount = 0,
  maxCounterOffers = 4 
}) => {
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  // Defensive check for offer being undefined
  if (!offer) {
    console.error('❌ CounterOfferCard received undefined offer!');
    return null;
  }
  
  // Defensive check for missing targetUserId - do this FIRST
  const targetUserId = offer.targetUserId || offer.sellerId || offer.buyerId;
  
  const isOfferMaker = offer.senderId === currentUserId;
  const isOfferReceiver = targetUserId === currentUserId;
  
  // Calculate total value of offered items
  const calculateOfferedItemsValue = (offer) => {
    const items = offer.offeredItems || offer.newTerms?.offeredItems || [];
    return items.reduce((sum, item) => sum + (item.estimatedValue || item.price || 0), 0);
  };
  
  // Determine user role for negotiation logic
  // SIMPLE RULE: 
  // - For trade_proposal: senderId = BUYER, targetUserId = SELLER
  // - For counter_offer: We need to figure out who the original buyer was
  //
  // The BUYER is the person who wants the item (initiated first contact)
  // The SELLER is the person who owns the item being requested
  
  let userRole;
  
  if (offer.messageType === 'trade_proposal') {
    // Initial proposal: sender is buyer, receiver is seller
    // CRITICAL: Check if current user is the SENDER (buyer) or RECEIVER (seller)
    if (currentUserId === offer.senderId) {
      userRole = 'buyer';  // Current user sent the offer = buyer
    } else if (currentUserId === targetUserId) {
      userRole = 'seller'; // Current user received the offer = seller
    } else {
      console.error('❌ Current user is neither sender nor target!');
      console.log('🔍 Offer debugging:', {
        senderId: offer.senderId,
        targetUserId: targetUserId,
        sellerId: offer.sellerId,
        buyerId: offer.buyerId,
        currentUserId
      });
      userRole = 'buyer'; // Fallback
    }
  } else if (offer.messageType === 'counter_offer') {
    // For counter-offers, check if originalBuyerId is stored
    if (offer.originalBuyerId) {
      userRole = currentUserId === offer.originalBuyerId ? 'buyer' : 'seller';
    } else if (offer.buyerId) {
      userRole = currentUserId === offer.buyerId ? 'buyer' : 'seller';
    } else {
      // Fallback: Need to determine from the original trade_proposal
      // The person who sent the FIRST trade_proposal is the buyer
      // For now, we'll need to track this better
      console.warn('⚠️ No buyer ID found in counter-offer, cannot determine role reliably');
      
      // Best guess: if this is the first counter-offer, the receiver of the 
      // trade_proposal (seller) is likely the one countering
      // So if current user is sender of this counter, they're likely the seller
      userRole = isOfferMaker ? 'seller' : 'buyer';
    }
  } else {
    // Unknown type, default based on sender
    userRole = isOfferMaker ? 'buyer' : 'seller';
  }
  
  console.log('🎯 Role Detection:', {
    messageType: offer.messageType,
    currentUserId,
    userRole,
    isOfferMaker,
    isOfferReceiver,
    senderId: offer.senderId,
    targetUserId: targetUserId,
    originalBuyerId: offer.originalBuyerId,
    buyerId: offer.buyerId,
    logic: offer.messageType === 'trade_proposal' 
      ? `trade_proposal: ${currentUserId === offer.senderId ? 'current=sender=BUYER' : 'current=target=SELLER'}`
      : 'counter_offer: checking stored IDs'
  });
  
  // Determine card type and state
  const getCardState = () => {
    if (offer.messageType === 'trade_proposal') {
      if (isOfferReceiver && (!offer.status || offer.status === 'pending' || offer.status === 'active')) {
        return 'initial_offer_received';
      } else if (isOfferMaker && (!offer.status || offer.status === 'pending' || offer.status === 'active')) {
        return 'initial_offer_sent';
      }
    } else if (offer.messageType === 'counter_offer') {
      if (isOfferReceiver && (!offer.status || offer.status === 'pending' || offer.status === 'active')) {
        return 'counter_offer_received';
      } else if (isOfferMaker && (!offer.status || offer.status === 'pending' || offer.status === 'active')) {
        return 'counter_offer_sent';
      }
    }
    return 'unknown';
  };

  const cardState = getCardState();
  const canCounter = counterOfferCount < maxCounterOffers;
  const roundsRemaining = maxCounterOffers - counterOfferCount;

  // Get card styling based on state
  const getCardStyle = () => {
    // Check user role first for fallback cases
    if (offer.senderId === currentUserId) {
      // User is the sender - show "sent" style
      return { backgroundColor: '#FF9800', icon: 'paper-plane-outline' };
    } else if (targetUserId === currentUserId) {
      // User is the receiver - show "received" style
      return { backgroundColor: '#2196F3', icon: 'cash-outline' };
    }
    
    // Use specific card state styling
    switch (cardState) {
      case 'initial_offer_received':
        return { backgroundColor: '#2196F3', icon: 'cash-outline' };
      case 'initial_offer_sent':
        return { backgroundColor: '#FF9800', icon: 'paper-plane-outline' };
      case 'counter_offer_received':
        return { backgroundColor: '#FF6B6B', icon: 'swap-horizontal' };
      case 'counter_offer_sent':
        return { backgroundColor: '#9C27B0', icon: 'time-outline' };
      default:
        return { backgroundColor: '#666', icon: 'help-outline' };
    }
  };

  const cardStyle = getCardStyle();
  const offerAmount = offer.newTerms?.cashAmount || offer.cashAmount || 0;

  // Get appropriate title and message
  const getCardContent = () => {
    switch (cardState) {
      case 'initial_offer_received':
        return {
          title: 'Cash Offer Received',
          subtitle: `They offered $${offerAmount} for your item`,
          actions: ['accept', 'decline', 'counter']
        };
      case 'initial_offer_sent':
        return {
          title: 'Your Offer Sent',
          subtitle: `You offered $${offerAmount} for this item - waiting for their response`,
          actions: [] // No actions for sender
        };
      case 'counter_offer_received':
        return {
          title: 'Counter-Offer Received',
          subtitle: `They want $${offerAmount} instead`,
          actions: ['accept', 'decline', canCounter ? 'counter' : null].filter(Boolean)
        };
      case 'counter_offer_sent':
        return {
          title: 'Your Counter-Offer Sent',
          subtitle: `You countered with $${offerAmount} - waiting for their response`,
          actions: [] // No actions for sender
        };
      default:
        // For debugging - show who should see what
        if (offer.senderId === currentUserId) {
          return {
            title: 'Your Offer Sent',
            subtitle: `You offered $${offerAmount} for this item - waiting for their response`,
            actions: [] // Sender sees no buttons
          };
        } else if (targetUserId === currentUserId) {
          return {
            title: 'Offer Received',
            subtitle: `They offered $${offerAmount} for your item`,
            actions: ['accept', 'decline', 'counter'] // Receiver sees buttons
          };
        } else {
          return {
            title: 'Trade Proposal',
            subtitle: `$${offerAmount} offer for this item`,
            actions: [] // No actions for debug
          };
        }
    }
  };

  const content = getCardContent();

  const handleCounterOfferSubmit = (counterAmount) => {
    console.log('🎯 Counter-offer amount selected:', counterAmount);
    console.log('🎯 Calling onAction with make_counter_offer:', { ...offer, counterAmount, counterOfferCount });
    onAction('make_counter_offer', { ...offer, counterAmount, counterOfferCount });
  };

  const handleDeclineWithReason = (reasonId, reasonText) => {
    onAction('decline_offer', { ...offer, declineReason: reasonId, declineReasonText: reasonText });
  };

  const handleAction = (action) => {
    console.log('🎯 CounterOfferCard handleAction called:', action);
    
    switch (action) {
      case 'accept':
        Alert.alert(
          'Accept Offer',
          `Accept $${offerAmount} for this trade?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Accept Deal', onPress: () => onAction('accept_offer', offer) }
          ]
        );
        break;
      case 'decline':
        setShowDeclineModal(true);
        break;
      case 'counter':
        console.log('🎯 Counter button pressed, canCounter:', canCounter);
        if (!canCounter) {
          Alert.alert(
            'Counter-Offer Limit Reached',
            `Maximum of ${maxCounterOffers} counter-offers allowed. Please accept or decline.`
          );
          return;
        }
        setShowCounterModal(true);
        break;
    }
  };

  // Add comprehensive error boundary around the render
  try {
    return (
      <>
        <LiwaCounterOfferModal
          visible={showCounterModal}
          onClose={() => setShowCounterModal(false)}
          onSubmit={handleCounterOfferSubmit}
          currentAmount={offerAmount}
          itemTitle={offer.itemTitle}
          itemPrice={offer.itemPrice || 0}
          counterOfferCount={counterOfferCount}
          maxCounterOffers={maxCounterOffers}
          userRole={userRole}
          originalOffer={offer}
          offeredItems={offer.offeredItems || offer.newTerms?.offeredItems || []}
          offeredItemsValue={calculateOfferedItemsValue(offer)}
        />
        
        <DeclineReasonModal
          visible={showDeclineModal}
          onClose={() => setShowDeclineModal(false)}
          onSubmit={handleDeclineWithReason}
          offerAmount={offerAmount}
        />
        
        <View style={styles.card}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: cardStyle.backgroundColor }]}>
            <View style={styles.titleRow}>
              <View style={styles.iconContainer}>
                <Ionicons name={cardStyle.icon} size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>{content.title}</Text>
              <View style={styles.amountBadge}>
                <Text style={styles.amountText}>${offerAmount}</Text>
              </View>
            </View>
            
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            
            {/* Item context */}
            {offer.itemTitle && (
              <View style={styles.itemContext}>
                <Ionicons name="cube-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.itemTitle}>for "{offer.itemTitle}"</Text>
              </View>
            )}
            
            {/* Counter-offer tracking */}
            {counterOfferCount > 0 && (
              <View style={styles.counterTracker}>
                <Ionicons name="repeat-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.counterText}>
                  Round {counterOfferCount + 1} of {maxCounterOffers} 
                  {roundsRemaining > 0 && ` (${roundsRemaining} left)`}
                </Text>
              </View>
            )}
          </View>

        {/* Actions */}
        {content.actions.length > 0 && (
          <View style={styles.actions}>
            <Text style={styles.actionLabel}>Choose your response:</Text>
            
            <View style={styles.buttonRow}>
              {content.actions.includes('decline') && (
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  onPress={() => handleAction('decline')}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIconContainer}>
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonText}>Decline</Text>
                      <Text style={styles.buttonSubtext}>Not interested</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              
              {content.actions.includes('counter') && (
                <TouchableOpacity
                  style={[styles.button, styles.counterButton, !canCounter && styles.disabledButton]}
                  onPress={() => handleAction('counter')}
                  disabled={!canCounter}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIconContainer}>
                      <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonText}>Counter</Text>
                      <Text style={styles.buttonSubtext}>
                        {canCounter ? `${roundsRemaining} left` : 'Max reached'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              
              {content.actions.includes('accept') && (
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={() => handleAction('accept')}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIconContainer}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonText}>Accept</Text>
                      <Text style={styles.buttonSubtext}>Make deal</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {content.actions.length > 0 ? (
            <>
              <Ionicons name="time-outline" size={14} color="#999" />
              <Text style={styles.footerText}>
                {canCounter 
                  ? 'Quick responses keep negotiations moving smoothly'
                  : 'Final round - time to make your decision'
                }
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="hourglass-outline" size={14} color="#999" />
              <Text style={styles.footerText}>Your offer is with them - they'll respond soon</Text>
            </>
          )}
        </View>
      </View>
    </>
    );
  } catch (error) {
    console.error('❌ CounterOfferCard render error:', error);
    console.error('❌ Offer data:', offer);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading trade offer</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  amountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  itemContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  itemTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  counterTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  counterText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  actions: {
    padding: 20,
  },
  actionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    minHeight: 80,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  buttonTextContainer: {
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  buttonSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  counterButton: {
    backgroundColor: '#FF9800',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
    flex: 1,
  },
  // Decline Modal Styles
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  declineModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '75%',
    flexDirection: 'column',
  },
  declineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  declineTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineSubtitle: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reasonsScrollView: {
    flex: 1,
  },
  reasonsListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedReason: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reasonSuggestion: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  declineModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  declineCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  declineSubmitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#856404',
  },
});

export default CounterOfferCard;
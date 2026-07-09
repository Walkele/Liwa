import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CounterOfferCard from './CounterOfferCard';
import CounterOfferTrackingService from '../services/CounterOfferTrackingService';
import TurnStatusIndicator from './TurnStatusIndicator';
import EnhancedTradeProgressionCard from './EnhancedTradeProgressionCard';

const LiwaNextStepCard = ({ 
  messages, 
  currentUserId, 
  onAction,
  targetItem, // Add targetItem prop
  myItem // Add myItem prop
}) => {
  const [counterOfferStats, setCounterOfferStats] = useState(null);

  // Get conversation ID from messages
  const conversationId = messages.length > 0 ? messages[0].conversationId : null;

  // Load counter-offer statistics
  useEffect(() => {
    if (conversationId) {
      CounterOfferTrackingService.getCounterOfferStats(conversationId)
        .then(setCounterOfferStats)
        .catch(console.error);
    }
  }, [conversationId, messages]);

  // Early return if no messages loaded yet
  if (!messages || messages.length === 0) {
    console.log('🎯 LiwaNextStepCard: No messages loaded yet');
    return null;
  }

  // Find any pending offers (trade proposals or counter-offers)
  const pendingOffers = messages.filter(msg => {
    const isTradeMessage = msg.messageType === 'trade_proposal' || msg.messageType === 'counter_offer';
    const isActive = !msg.status || msg.status === 'pending' || msg.status === 'active';
    const buttonsNotHidden = !msg.buttonsHidden;
    const isRelevantToUser = msg.senderId === currentUserId || msg.targetUserId === currentUserId;
    
    // Enhanced debug logging
    if (isTradeMessage) {
      console.log('🔍 Trade message found:', {
        messageType: msg.messageType,
        senderId: msg.senderId,
        targetUserId: msg.targetUserId,
        currentUserId,
        status: msg.status,
        buttonsHidden: msg.buttonsHidden,
        isActive,
        buttonsNotHidden,
        isRelevantToUser,
        cashAmount: msg.cashAmount || msg.newTerms?.cashAmount,
        text: msg.text?.substring(0, 50),
        id: msg.id
      });
    }
    
    return isTradeMessage && isActive && buttonsNotHidden && isRelevantToUser;
  });

  // Sort by creation date to get the most recent
  const currentOffer = pendingOffers.sort((a, b) => 
    new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt)
  )[0];

  console.log('🎯 LiwaNextStepCard state:', {
    totalMessages: messages.length,
    pendingOffersCount: pendingOffers.length,
    currentOffer: currentOffer ? {
      messageType: currentOffer.messageType,
      senderId: currentOffer.senderId,
      targetUserId: currentOffer.targetUserId,
      cashAmount: currentOffer.cashAmount || currentOffer.newTerms?.cashAmount,
      status: currentOffer.status
    } : null,
    currentUserId
  });

  // If no pending offers found, try to find any recent trade proposal
  let fallbackOffer = null;
  if (!currentOffer) {
    const recentTradeMessages = messages.filter(msg => 
      msg.messageType === 'trade_proposal' || msg.messageType === 'counter_offer'
    ).sort((a, b) => 
      new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt)
    );
    
    fallbackOffer = recentTradeMessages[0];
  }

  const offerToShow = currentOffer || fallbackOffer;

  // Check for accepted trade to show progression steps
  const acceptedTrade = messages.find(msg => 
    (msg.messageType === 'counter_offer' || msg.messageType === 'trade_proposal') && 
    msg.status === 'accepted'
  );

  // Enhanced debug logging
  console.log('🎯 LiwaNextStepCard debug:', {
    totalMessages: messages.length,
    pendingOffersCount: pendingOffers.length,
    hasAcceptedTrade: !!acceptedTrade,
    acceptedTradeInfo: acceptedTrade ? {
      messageType: acceptedTrade.messageType,
      status: acceptedTrade.status,
      cashAmount: acceptedTrade.cashAmount || acceptedTrade.newTerms?.cashAmount,
      id: acceptedTrade.id
    } : null,
    offerToShow: offerToShow ? {
      messageType: offerToShow.messageType,
      status: offerToShow.status,
      cashAmount: offerToShow.cashAmount || offerToShow.newTerms?.cashAmount
    } : null,
    allAcceptedMessages: messages.filter(msg => msg.status === 'accepted').map(msg => ({
      messageType: msg.messageType,
      status: msg.status,
      id: msg.id,
      cashAmount: msg.cashAmount || msg.newTerms?.cashAmount
    }))
  });

  // Priority 1: Show accepted trade progression if available
  if (acceptedTrade) {
    console.log('🚀 Showing EnhancedTradeProgressionCard for accepted trade:', acceptedTrade.id);
    return (
      <EnhancedTradeProgressionCard
        acceptedTrade={acceptedTrade}
        currentUserId={currentUserId}
        messages={messages}
        onAction={onAction}
      />
    );
  }

  // Priority 2: Show pending offers if no accepted trade
  if (offerToShow) {
    console.log('🎯 Showing CounterOfferCard for pending offer:', offerToShow.id);
    console.log('🔍 Offer data:', {
      id: offerToShow.id,
      messageType: offerToShow.messageType,
      senderId: offerToShow.senderId,
      targetUserId: offerToShow.targetUserId,
      hasTargetUserId: !!offerToShow.targetUserId,
      hasBuyerId: !!offerToShow.buyerId,
      hasSellerId: !!offerToShow.sellerId
    });
    
    // Defensive check - if offer is missing required fields, don't show the card
    if (!offerToShow.targetUserId && !offerToShow.buyerId) {
      console.warn('⚠️ Offer missing targetUserId and buyerId, skipping CounterOfferCard');
      return null;
    }
    
    return (
      <View>
        <TurnStatusIndicator
          currentUserId={currentUserId}
          offer={offerToShow}
        />
        <CounterOfferCard
          offer={offerToShow}
          currentUserId={currentUserId}
          onAction={onAction}
        />
      </View>
    );
  }

  // Priority 3: Show start trade negotiation button if no offers exist
  if (pendingOffers.length === 0 && messages.length > 0) {
    const otherUserId = messages[0].senderId === currentUserId ? messages[0].targetUserId : messages[0].senderId;
    
    // Use targetItem from props if available (from match), otherwise try to find in messages
    let itemData;
    
    console.log('🎯 targetItem prop:', targetItem);
    console.log('🎯 myItem prop:', myItem);
    
    if (targetItem && targetItem.id && targetItem.id !== 'unknown') {
      // Use the targetItem from the match
      itemData = {
        itemId: targetItem.id,
        itemTitle: targetItem.title,
        estimatedValue: targetItem.price || targetItem.estimatedValue || 0,
        hasMyItem: !!myItem, // Indicate if we have the user's matched item
        myItemId: myItem?.id,
        myItemTitle: myItem?.title,
        myItemValue: myItem?.price || myItem?.estimatedValue || 0
      };
      console.log('🎯 Using targetItem from match:', itemData);
    } else {
      // Try to find item data from messages - check for swipe match messages
      const swipeMessage = messages.find(msg => 
        msg.messageType === 'swipe_right' || 
        msg.messageType === 'match' ||
        msg.itemTitle ||
        msg.itemId
      );
      
      // Also check for match_notification messages with itemComparison
      const matchMessage = messages.find(msg => 
        msg.messageType === 'match_notification' && msg.itemComparison
      );
      
      // Create fallback item data if none found
      itemData = {
        itemId: swipeMessage?.itemId || swipeMessage?.item?.id || matchMessage?.itemComparison?.item2?.id || 'unknown',
        itemTitle: swipeMessage?.itemTitle || swipeMessage?.item?.title || swipeMessage?.text || matchMessage?.itemComparison?.item2?.title || 'Item',
        estimatedValue: swipeMessage?.price || swipeMessage?.item?.price || swipeMessage?.item?.estimatedValue || matchMessage?.itemComparison?.item2?.price || 0
      };
      console.log('🎯 Trade negotiation data from messages:', itemData);
    }
    
    return (
      <View style={styles.startTradeCard}>
        <View style={styles.startTradeHeader}>
          <Ionicons name="swap-horizontal" size={24} color="#FF6B6B" />
          <Text style={styles.startTradeTitle}>Start Trade Negotiation</Text>
        </View>
        <Text style={styles.startTradeDescription}>
          Both parties are interested! Start a secure trade negotiation with Binance-like escrow protection.
        </Text>
        <TouchableOpacity
          style={styles.startTradeButton}
          onPress={() => onAction('start_trade_negotiation', itemData)}
        >
          <Text style={styles.startTradeButtonText}>Start Trade Negotiation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null; // No active trade or counter-offer
};

const styles = StyleSheet.create({
  startTradeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  startTradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  startTradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  startTradeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  startTradeButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startTradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LiwaNextStepCard;
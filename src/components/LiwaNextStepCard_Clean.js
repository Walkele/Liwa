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
  onAction 
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

  // Find any pending offers (trade proposals or counter-offers)
  const pendingOffers = messages.filter(msg => {
    const isTradeMessage = msg.messageType === 'trade_proposal' || msg.messageType === 'counter_offer';
    const isActive = !msg.status || msg.status === 'pending' || msg.status === 'active';
    const buttonsNotHidden = !msg.buttonsHidden;
    const isRelevantToUser = msg.senderId === currentUserId || msg.targetUserId === currentUserId;
    
    // Temporary debug logging for second counter-offer issue
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
        text: msg.text?.substring(0, 50)
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

  // If there's a pending offer, show the CounterOfferCard
  if (offerToShow) {
    return (
      <View>
        <TurnStatusIndicator
          currentUserId={currentUserId}
          offer={offerToShow}
          onNudge={() => {
            // TODO: Implement nudge functionality
            Alert.alert('Nudge Sent', 'Your partner has been notified that you\'re waiting for their response.');
          }}
          canNudge={true}
          lastActivity={offerToShow.createdAt}
        />
        <CounterOfferCard
          offer={offerToShow}
          currentUserId={currentUserId}
          onAction={onAction}
          counterOfferCount={counterOfferStats?.counterOfferCount || 0}
          maxCounterOffers={CounterOfferTrackingService.MAX_COUNTER_OFFERS}
        />
      </View>
    );
  }

  // Check for accepted trade to show progression steps
  const acceptedTrade = messages.find(msg => 
    (msg.messageType === 'counter_offer' || msg.messageType === 'trade_proposal') && 
    msg.status === 'accepted'
  );

  if (acceptedTrade) {
    // Use the enhanced trade progression component
    return (
      <EnhancedTradeProgressionCard
        acceptedTrade={acceptedTrade}
        currentUserId={currentUserId}
        messages={messages}
        onAction={onAction}
      />
    );
  }

  return null; // No active trade or counter-offer
};

const styles = StyleSheet.create({
  // Styles can be added here if needed for any additional UI elements
});

export default LiwaNextStepCard;
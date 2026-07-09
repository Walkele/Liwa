import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';

const { width } = Dimensions.get('window');

const TradeStatusHeader = ({ 
  conversationId, 
  currentUserId, 
  messages, 
  onActionPress,
  onContactShare 
}) => {
  const [tradeStatus, setTradeStatus] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [nextAction, setNextAction] = useState(null);
  const [waitingFor, setWaitingFor] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(80));

  useEffect(() => {
    if (conversationId && currentUserId) {
      analyzeTradeStatus();
    }
  }, [conversationId, currentUserId, messages]);

  const analyzeTradeStatus = async () => {
    try {
      // Check if there's an accepted counter-offer or trade proposal
      const acceptedCounterOffer = messages.find(msg => 
        msg.messageType === 'counter_offer' && msg.status === 'accepted'
      );
      
      const acceptedTradeProposal = messages.find(msg => 
        msg.messageType === 'trade_proposal' && msg.status === 'accepted'
      );

      const pendingCounterOffer = messages.find(msg => 
        msg.messageType === 'counter_offer' && 
        msg.targetUserId === currentUserId &&
        (!msg.status || msg.status === 'pending' || msg.status === 'active')
      );

      if (pendingCounterOffer) {
        setTradeStatus({
          phase: 'counter_offer_pending',
          title: 'Counter-Offer Received',
          icon: '💰',
          color: '#FF9800',
          amount: pendingCounterOffer.newTerms?.cashAmount || pendingCounterOffer.cashAmount || 0
        });
        setNextAction({
          text: 'Accept or Decline',
          action: 'respond_counter_offer',
          urgent: true
        });
        setWaitingFor(null);
        return;
      }

      if (acceptedCounterOffer || acceptedTradeProposal) {
        // Trade is in progress - check bilateral confirmation steps
        const steps = [
          BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT,
          BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE,
          BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED,
          BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED,
          BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED
        ];

        for (const step of steps) {
          const status = await BilateralTradeConfirmationService.getStepConfirmationStatus(
            conversationId, 
            step, 
            currentUserId
          );

          if (!status.bothConfirmed) {
            setCurrentStep(step);
            
            if (status.userNeedsAction) {
              setTradeStatus({
                phase: 'action_required',
                title: getStepDisplayName(step),
                icon: getStepIcon(step),
                color: '#FF6B6B'
              });
              setNextAction({
                text: getStepActionText(step),
                action: step,
                urgent: true
              });
              setWaitingFor(null);
            } else if (status.userAConfirmed || status.userBConfirmed) {
              setTradeStatus({
                phase: 'waiting',
                title: getStepDisplayName(step),
                icon: '⏳',
                color: '#2196F3'
              });
              setNextAction(null);
              setWaitingFor('Other party to confirm');
            } else {
              setTradeStatus({
                phase: 'ready',
                title: getStepDisplayName(step),
                icon: getStepIcon(step),
                color: '#4CAF50'
              });
              setNextAction({
                text: getStepActionText(step),
                action: step,
                urgent: false
              });
              setWaitingFor(null);
            }
            return;
          }
        }

        // All steps completed
        setTradeStatus({
          phase: 'completed',
          title: 'Trade Completed',
          icon: '🎉',
          color: '#4CAF50'
        });
        setNextAction(null);
        setWaitingFor(null);
      } else {
        // No active trade
        setTradeStatus(null);
        setNextAction(null);
        setWaitingFor(null);
      }
    } catch (error) {
      console.error('Error analyzing trade status:', error);
    }
  };

  const getStepDisplayName = (step) => {
    switch (step) {
      case BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT:
        return 'Commit to Trade';
      case BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE:
        return 'Share Contact Info';
      case BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED:
        return 'Arrange Meeting';
      case BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED:
        return 'Start Exchange';
      case BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED:
        return 'Complete Trade';
      default:
        return 'Trade Step';
    }
  };

  const getStepIcon = (step) => {
    switch (step) {
      case BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT:
        return '🤝';
      case BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE:
        return '📞';
      case BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED:
        return '📍';
      case BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED:
        return '🔄';
      case BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED:
        return '✅';
      default:
        return '📋';
    }
  };

  const getStepActionText = (step) => {
    switch (step) {
      case BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT:
        return 'Commit Now';
      case BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE:
        return 'Share Contact';
      case BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED:
        return 'Confirm Meeting';
      case BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED:
        return 'Start Exchange';
      case BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED:
        return 'Mark Complete';
      default:
        return 'Take Action';
    }
  };

  const handleActionPress = () => {
    if (nextAction) {
      if (nextAction.action === 'respond_counter_offer') {
        // Scroll to counter-offer buttons or show modal
        onActionPress?.('show_counter_offer_buttons');
      } else if (nextAction.action === BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE) {
        onContactShare?.();
      } else {
        onActionPress?.(nextAction.action);
      }
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 80 : 140,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  if (!tradeStatus) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { height: animatedHeight }]}>
      <View style={[styles.header, { backgroundColor: tradeStatus.color }]}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusIcon}>{tradeStatus.icon}</Text>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>{tradeStatus.title}</Text>
            {tradeStatus.amount > 0 && (
              <Text style={styles.statusAmount}>${tradeStatus.amount}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.expandButton}
          onPress={toggleExpanded}
        >
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.actionRow}>
            {nextAction ? (
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  { backgroundColor: nextAction.urgent ? '#FF6B6B' : '#4CAF50' }
                ]}
                onPress={handleActionPress}
              >
                <Ionicons 
                  name={nextAction.urgent ? "alert-circle" : "play-circle"} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.actionButtonText}>{nextAction.text}</Text>
              </TouchableOpacity>
            ) : waitingFor ? (
              <View style={styles.waitingContainer}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.waitingText}>Waiting for: {waitingFor}</Text>
              </View>
            ) : (
              <View style={styles.completedContainer}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.completedText}>All done!</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    height: 80,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statusAmount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  expandButton: {
    padding: 8,
  },
  expandedContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
  },
  waitingText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 6,
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 20,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default TradeStatusHeader;
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';

const UltimateTradeCard = ({ 
  conversationId, 
  currentUserId, 
  messages, 
  onAction,
  loading = false 
}) => {
  const [tradeState, setTradeState] = useState(null);
  const [actionTaken, setActionTaken] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  useEffect(() => {
    analyzeTradeState();
  }, [messages, currentUserId]);

  const analyzeTradeState = async () => {
    try {
      // Find pending counter-offer
      const pendingCounterOffer = messages.find(msg => 
        msg.messageType === 'counter_offer' && 
        msg.targetUserId === currentUserId &&
        (!msg.status || msg.status === 'pending' || msg.status === 'active') &&
        !msg.buttonsHidden
      );

      if (pendingCounterOffer) {
        const originalOffer = messages.find(msg => 
          msg.messageType === 'trade_proposal' || 
          (msg.messageType === 'counter_offer' && msg.id !== pendingCounterOffer.id)
        );

        setTradeState({
          type: 'counter_offer_pending',
          title: 'Counter-Offer Received',
          reason: `They want $${pendingCounterOffer.newTerms?.cashAmount || pendingCounterOffer.cashAmount || 0} instead of $${originalOffer?.cashAmount || originalOffer?.newTerms?.cashAmount || 'original amount'}`,
          amount: pendingCounterOffer.newTerms?.cashAmount || pendingCounterOffer.cashAmount || 0,
          originalAmount: originalOffer?.cashAmount || originalOffer?.newTerms?.cashAmount || 0,
          message: pendingCounterOffer,
          nextStep: 'Your response will determine if the trade proceeds',
          waitingFor: null,
          urgent: true
        });
        
        // Animate in with proper height for buttons
        Animated.timing(animatedHeight, {
          toValue: 220, // Much larger height to ensure buttons are visible
          duration: 300,
          useNativeDriver: false,
        }).start();
        return;
      }

      // Check for accepted trades and their progression
      const acceptedTrade = messages.find(msg => 
        (msg.messageType === 'counter_offer' || msg.messageType === 'trade_proposal') && 
        msg.status === 'accepted'
      );

      if (acceptedTrade) {
        // Check bilateral confirmation steps
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
            const stepInfo = getStepInfo(step);
            
            if (status.userNeedsAction) {
              setTradeState({
                type: 'action_required',
                title: stepInfo.title,
                reason: stepInfo.reason,
                amount: acceptedTrade.newTerms?.cashAmount || acceptedTrade.cashAmount || 0,
                nextStep: stepInfo.action,
                waitingFor: null,
                urgent: true,
                step: step
              });
            } else if (status.userAConfirmed || status.userBConfirmed) {
              setTradeState({
                type: 'waiting',
                title: stepInfo.title,
                reason: 'You have confirmed this step',
                amount: acceptedTrade.newTerms?.cashAmount || acceptedTrade.cashAmount || 0,
                nextStep: stepInfo.nextAfterWait,
                waitingFor: 'Other party to confirm',
                urgent: false,
                step: step
              });
            } else {
              setTradeState({
                type: 'ready',
                title: stepInfo.title,
                reason: stepInfo.reason,
                amount: acceptedTrade.newTerms?.cashAmount || acceptedTrade.cashAmount || 0,
                nextStep: stepInfo.action,
                waitingFor: null,
                urgent: false,
                step: step
              });
            }
            
            Animated.timing(animatedHeight, {
              toValue: 160, // Consistent height for action required
              duration: 300,
              useNativeDriver: false,
            }).start();
            return;
          }
        }

        // All steps completed
        setTradeState({
          type: 'completed',
          title: 'Trade Completed Successfully!',
          reason: 'All steps have been completed by both parties',
          amount: acceptedTrade.newTerms?.cashAmount || acceptedTrade.cashAmount || 0,
          nextStep: 'Items have been archived. Check your trade history.',
          waitingFor: null,
          urgent: false
        });
        
        Animated.timing(animatedHeight, {
          toValue: 140, // Consistent height for waiting state
          duration: 300,
          useNativeDriver: false,
        }).start();
      } else {
        // No active trade
        setTradeState(null);
        Animated.timing(animatedHeight, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error('Error analyzing trade state:', error);
    }
  };

  const getStepInfo = (step) => {
    switch (step) {
      case BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT:
        return {
          title: 'Commitment Required',
          reason: 'Both parties must commit to proceed with the trade',
          action: 'Tap to commit to this trade',
          nextAfterWait: 'Contact exchange will unlock once both commit'
        };
      case BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE:
        return {
          title: 'Share Contact Information',
          reason: 'Exchange contact details to arrange the meeting',
          action: 'Share your phone number or email',
          nextAfterWait: 'Meeting arrangement will unlock after contact exchange'
        };
      case BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED:
        return {
          title: 'Arrange Meeting Location',
          reason: 'Confirm time and place for the exchange',
          action: 'Confirm meeting details',
          nextAfterWait: 'Exchange can start once meeting is arranged'
        };
      case BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED:
        return {
          title: 'Start Physical Exchange',
          reason: 'Confirm you have met and started the exchange',
          action: 'Confirm exchange has started',
          nextAfterWait: 'Final completion step will unlock'
        };
      case BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED:
        return {
          title: 'Complete Trade',
          reason: 'Confirm the exchange was successful',
          action: 'Mark trade as completed',
          nextAfterWait: 'Trade will be finalized'
        };
      default:
        return {
          title: 'Trade Step',
          reason: 'Complete this step to continue',
          action: 'Take action',
          nextAfterWait: 'Next step will unlock'
        };
    }
  };

  const handleAction = async (actionType) => {
    if (loading || actionTaken) return;

    try {
      setActionTaken(true);
      
      if (actionType === 'accept_counter_offer') {
        Alert.alert(
          'Accept Counter-Offer',
          `Accept $${tradeState.amount} instead of $${tradeState.originalAmount}?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setActionTaken(false) },
            { 
              text: 'Accept', 
              onPress: async () => {
                await onAction?.(actionType, tradeState.message);
                // Hide the card after successful action
                setTimeout(() => {
                  Animated.timing(animatedHeight, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                  }).start(() => setTradeState(null));
                }, 1000);
              }
            }
          ]
        );
      } else if (actionType === 'decline_counter_offer') {
        Alert.alert(
          'Decline Counter-Offer',
          `Decline the counter-offer of $${tradeState.amount}?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setActionTaken(false) },
            { 
              text: 'Decline', 
              style: 'destructive',
              onPress: async () => {
                await onAction?.(actionType, tradeState.message);
                setTimeout(() => {
                  Animated.timing(animatedHeight, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                  }).start(() => setTradeState(null));
                }, 1000);
              }
            }
          ]
        );
      } else {
        // Handle trade step actions
        await onAction?.(actionType, tradeState);
      }
    } catch (error) {
      console.error('Action failed:', error);
      setActionTaken(false);
      Alert.alert('Error', 'Action failed. Please try again.');
    }
  };

  if (!tradeState) {
    return null;
  }

  const getCardColor = () => {
    switch (tradeState.type) {
      case 'counter_offer_pending':
        return '#FFF3E0'; // Orange tint
      case 'action_required':
        return '#FFEBEE'; // Red tint
      case 'waiting':
        return '#E3F2FD'; // Blue tint
      case 'ready':
        return '#E8F5E8'; // Green tint
      case 'completed':
        return '#F3E5F5'; // Purple tint
      default:
        return '#F5F5F5';
    }
  };

  const getIconName = () => {
    switch (tradeState.type) {
      case 'counter_offer_pending':
        return 'cash';
      case 'action_required':
        return 'alert-circle';
      case 'waiting':
        return 'time';
      case 'ready':
        return 'checkmark-circle';
      case 'completed':
        return 'trophy';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (tradeState.type) {
      case 'counter_offer_pending':
        return '#FF9800';
      case 'action_required':
        return '#F44336';
      case 'waiting':
        return '#2196F3';
      case 'ready':
        return '#4CAF50';
      case 'completed':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  if (!tradeState) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: getCardColor() }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name={getIconName()} size={20} color={getIconColor()} />
            <Text style={styles.title}>{tradeState.title}</Text>
            {tradeState.amount > 0 && (
              <Text style={styles.amount}>${tradeState.amount}</Text>
            )}
          </View>
          
          {/* Reason */}
          <Text style={styles.reason}>{tradeState.reason}</Text>
        </View>

        {/* Status Info */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Next Step:</Text>
            <Text style={styles.statusValue}>{tradeState.nextStep}</Text>
          </View>
          
          {tradeState.waitingFor && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Waiting For:</Text>
              <Text style={styles.statusValue}>{tradeState.waitingFor}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {tradeState.type === 'counter_offer_pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleAction('decline_counter_offer')}
              disabled={loading || actionTaken}
            >
              <Ionicons name="close-circle" size={16} color="white" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAction('accept_counter_offer')}
              disabled={loading || actionTaken}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.buttonText}>Accept ${tradeState.amount}</Text>
            </TouchableOpacity>
          </View>
        )}

        {tradeState.type === 'action_required' && (
          <TouchableOpacity
            style={[styles.singleActionButton, { backgroundColor: getIconColor() }]}
            onPress={() => handleAction(tradeState.step)}
            disabled={loading || actionTaken}
          >
            <Ionicons name="flash" size={16} color="white" />
            <Text style={styles.buttonText}>{tradeState.nextStep}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Remove overflow hidden to prevent button clipping
  },
  animatedCard: {
    overflow: 'hidden',
  },
  card: {
    margin: 15,
    borderRadius: 12,
    padding: 16,
    paddingBottom: 30, // Much more bottom padding for buttons
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  reason: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusItem: {
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16, // More top margin for better spacing
    marginBottom: 8, // Add bottom margin too
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Increased padding
    paddingHorizontal: 8,
    borderRadius: 8,
    elevation: 1,
    minHeight: 44, // Ensure minimum touch target
  },
  singleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 1,
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default UltimateTradeCard;
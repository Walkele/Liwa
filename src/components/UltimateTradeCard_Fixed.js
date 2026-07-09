import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
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
        return;
      }

      // No active counter-offer, hide the card
      setTradeState(null);
    } catch (error) {
      console.error('Error analyzing trade state:', error);
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
                  setTradeState(null);
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
                  setTradeState(null);
                }, 1000);
              }
            }
          ]
        );
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="cash" size={20} color="#FF9800" />
            <Text style={styles.title}>{tradeState.title}</Text>
            <Text style={styles.amount}>${tradeState.amount}</Text>
          </View>
          
          {/* Reason */}
          <Text style={styles.reason}>{tradeState.reason}</Text>
        </View>

        {/* Status Info */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Next Step:</Text>
          <Text style={styles.statusValue}>{tradeState.nextStep}</Text>
        </View>

        {/* Action Buttons */}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No height restrictions - let content determine size
  },
  card: {
    margin: 15,
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#FFF3E0', // Orange tint
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    lineHeight: 20,
  },
  statusRow: {
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 13,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    minHeight: 48, // Ensure good touch target
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
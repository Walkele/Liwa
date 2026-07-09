import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CleanTradeInterface = ({ 
  conversationId, 
  currentUserId, 
  messages, 
  onAction,
  loading = false 
}) => {
  const [currentAction, setCurrentAction] = useState(null);
  const [actionTaken, setActionTaken] = useState(false);
  const [animatedOpacity] = useState(new Animated.Value(1));

  useEffect(() => {
    analyzeCurrentState();
  }, [messages, currentUserId]);

  const analyzeCurrentState = () => {
    // Find the most recent actionable item
    const pendingCounterOffer = messages.find(msg => 
      msg.messageType === 'counter_offer' && 
      msg.targetUserId === currentUserId &&
      (!msg.status || msg.status === 'pending' || msg.status === 'active')
    );

    const acceptedTrade = messages.find(msg => 
      (msg.messageType === 'counter_offer' || msg.messageType === 'trade_proposal') && 
      msg.status === 'accepted'
    );

    if (pendingCounterOffer && !actionTaken) {
      setCurrentAction({
        type: 'counter_offer_response',
        title: 'Counter-Offer Received',
        amount: pendingCounterOffer.newTerms?.cashAmount || pendingCounterOffer.cashAmount || 0,
        message: pendingCounterOffer,
        urgent: true
      });
    } else if (acceptedTrade) {
      // Check what trade step we're on
      setCurrentAction({
        type: 'trade_progression',
        title: 'Trade In Progress',
        subtitle: 'Next: Commit to Trade',
        urgent: false
      });
    } else {
      setCurrentAction(null);
    }
  };

  const handleAction = async (actionType, data = null) => {
    if (loading || actionTaken) return;

    try {
      setActionTaken(true);
      
      // Fade out the interface
      Animated.timing(animatedOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }).start();

      await onAction?.(actionType, data);
      
      // After successful action, hide this interface
      setTimeout(() => {
        setCurrentAction(null);
        setActionTaken(false);
      }, 1000);
      
    } catch (error) {
      console.error('Action failed:', error);
      setActionTaken(false);
      
      // Restore opacity on error
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      Alert.alert('Error', 'Action failed. Please try again.');
    }
  };

  const handleCounterOfferResponse = (action) => {
    const amount = currentAction.amount;
    
    if (action === 'accept') {
      Alert.alert(
        'Accept Counter-Offer',
        `Accept the counter-offer of $${amount}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Accept', 
            onPress: () => handleAction('accept_counter_offer', currentAction.message)
          }
        ]
      );
    } else {
      Alert.alert(
        'Decline Counter-Offer',
        `Decline the counter-offer of $${amount}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Decline', 
            style: 'destructive',
            onPress: () => handleAction('decline_counter_offer', currentAction.message)
          }
        ]
      );
    }
  };

  if (!currentAction) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: animatedOpacity }]}>
      <View style={[
        styles.actionCard,
        { backgroundColor: currentAction.urgent ? '#FFF3E0' : '#E8F5E8' }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons 
              name={currentAction.urgent ? "alert-circle" : "checkmark-circle"} 
              size={20} 
              color={currentAction.urgent ? "#FF9800" : "#4CAF50"} 
            />
            <Text style={styles.title}>{currentAction.title}</Text>
          </View>
          
          {currentAction.amount && (
            <Text style={styles.amount}>${currentAction.amount}</Text>
          )}
        </View>

        {/* Action Buttons */}
        {currentAction.type === 'counter_offer_response' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleCounterOfferResponse('decline')}
              disabled={loading || actionTaken}
            >
              <Ionicons name="close-circle" size={18} color="white" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleCounterOfferResponse('accept')}
              disabled={loading || actionTaken}
            >
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={styles.buttonText}>Accept ${currentAction.amount}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status indicator */}
        {(loading || actionTaken) && (
          <View style={styles.statusContainer}>
            <Ionicons name="hourglass" size={16} color="#666" />
            <Text style={styles.statusText}>Processing...</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  actionCard: {
    margin: 15,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
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
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  declineButton: {
    backgroundColor: '#DC3545',
  },
  acceptButton: {
    backgroundColor: '#28A745',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
});

export default CleanTradeInterface;
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const DynamicTradeButtons = ({ 
  userRole, // 'proposer' or 'receiver'
  tradeState,
  proposalData,
  onAccept,
  onCounter,
  onDecline,
  onWithdraw,
  onBrowseInventory,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action, handler) => {
    if (disabled || loading) return;
    
    setLoading(true);
    try {
      await handler();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Proposer buttons (user who sent the offer)
  const renderProposerButtons = () => {
    if (tradeState === 'proposed') {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.withdrawButton]}
            onPress={() => handleAction('withdraw', onWithdraw)}
            disabled={disabled || loading}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Withdraw Offer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleAction('browse', onBrowseInventory)}
            disabled={disabled || loading}
          >
            <Ionicons name="grid" size={20} color="#666" />
            <Text style={[styles.buttonText, { color: '#666' }]}>Browse Their Items</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  // Receiver buttons (user who received the offer)
  const renderReceiverButtons = () => {
    if (tradeState === 'proposed') {
      return (
        <View style={styles.buttonContainer}>
          <View style={styles.primaryButtonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton, styles.flexButton]}
              onPress={() => handleAction('accept', onAccept)}
              disabled={disabled || loading}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.counterButton, styles.flexButton]}
              onPress={() => handleAction('counter', onCounter)}
              disabled={disabled || loading}
            >
              <Ionicons name="swap-horizontal" size={20} color="white" />
              <Text style={styles.buttonText}>Counter</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.secondaryButtonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={() => handleAction('decline', onDecline)}
              disabled={disabled || loading}
            >
              <Ionicons name="close" size={20} color="#F44336" />
              <Text style={[styles.buttonText, { color: '#F44336' }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handleAction('browse', onBrowseInventory)}
              disabled={disabled || loading}
            >
              <Ionicons name="grid" size={20} color="#666" />
              <Text style={[styles.buttonText, { color: '#666' }]}>Browse Items</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {userRole === 'proposer' ? renderProposerButtons() : renderReceiverButtons()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButtonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  counterButton: {
    backgroundColor: '#FF9800',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  withdrawButton: {
    backgroundColor: '#F44336',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
});
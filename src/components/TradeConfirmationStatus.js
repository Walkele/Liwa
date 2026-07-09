import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';

export const TradeConfirmationStatus = ({ 
  conversationId, 
  step, 
  currentUserId, 
  onConfirm,
  style 
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfirmationStatus();
    
    // Refresh status every 30 seconds to update time remaining
    const interval = setInterval(loadConfirmationStatus, 30000);
    return () => clearInterval(interval);
  }, [conversationId, step, currentUserId]);

  const loadConfirmationStatus = async () => {
    try {
      const confirmationStatus = await BilateralTradeConfirmationService.getStepConfirmationStatus(
        conversationId, 
        step, 
        currentUserId
      );
      setStatus(confirmationStatus);
    } catch (error) {
      console.error('Error loading confirmation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      await loadConfirmationStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm step. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) {
    return (
      <View style={[styles.container, styles.loading, style]}>
        <Text style={styles.loadingText}>Loading confirmation status...</Text>
      </View>
    );
  }

  const stepName = BilateralTradeConfirmationService.getStepDisplayName(step);

  // Both confirmed
  if (status.bothConfirmed) {
    return (
      <View style={[styles.container, styles.completed, style]}>
        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        <Text style={styles.completedText}>✅ Both parties confirmed: {stepName}</Text>
      </View>
    );
  }

  // Expired
  if (status.expired) {
    return (
      <View style={[styles.container, styles.expired, style]}>
        <Ionicons name="time-outline" size={24} color="#F44336" />
        <Text style={styles.expiredText}>⚠️ EXPIRED: {stepName}</Text>
        <Text style={styles.expiredSubtext}>Confirmation period has ended</Text>
      </View>
    );
  }

  // User needs to take action
  if (status.userNeedsAction) {
    return (
      <View style={[styles.container, styles.actionRequired, style]}>
        <View style={styles.header}>
          <Ionicons name="alert-circle" size={24} color="#FF9800" />
          <Text style={styles.actionTitle}>ACTION REQUIRED</Text>
        </View>
        
        <Text style={styles.actionText}>Please confirm: {stepName}</Text>
        
        {status.timeRemaining && (
          <Text style={styles.timeRemaining}>⏰ Time remaining: {status.timeRemaining}</Text>
        )}
        
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={handleConfirm}
          disabled={loading}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.confirmButtonText}>
            {loading ? 'Confirming...' : `Confirm ${stepName}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // User already confirmed, waiting for other party
  return (
    <View style={[styles.container, styles.waiting, style]}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        <Text style={styles.waitingTitle}>You Confirmed</Text>
      </View>
      
      <Text style={styles.waitingText}>✅ You confirmed: {stepName}</Text>
      <Text style={styles.waitingSubtext}>⏳ Waiting for other party to confirm</Text>
      
      {status.timeRemaining && (
        <Text style={styles.timeRemaining}>⚠️ Expires {status.timeRemaining}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  loading: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  completed: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  expired: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    alignItems: 'center',
  },
  expiredText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  expiredSubtext: {
    color: '#C62828',
    fontSize: 14,
    marginTop: 4,
  },
  actionRequired: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  waiting: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    color: '#E65100',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  waitingTitle: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionText: {
    color: '#E65100',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  waitingText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  waitingSubtext: {
    color: '#1976D2',
    fontSize: 14,
    marginBottom: 8,
  },
  timeRemaining: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
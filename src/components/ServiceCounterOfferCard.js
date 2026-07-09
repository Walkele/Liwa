// Service Counter Offer Card Component
// Displays service counter offers in chat with Accept/Decline buttons

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingButton from './LoadingButton';
import ServiceCounterOfferModal from './ServiceCounterOfferModal';
import { ServiceOfferService } from '../services/ServiceOfferService';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function ServiceCounterOfferCard({
  message,
  currentUserId,
  onCounterAction,
  onCounterBack
}) {
  // Debug logging
  console.log('🔄 ServiceCounterOfferCard rendering with message:', {
    messageType: message.messageType,
    serviceCounterOfferId: message.serviceCounterOfferId,
    counterPrice: message.counterPrice,
    originalPrice: message.originalPrice,
    counterNumber: message.counterNumber,
    remainingCounters: message.remainingCounters,
    targetUserId: message.targetUserId,
    counteringUserId: message.counteringUserId,
    currentUserId,
    isTargetUser: currentUserId === message.targetUserId
  });
  
  const [counterStatus, setCounterStatus] = useState(message.status || 'pending');
  const [showCounterModal, setShowCounterModal] = useState(false);
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  const counterData = message;
  const isTargetUser = currentUserId === counterData.targetUserId;
  const canTakeAction = isTargetUser && counterStatus === 'pending';
  const canCounterBack = canTakeAction && counterData.remainingCounters > 0;
  
  console.log('🔄 ServiceCounterOfferCard state:', {
    isTargetUser,
    canTakeAction,
    canCounterBack,
    counterStatus
  });

  const handleAcceptCounter = async () => {
    Alert.alert(
      'Accept Counter Offer',
      `Accept counter offer of $${counterData.counterPrice}${counterData.counterDuration ? ` (${counterData.counterDuration})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            await withLoading(async () => {
              try {
                await ServiceOfferService.acceptServiceCounterOffer(
                  counterData.serviceCounterOfferId,
                  currentUserId
                );

                showNotification({
                  type: 'success',
                  title: 'Counter Offer Accepted!',
                  message: `You accepted the counter offer of $${counterData.counterPrice}`,
                  autoHide: true,
                  duration: 4000
                });

                setCounterStatus('accepted');

                if (onCounterAction) {
                  onCounterAction('accepted', counterData);
                }
              } catch (error) {
                console.error('Error accepting counter offer:', error);
                showNotification({
                  type: 'error',
                  title: 'Failed to Accept',
                  message: error.message || 'Could not accept counter offer',
                  autoHide: true,
                  duration: 4000
                });
              }
            });
          }
        }
      ]
    );
  };

  const handleDeclineCounter = async () => {
    Alert.prompt(
      'Decline Counter Offer',
      'Why are you declining this counter offer? (Optional)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          onPress: async (reason) => {
            await withLoading(async () => {
              try {
                await ServiceOfferService.declineServiceCounterOffer(
                  counterData.serviceCounterOfferId,
                  currentUserId,
                  reason || 'Not interested'
                );

                showNotification({
                  type: 'info',
                  title: 'Counter Offer Declined',
                  message: 'You declined the counter offer',
                  autoHide: true,
                  duration: 3000
                });

                setCounterStatus('declined');

                if (onCounterAction) {
                  onCounterAction('declined', counterData, { reason });
                }
              } catch (error) {
                console.error('Error declining counter offer:', error);
                showNotification({
                  type: 'error',
                  title: 'Failed to Decline',
                  message: error.message || 'Could not decline counter offer',
                  autoHide: true,
                  duration: 4000
                });
              }
            });
          }
        }
      ],
      'plain-text'
    );
  };
  
  const handleCounterBack = () => {
    // Check if can counter back
    if (counterData.remainingCounters <= 0) {
      Alert.alert(
        'Counter Limit Reached',
        'Maximum counter offers reached. You can accept, decline, or message to negotiate.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Show counter modal
    setShowCounterModal(true);
  };
  
  const handleCounterSubmit = async (newCounterData) => {
    try {
      await withLoading(async () => {
        const result = await ServiceOfferService.createServiceCounterOffer(
          counterData.serviceOfferId,
          currentUserId,
          newCounterData
        );
        
        showNotification({
          type: 'success',
          title: 'Counter Offer Sent!',
          message: `Your counter offer of $${newCounterData.counterPrice} has been sent`,
          autoHide: true,
          duration: 3000
        });
        
        setShowCounterModal(false);
        setCounterStatus('countered');
        
        if (onCounterAction) {
          onCounterAction('counter_back', counterData, result);
        }
      });
    } catch (error) {
      console.error('Error sending counter back:', error);
      throw error; // Let modal handle the error
    }
  };

  // Don't render if already accepted or declined
  if (counterStatus === 'accepted' || counterStatus === 'declined') {
    return null;
  }

  // Don't render if current user is the one who sent the counter
  if (currentUserId === counterData.counteringUserId) {
    return (
      <View style={styles.sentContainer}>
        <Text style={styles.sentTitle}>🔄 Counter Offer Sent</Text>
        <Text style={styles.sentText}>
          Waiting for response... (Counter #{counterData.counterNumber}/3)
        </Text>
      </View>
    );
  }

  const priceChange = counterData.counterPrice - counterData.originalPrice;
  const isPriceLower = priceChange < 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="swap-horizontal" size={24} color="#FF9800" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Counter Offer #{counterData.counterNumber}</Text>
          <Text style={styles.headerSubtitle}>
            {counterData.remainingCounters} counter{counterData.remainingCounters !== 1 ? 's' : ''} remaining
          </Text>
        </View>
        <View style={[styles.priceContainer, isPriceLower && styles.lowerPriceContainer]}>
          <Text style={styles.priceText}>${counterData.counterPrice}</Text>
        </View>
      </View>

      {/* Price Comparison */}
      <View style={styles.comparisonSection}>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>Original Price:</Text>
          <Text style={styles.comparisonValue}>${counterData.originalPrice}</Text>
        </View>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>Counter Price:</Text>
          <Text style={[styles.comparisonValue, styles.counterPrice]}>
            ${counterData.counterPrice}
          </Text>
        </View>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>Difference:</Text>
          <Text style={[
            styles.comparisonValue,
            isPriceLower ? styles.lowerPrice : styles.higherPrice
          ]}>
            {isPriceLower ? '-' : '+'}${Math.abs(priceChange).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Duration Change (if any) */}
      {counterData.counterDuration && counterData.counterDuration !== counterData.originalDuration && (
        <View style={styles.durationSection}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.durationText}>
            Duration: {counterData.originalDuration} → {counterData.counterDuration}
          </Text>
        </View>
      )}

      {/* Counter Message */}
      {counterData.counterMessage && (
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{counterData.counterMessage}</Text>
        </View>
      )}

      {/* Action Buttons */}
      {canTakeAction && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDeclineCounter}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          {canCounterBack && (
            <TouchableOpacity
              style={styles.counterButton}
              onPress={handleCounterBack}
              disabled={loading}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FF9800" />
              <Text style={styles.counterButtonText}>Counter</Text>
            </TouchableOpacity>
          )}

          <LoadingButton
            title="Accept"
            onPress={handleAcceptCounter}
            loading={loading}
            variant="primary"
            icon="checkmark-circle"
            style={styles.acceptButton}
            textStyle={styles.acceptButtonText}
          />
        </View>
      )}

      {/* Status Display */}
      {!canTakeAction && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {counterStatus === 'pending' 
              ? 'Waiting for response...' 
              : `Counter offer ${counterStatus}`
            }
          </Text>
        </View>
      )}
      
      {/* Counter Back Modal */}
      <ServiceCounterOfferModal
        visible={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        serviceOffer={{
          ...counterData,
          servicePrice: counterData.counterPrice,
          estimatedTime: counterData.counterDuration || counterData.originalDuration,
          serviceTitle: counterData.originalServiceTitle || counterData.serviceTitle
        }}
        currentCounterCount={counterData.counterNumber}
        onCounterSubmit={handleCounterSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sentContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    margin: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  sentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  sentText: {
    fontSize: 14,
    color: '#856404',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  priceContainer: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lowerPriceContainer: {
    backgroundColor: '#4CAF50',
  },
  priceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  comparisonSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  counterPrice: {
    color: '#FF9800',
  },
  lowerPrice: {
    color: '#4CAF50',
  },
  higherPrice: {
    color: '#F44336',
  },
  durationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  messageSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: 'white',
  },
  declineButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  counterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    backgroundColor: 'white',
  },
  counterButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export { ServiceCounterOfferCard };

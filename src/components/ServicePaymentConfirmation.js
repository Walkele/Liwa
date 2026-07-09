// Service Payment Confirmation Component
// Handles bilateral payment confirmation for service transactions

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ElegantButton from './ElegantButton';
import { ServiceConfirmationService } from '../services/ServiceConfirmationService';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function ServicePaymentConfirmation({
  conversationId,
  currentUserId,
  serviceData,
  isOwner,
  isProvider,
  onPaymentComplete
}) {
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [providerConfirmed, setProviderConfirmed] = useState(false);
  const [bothConfirmed, setBothConfirmed] = useState(false);
  
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  useEffect(() => {
    loadPaymentStatus();
  }, [conversationId]);

  const loadPaymentStatus = async () => {
    try {
      const status = await ServiceConfirmationService.getStepConfirmationStatus(
        conversationId,
        ServiceConfirmationService.SERVICE_STEPS.PAYMENT_COMPLETED,
        currentUserId
      );
      
      setOwnerConfirmed(status.clientConfirmed || false);
      setProviderConfirmed(status.providerConfirmed || false);
      setBothConfirmed(status.bothConfirmed || false);
    } catch (error) {
      console.error('Error loading payment status:', error);
    }
  };

  const handleOwnerConfirmPayment = async () => {
    Alert.alert(
      'Confirm Payment',
      `Confirm that you will pay $${serviceData.servicePrice} for "${serviceData.serviceTitle}"?\n\nThis confirms you are ready to complete the payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Payment',
          style: 'default',
          onPress: async () => {
            await withLoading(async () => {
              try {
                await ServiceConfirmationService.confirmServiceStep(
                  conversationId,
                  ServiceConfirmationService.SERVICE_STEPS.PAYMENT_COMPLETED,
                  currentUserId,
                  {
                    paymentAmount: serviceData.servicePrice,
                    paymentMethod: 'cash',
                    paymentSentAt: new Date().toISOString(),
                    confirmedBy: 'owner'
                  }
                );
                
                setOwnerConfirmed(true);
                
                showNotification({
                  type: 'success',
                  title: 'Payment Confirmed!',
                  message: 'Waiting for provider to confirm receipt',
                  autoHide: true,
                  duration: 3000
                });
                
                // Reload status to check if both confirmed
                await loadPaymentStatus();
              } catch (error) {
                console.error('Error confirming payment:', error);
                showNotification({
                  type: 'error',
                  title: 'Confirmation Failed',
                  message: error.message || 'Could not confirm payment',
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

  const handleProviderConfirmPayment = async () => {
    Alert.alert(
      'Confirm Payment Received',
      `Confirm that you received $${serviceData.servicePrice} for "${serviceData.serviceTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Received',
          style: 'default',
          onPress: async () => {
            await withLoading(async () => {
              try {
                await ServiceConfirmationService.confirmServiceStep(
                  conversationId,
                  ServiceConfirmationService.SERVICE_STEPS.PAYMENT_COMPLETED,
                  currentUserId,
                  {
                    paymentAmount: serviceData.servicePrice,
                    paymentReceivedAt: new Date().toISOString(),
                    confirmedBy: 'provider'
                  }
                );
                
                setProviderConfirmed(true);
                
                showNotification({
                  type: 'success',
                  title: 'Payment Received!',
                  message: 'Service transaction complete',
                  autoHide: true,
                  duration: 3000
                });
                
                // Reload status to check if both confirmed
                await loadPaymentStatus();
                
                // Check if both confirmed now
                const updatedStatus = await ServiceConfirmationService.getStepConfirmationStatus(
                  conversationId,
                  ServiceConfirmationService.SERVICE_STEPS.PAYMENT_COMPLETED,
                  currentUserId
                );
                
                if (updatedStatus.bothConfirmed && onPaymentComplete) {
                  onPaymentComplete();
                }
              } catch (error) {
                console.error('Error confirming payment received:', error);
                showNotification({
                  type: 'error',
                  title: 'Confirmation Failed',
                  message: error.message || 'Could not confirm payment received',
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

  // Both parties confirmed - show success
  if (bothConfirmed) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.successTitle}>
            🎉 Payment Confirmed!
          </Text>
          <Text style={styles.successText}>
            Both parties have confirmed the payment
          </Text>
          <Text style={styles.successAmount}>
            ${serviceData.servicePrice}
          </Text>
          <View style={styles.successDetails}>
            <Text style={styles.successDetailText}>
              ✅ Owner confirmed payment sent
            </Text>
            <Text style={styles.successDetailText}>
              ✅ Provider confirmed payment received
            </Text>
          </View>
          <Text style={styles.nextStepText}>
            📝 Don't forget to leave reviews for each other!
          </Text>
        </View>
      </View>
    );
  }

  // Payment confirmation in progress
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="card" size={32} color="#FF6B6B" />
        <Text style={styles.title}>Payment Confirmation</Text>
      </View>

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Service Amount</Text>
        <Text style={styles.amount}>${serviceData.servicePrice}</Text>
        <Text style={styles.serviceName}>{serviceData.serviceTitle}</Text>
      </View>

      {/* Status Display */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={ownerConfirmed ? 'checkmark-circle' : 'time-outline'}
              size={24}
              color={ownerConfirmed ? '#4CAF50' : '#FF9800'}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Owner Payment</Text>
              <Text style={[
                styles.statusValue,
                ownerConfirmed && styles.statusConfirmed
              ]}>
                {ownerConfirmed ? 'Payment Sent ✅' : 'Pending ⏳'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statusDivider} />
        
        <View style={styles.statusItem}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={providerConfirmed ? 'checkmark-circle' : 'time-outline'}
              size={24}
              color={providerConfirmed ? '#4CAF50' : '#FF9800'}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Provider Receipt</Text>
              <Text style={[
                styles.statusValue,
                providerConfirmed && styles.statusConfirmed
              ]}>
                {providerConfirmed ? 'Payment Received ✅' : 'Pending ⏳'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Owner Button */}
        {isOwner && !ownerConfirmed && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Your Action Required:</Text>
            <ElegantButton
              title="Confirm Payment Sent"
              icon="cash-outline"
              variant="success"
              gradient={true}
              onPress={handleOwnerConfirmPayment}
              loading={loading}
            />
            <Text style={styles.actionHint}>
              Confirm that you have sent the payment
            </Text>
          </View>
        )}

        {/* Provider Button */}
        {isProvider && !providerConfirmed && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Your Action Required:</Text>
            <ElegantButton
              title="Confirm Payment Received"
              icon="checkmark-circle"
              variant="success"
              gradient={true}
              onPress={handleProviderConfirmPayment}
              loading={loading}
            />
            <Text style={styles.actionHint}>
              Confirm that you have received the payment
            </Text>
          </View>
        )}

        {/* Waiting Message */}
        {((isOwner && ownerConfirmed) || (isProvider && providerConfirmed)) && (
          <View style={styles.waitingContainer}>
            <Ionicons name="time-outline" size={32} color="#FF9800" />
            <Text style={styles.waitingTitle}>Waiting for Confirmation</Text>
            <Text style={styles.waitingText}>
              {isOwner 
                ? 'Waiting for provider to confirm payment received'
                : 'Waiting for owner to confirm payment sent'
              }
            </Text>
          </View>
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2196F3" />
        <Text style={styles.infoText}>
          Both parties must confirm the payment to complete the transaction
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  amount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    paddingVertical: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  statusConfirmed: {
    color: '#4CAF50',
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  actionContainer: {
    marginBottom: 16,
  },
  actionSection: {
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginTop: 12,
    marginBottom: 4,
  },
  waitingText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  successDetails: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  successDetailText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  nextStepText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

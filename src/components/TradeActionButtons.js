import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedTradeService } from '../services/EnhancedTradeService';
import LoadingButton from './LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export const TradeActionButtons = ({ 
  tradeOffer, 
  currentUserId, 
  onActionComplete,
  style = {} 
}) => {
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showBootModal, setShowBootModal] = useState(false);
  const { loading: acceptLoading, withLoading: withAcceptLoading } = useLoadingState();
  const { loading: declineLoading, withLoading: withDeclineLoading } = useLoadingState();
  const { showNotification } = useNotification();

  if (!tradeOffer || tradeOffer.status !== 'pending') {
    return null;
  }

  const isTarget = tradeOffer.targetUserId === currentUserId;
  const isProposer = tradeOffer.proposerUserId === currentUserId;

  // Only show action buttons to the target user
  if (!isTarget) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.waitingContainer}>
          <Ionicons name="time-outline" size={20} color="#FF9800" />
          <Text style={styles.waitingText}>Waiting for response...</Text>
        </View>
      </View>
    );
  }

  const handleAccept = async () => {
    await withAcceptLoading(
      async () => {
        await EnhancedTradeService.acceptTradeOffer(tradeOffer.id, currentUserId);
        onActionComplete?.('accepted');
      },
      {
        successMessage: 'Trade offer accepted successfully!',
        errorMessage: 'Failed to accept offer. Please try again.',
        showSuccessNotification: true
      }
    );
  };

  const handleDecline = () => {
    showNotification({
      type: 'warning',
      title: 'Decline Offer',
      message: 'Are you sure you want to decline this trade offer?',
      autoHide: false,
      actions: [
        {
          title: 'Cancel',
          onPress: () => {},
          style: 'secondary'
        },
        {
          title: 'Decline',
          onPress: async () => {
            await withDeclineLoading(
              async () => {
                await EnhancedTradeService.declineTradeOffer(tradeOffer.id, currentUserId);
                onActionComplete?.('declined');
              },
              {
                successMessage: 'Trade offer declined.',
                errorMessage: 'Failed to decline offer. Please try again.',
                showSuccessNotification: true
              }
            );
          },
          style: 'primary'
        }
      ]
    });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.actionsGrid}>
        <LoadingButton
          title="Accept"
          onPress={handleAccept}
          loading={acceptLoading}
          variant="success"
          icon="checkmark-circle"
          size="medium"
          style={[styles.actionButton, styles.primaryButton]}
        />
        
        <View style={styles.secondaryActions}>
          <LoadingButton
            title="Counter"
            onPress={() => setShowCounterModal(true)}
            variant="secondary"
            icon="swap-horizontal"
            size="small"
            style={styles.secondaryButton}
          />
          
          <LoadingButton
            title="Add Cash"
            onPress={() => setShowBootModal(true)}
            variant="secondary"
            icon="cash"
            size="small"
            style={styles.secondaryButton}
          />
          
          <LoadingButton
            title="Decline"
            onPress={handleDecline}
            loading={declineLoading}
            variant="danger"
            icon="close-circle"
            size="small"
            style={styles.secondaryButton}
          />
        </View>
      </View>

      {/* Counter Offer Modal */}
      <CounterOfferModal
        visible={showCounterModal}
        tradeOffer={tradeOffer}
        currentUserId={currentUserId}
        onClose={() => setShowCounterModal(false)}
        onComplete={(result) => {
          setShowCounterModal(false);
          onActionComplete?.(result);
        }}
      />

      {/* Boot Modal */}
      <BootModal
        visible={showBootModal}
        tradeOffer={tradeOffer}
        currentUserId={currentUserId}
        onClose={() => setShowBootModal(false)}
        onComplete={(result) => {
          setShowBootModal(false);
          onActionComplete?.(result);
        }}
      />
    </View>
  );
};

const CounterOfferModal = ({ visible, tradeOffer, currentUserId, onClose, onComplete }) => {
  const [message, setMessage] = useState('');
  const [bootAmount, setBootAmount] = useState('');
  const [bootType, setBootType] = useState('cash');
  const { loading, withLoading } = useLoadingState();
  const { showError } = useNotification();

  const handleSubmit = async () => {
    await withLoading(
      async () => {
        const counterOfferData = {
          counterUserId: currentUserId,
          message: message.trim(),
          bootAmount: bootAmount ? parseFloat(bootAmount) : 0,
          bootType: bootAmount ? bootType : null,
          bootPayer: bootAmount ? currentUserId : null
        };

        await EnhancedTradeService.createCounterOffer(tradeOffer.id, counterOfferData);
        onComplete('counter_offered');
      },
      {
        successMessage: 'Counter offer sent successfully!',
        errorMessage: 'Failed to create counter offer. Please try again.',
        showSuccessNotification: true
      }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Propose different terms for this trade
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Message (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Explain your counter offer..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Add Cash/Boot (Optional)</Text>
            <View style={styles.bootInputContainer}>
              <TextInput
                style={styles.bootAmountInput}
                value={bootAmount}
                onChangeText={setBootAmount}
                placeholder="0"
                keyboardType="numeric"
              />
              <View style={styles.bootTypeSelector}>
                <TouchableOpacity
                  style={[styles.bootTypeButton, bootType === 'cash' && styles.bootTypeButtonActive]}
                  onPress={() => setBootType('cash')}
                >
                  <Text style={[styles.bootTypeText, bootType === 'cash' && styles.bootTypeTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bootTypeButton, bootType === 'points' && styles.bootTypeButtonActive]}
                  onPress={() => setBootType('points')}
                >
                  <Text style={[styles.bootTypeText, bootType === 'points' && styles.bootTypeTextActive]}>
                    Points
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <LoadingButton
              title="Send Counter Offer"
              onPress={handleSubmit}
              loading={loading}
              variant="primary"
              style={[styles.modalButton, styles.submitButton]}
              textStyle={styles.submitButtonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BootModal = ({ visible, tradeOffer, currentUserId, onClose, onComplete }) => {
  const [bootAmount, setBootAmount] = useState('');
  const [bootType, setBootType] = useState('cash');
  const [message, setMessage] = useState('');
  const { loading, withLoading } = useLoadingState();
  const { showError } = useNotification();

  const handleSubmit = async () => {
    if (!bootAmount || parseFloat(bootAmount) <= 0) {
      showError('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    await withLoading(
      async () => {
        const bootData = {
          userId: currentUserId,
          bootAmount: parseFloat(bootAmount),
          bootType,
          message: message.trim()
        };

        await EnhancedTradeService.addBootToOffer(tradeOffer.id, bootData);
        onComplete('boot_added');
      },
      {
        successMessage: `${bootAmount} ${bootType} added successfully!`,
        errorMessage: 'Failed to add boot. Please try again.',
        showSuccessNotification: true
      }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Cash/Boot</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Add cash or points to balance the trade
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.bootInputContainer}>
              <TextInput
                style={styles.bootAmountInput}
                value={bootAmount}
                onChangeText={setBootAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
              />
              <View style={styles.bootTypeSelector}>
                <TouchableOpacity
                  style={[styles.bootTypeButton, bootType === 'cash' && styles.bootTypeButtonActive]}
                  onPress={() => setBootType('cash')}
                >
                  <Text style={[styles.bootTypeText, bootType === 'cash' && styles.bootTypeTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bootTypeButton, bootType === 'points' && styles.bootTypeButtonActive]}
                  onPress={() => setBootType('points')}
                >
                  <Text style={[styles.bootTypeText, bootType === 'points' && styles.bootTypeTextActive]}>
                    Points
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Message (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Explain why you're adding this amount..."
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <LoadingButton
              title={bootAmount ? `Add ${bootAmount} ${bootType}` : 'Add Boot'}
              onPress={handleSubmit}
              loading={loading}
              disabled={!bootAmount}
              variant="primary"
              style={[styles.modalButton, styles.submitButton]}
              textStyle={styles.submitButtonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  waitingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
    marginBottom: 8,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minWidth: '30%',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  bootInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bootAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  bootTypeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bootTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  bootTypeButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  bootTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  bootTypeTextActive: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default TradeActionButtons;
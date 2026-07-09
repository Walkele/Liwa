import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReOfferService } from '../services/ReOfferService';

const ReOfferButton = ({ 
  item, 
  userId, 
  lastOfferAmount = 0,
  onReOfferSent,
  style = {} 
}) => {
  const [reOfferEligibility, setReOfferEligibility] = useState(null);
  const [showReOfferModal, setShowReOfferModal] = useState(false);
  const [newOfferAmount, setNewOfferAmount] = useState('');
  const [reOfferReason, setReOfferReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    checkReOfferEligibility();
    
    // Update timer every minute
    const timer = setInterval(() => {
      if (reOfferEligibility?.cooldownEnds) {
        const remaining = ReOfferService.getCooldownTimeRemaining(reOfferEligibility.cooldownEnds);
        setTimeRemaining(remaining || '');
        
        // Re-check eligibility when cooldown expires
        if (!remaining) {
          checkReOfferEligibility();
        }
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [item.id, userId]);

  const checkReOfferEligibility = async () => {
    try {
      const eligibility = await ReOfferService.canMakeReOffer(item.id, userId);
      setReOfferEligibility(eligibility);
      
      if (eligibility.cooldownEnds) {
        const remaining = ReOfferService.getCooldownTimeRemaining(eligibility.cooldownEnds);
        setTimeRemaining(remaining || '');
      }
    } catch (error) {
      console.error('Error checking re-offer eligibility:', error);
    }
  };

  const handleReOffer = async () => {
    try {
      setLoading(true);

      if (!newOfferAmount.trim()) {
        Alert.alert('Missing Information', 'Please enter your new offer amount.');
        return;
      }

      const offerValue = parseFloat(newOfferAmount);
      if (isNaN(offerValue) || offerValue <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid offer amount.');
        return;
      }

      const requiredImprovement = Math.max(5, lastOfferAmount * 0.05);
      const minimumOffer = lastOfferAmount + requiredImprovement;

      if (offerValue < minimumOffer) {
        Alert.alert(
          'Insufficient Improvement',
          `Your new offer must be at least $${minimumOffer.toFixed(2)} (minimum $${requiredImprovement.toFixed(2)} improvement required).`
        );
        return;
      }

      const offerData = {
        itemId: item.id,
        sellerId: item.userId,
        offerType: 'cash',
        cashAmount: offerValue,
        reOfferReason: reOfferReason.trim() || 'Improved offer after consideration',
        notes: `Re-offer: Improved from $${lastOfferAmount} to $${offerValue} (+$${(offerValue - lastOfferAmount).toFixed(2)})`
      };

      const result = await ReOfferService.createReOffer(
        item.id,
        userId,
        offerData,
        lastOfferAmount
      );

      if (result.success) {
        Alert.alert(
          'Re-offer Sent!',
          `Your improved offer of $${offerValue} has been sent (${result.improvementAmount.toFixed(2)} improvement). The seller will be notified.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              setShowReOfferModal(false);
              setNewOfferAmount('');
              setReOfferReason('');
              onReOfferSent?.(result);
              checkReOfferEligibility(); // Refresh eligibility
            }
          }]
        );
      }

    } catch (error) {
      console.error('Error sending re-offer:', error);
      Alert.alert('Error', error.message || 'Failed to send re-offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (!reOfferEligibility) return 'Loading...';
    
    if (reOfferEligibility.canOffer) {
      return `Re-offer (${reOfferEligibility.attemptsRemaining} left)`;
    } else if (reOfferEligibility.reason === 'cooldown_active') {
      return `Available in ${timeRemaining}`;
    } else if (reOfferEligibility.reason === 'max_attempts_exceeded') {
      return 'Max attempts reached';
    } else {
      return 'Cannot re-offer';
    }
  };

  const getButtonStyle = () => {
    if (!reOfferEligibility) return styles.reOfferButtonDisabled;
    
    if (reOfferEligibility.canOffer) {
      return styles.reOfferButtonActive;
    } else {
      return styles.reOfferButtonDisabled;
    }
  };

  const showReOfferInfo = () => {
    if (!reOfferEligibility) return;

    let message = '';
    if (reOfferEligibility.canOffer) {
      message = `You can make a re-offer! Your previous offer was $${lastOfferAmount}. New offer must be at least $${(lastOfferAmount + Math.max(5, lastOfferAmount * 0.05)).toFixed(2)}.`;
    } else if (reOfferEligibility.reason === 'cooldown_active') {
      message = `You can make a new offer in ${timeRemaining}. This cooldown prevents spam and gives sellers time to consider.`;
    } else if (reOfferEligibility.reason === 'max_attempts_exceeded') {
      message = 'You have reached the maximum number of offers for this item. Consider looking for similar items.';
    }

    Alert.alert(
      'Re-offer Information',
      message,
      reOfferEligibility.canOffer 
        ? [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Make Re-offer', onPress: () => setShowReOfferModal(true) }
          ]
        : [{ text: 'OK' }]
    );
  };

  if (!reOfferEligibility) {
    return (
      <TouchableOpacity style={[styles.reOfferButtonDisabled, style]} disabled>
        <Ionicons name="time" size={16} color="#999" />
        <Text style={styles.reOfferButtonTextDisabled}>Loading...</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={reOfferEligibility.canOffer ? () => setShowReOfferModal(true) : showReOfferInfo}
      >
        <Ionicons 
          name={reOfferEligibility.canOffer ? "refresh" : "time"} 
          size={16} 
          color={reOfferEligibility.canOffer ? "#FF6B6B" : "#999"} 
        />
        <Text style={reOfferEligibility.canOffer ? styles.reOfferButtonTextActive : styles.reOfferButtonTextDisabled}>
          {getButtonText()}
        </Text>
      </TouchableOpacity>

      {/* Re-offer Modal */}
      <Modal
        visible={showReOfferModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReOfferModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowReOfferModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Make Re-offer</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Item Info */}
            <View style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemPrice}>Listed at: ${item.price}</Text>
              <Text style={styles.lastOfferText}>Your last offer: ${lastOfferAmount}</Text>
            </View>

            {/* Improvement Info */}
            <View style={styles.improvementCard}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.improvementText}>
                Minimum new offer: ${(lastOfferAmount + Math.max(5, lastOfferAmount * 0.05)).toFixed(2)}
              </Text>
            </View>

            {/* New Offer Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your New Offer Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={newOfferAmount}
                  onChangeText={setNewOfferAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason for Re-offer (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                value={reOfferReason}
                onChangeText={setReOfferReason}
                placeholder="Why are you making an improved offer?"
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>

            {/* Attempts Remaining */}
            <View style={styles.attemptsCard}>
              <Text style={styles.attemptsText}>
                Attempts remaining: {reOfferEligibility.attemptsRemaining}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowReOfferModal(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleReOffer}
              disabled={loading}
            >
              <Text style={styles.sendButtonText}>
                {loading ? 'Sending...' : 'Send Re-offer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  reOfferButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  reOfferButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  reOfferButtonTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  reOfferButtonTextDisabled: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  itemCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastOfferText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  improvementCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  improvementText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 16,
  },
  reasonInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  attemptsCard: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  attemptsText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    flex: 2,
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ReOfferButton;
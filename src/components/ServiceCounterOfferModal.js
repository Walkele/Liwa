// Service Counter Offer Modal
// Allows users to counter service offers with new price and terms

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ElegantButton from './ElegantButton';
import { useLoadingState } from '../hooks/useLoadingState';

export default function ServiceCounterOfferModal({
  visible,
  onClose,
  serviceOffer,
  currentCounterCount = 0,
  onCounterSubmit
}) {
  const [counterPrice, setCounterPrice] = useState('');
  const [counterDuration, setCounterDuration] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const { loading, withLoading } = useLoadingState();

  const maxCounters = 3;
  const remainingCounters = maxCounters - currentCounterCount;

  const handleSubmit = async () => {
    // Validate counter price
    if (!counterPrice || counterPrice.trim() === '') {
      Alert.alert('Missing Price', 'Please enter a counter price');
      return;
    }

    const priceValue = parseFloat(counterPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }

    // Check if counter is same as original
    if (priceValue === serviceOffer.servicePrice && !counterDuration && !counterMessage) {
      Alert.alert(
        'No Changes',
        'Your counter offer is the same as the original. Please change the price, duration, or add a message.'
      );
      return;
    }

    await withLoading(async () => {
      try {
        const counterData = {
          counterPrice: priceValue,
          counterDuration: counterDuration.trim() || serviceOffer.estimatedTime,
          counterMessage: counterMessage.trim() || `Counter offer: $${priceValue}`,
          originalPrice: serviceOffer.servicePrice,
          originalDuration: serviceOffer.estimatedTime
        };

        await onCounterSubmit(counterData);
        
        // Reset form
        setCounterPrice('');
        setCounterDuration('');
        setCounterMessage('');
        onClose();
      } catch (error) {
        console.error('Error submitting counter offer:', error);
        Alert.alert('Error', error.message || 'Failed to submit counter offer');
      }
    });
  };

  const handleClose = () => {
    setCounterPrice('');
    setCounterDuration('');
    setCounterMessage('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Counter Service Offer</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Counter Limit Warning */}
            {remainingCounters <= 1 && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#FF9800" />
                <Text style={styles.warningText}>
                  {remainingCounters === 1
                    ? 'This is your last counter offer!'
                    : 'Maximum counters reached. This is your final offer.'}
                </Text>
              </View>
            )}

            {/* Original Offer Info */}
            <View style={styles.originalOfferBox}>
              <Text style={styles.sectionTitle}>Original Offer</Text>
              <View style={styles.offerRow}>
                <Text style={styles.offerLabel}>Service:</Text>
                <Text style={styles.offerValue}>{serviceOffer.serviceTitle}</Text>
              </View>
              <View style={styles.offerRow}>
                <Text style={styles.offerLabel}>Price:</Text>
                <Text style={styles.offerValue}>${serviceOffer.servicePrice}</Text>
              </View>
              <View style={styles.offerRow}>
                <Text style={styles.offerLabel}>Duration:</Text>
                <Text style={styles.offerValue}>{serviceOffer.estimatedTime}</Text>
              </View>
            </View>

            {/* Counter Price Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Counter Price <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={counterPrice}
                  onChangeText={setCounterPrice}
                  placeholder={serviceOffer.servicePrice.toString()}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
              <Text style={styles.inputHint}>
                Enter your proposed price for the service
              </Text>
            </View>

            {/* Counter Duration Input (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Duration <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={counterDuration}
                onChangeText={setCounterDuration}
                placeholder={serviceOffer.estimatedTime || "e.g., 1.5 hours"}
                maxLength={20}
              />
              <Text style={styles.inputHint}>
                Propose a different duration if needed
              </Text>
            </View>

            {/* Counter Message Input (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Message <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.messageInput]}
                value={counterMessage}
                onChangeText={setCounterMessage}
                placeholder="Explain your counter offer..."
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.inputHint}>
                {counterMessage.length}/200 characters
              </Text>
            </View>

            {/* Counter Summary */}
            {counterPrice && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Your Counter Offer:</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price:</Text>
                  <Text style={styles.summaryValue}>
                    ${parseFloat(counterPrice || 0).toFixed(2)}
                  </Text>
                </View>
                {counterDuration && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration:</Text>
                    <Text style={styles.summaryValue}>{counterDuration}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Difference:</Text>
                  <Text style={[
                    styles.summaryValue,
                    parseFloat(counterPrice) < serviceOffer.servicePrice
                      ? styles.lowerPrice
                      : styles.higherPrice
                  ]}>
                    {parseFloat(counterPrice) < serviceOffer.servicePrice ? '-' : '+'}
                    ${Math.abs(parseFloat(counterPrice || 0) - serviceOffer.servicePrice).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <ElegantButton
              title="Send Counter Offer"
              icon="swap-horizontal"
              variant="primary"
              gradient={true}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  originalOfferBox: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  offerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  offerLabel: {
    fontSize: 14,
    color: '#666',
  },
  offerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  optional: {
    color: '#999',
    fontWeight: 'normal',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: 'white',
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  lowerPrice: {
    color: '#4CAF50',
  },
  higherPrice: {
    color: '#F44336',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
  },
});

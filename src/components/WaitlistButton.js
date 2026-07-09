import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WaitlistService } from '../services/WaitlistService';

const WaitlistButton = ({ 
  item, 
  userId, 
  onWaitlistAdded,
  style = {} 
}) => {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddToWaitlist = async () => {
    try {
      setLoading(true);

      if (!offerAmount.trim()) {
        Alert.alert('Missing Information', 'Please enter your backup offer amount.');
        return;
      }

      const offerValue = parseFloat(offerAmount);
      if (isNaN(offerValue) || offerValue <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid offer amount.');
        return;
      }

      const offerDetails = {
        offerType: 'cash',
        cashAmount: offerValue,
        totalOfferValue: offerValue,
        notes: offerNotes.trim(),
        notifyOnAvailable: true,
        maxWaitTime: 7 // days
      };

      const result = await WaitlistService.addToWaitlist(
        item.id,
        userId,
        offerDetails
      );

      if (result.success) {
        Alert.alert(
          'Added to Waitlist!',
          `You're #${result.queuePosition} in line for "${item.title}". ` +
          `Estimated wait time: ${result.estimatedWaitTime} days.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              setShowOfferModal(false);
              setOfferAmount('');
              setOfferNotes('');
              onWaitlistAdded?.(result);
            }
          }]
        );
      }

    } catch (error) {
      console.error('Error adding to waitlist:', error);
      Alert.alert('Error', error.message || 'Failed to add to waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showWaitlistInfo = () => {
    Alert.alert(
      'Backup Offers',
      'Add a backup offer to get notified if this item becomes available again. ' +
      'Your offer will be queued and you\'ll be contacted if the current deal falls through.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Backup Offer', onPress: () => setShowOfferModal(true) }
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.waitlistButton, style]}
        onPress={showWaitlistInfo}
      >
        <Ionicons name="list" size={16} color="#FF6B6B" />
        <Text style={styles.waitlistButtonText}>Add Backup Offer</Text>
      </TouchableOpacity>

      {/* Backup Offer Modal */}
      <Modal
        visible={showOfferModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowOfferModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Backup Offer</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Item Info */}
            <View style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemPrice}>Listed at: ${item.price}</Text>
              <Text style={styles.itemStatus}>
                Currently {item.status === 'locked' ? 'in negotiation' : 'unavailable'}
              </Text>
            </View>

            {/* Backup Offer Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#FF6B6B" />
              <Text style={styles.infoText}>
                Your backup offer will be queued. If the current deal falls through, 
                you'll be notified and can make a formal offer.
              </Text>
            </View>

            {/* Offer Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Backup Offer Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              <Text style={styles.inputHint}>
                Higher offers get priority in the waitlist
              </Text>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={offerNotes}
                onChangeText={setOfferNotes}
                placeholder="Any additional details about your offer..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>

            {/* Priority Indicator */}
            {offerAmount && (
              <View style={styles.priorityCard}>
                <Text style={styles.priorityTitle}>Queue Priority</Text>
                <View style={styles.priorityIndicator}>
                  <View style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(parseFloat(offerAmount), item.price) }
                  ]} />
                  <Text style={styles.priorityText}>
                    {getPriorityText(parseFloat(offerAmount), item.price)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOfferModal(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.addButton, loading && styles.addButtonDisabled]}
              onPress={handleAddToWaitlist}
              disabled={loading}
            >
              <Text style={styles.addButtonText}>
                {loading ? 'Adding...' : 'Add to Waitlist'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Helper functions
const getPriorityColor = (offerAmount, itemPrice) => {
  const ratio = offerAmount / itemPrice;
  if (ratio >= 1.1) return '#4CAF50'; // High priority - green
  if (ratio >= 0.9) return '#FF9800'; // Medium priority - orange
  return '#F44336'; // Low priority - red
};

const getPriorityText = (offerAmount, itemPrice) => {
  const ratio = offerAmount / itemPrice;
  if (ratio >= 1.1) return 'High Priority (110%+ of asking price)';
  if (ratio >= 0.9) return 'Medium Priority (90-110% of asking price)';
  return 'Low Priority (Below 90% of asking price)';
};

const styles = StyleSheet.create({
  waitlistButton: {
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
  waitlistButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
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
  itemStatus: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
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
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  priorityCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  priorityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 14,
    color: '#666',
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
  addButton: {
    flex: 2,
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default WaitlistButton;
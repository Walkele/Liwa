import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedOfferService } from '../services/EnhancedOfferService';

const CounterOfferModal = ({ 
  visible, 
  onClose, 
  originalOffer, 
  userId, 
  onCounterOfferSent 
}) => {
  const [counterType, setCounterType] = useState('price_adjustment');
  const [cashAmount, setCashAmount] = useState(originalOffer?.cashAmount?.toString() || '0');
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  const counterTypes = [
    { id: 'price_adjustment', label: 'Adjust Price', icon: 'cash' },
    { id: 'cash_modification', label: 'Modify Cash Amount', icon: 'card' },
    { id: 'item_addition', label: 'Add Items', icon: 'add-circle' },
    { id: 'item_substitution', label: 'Substitute Items', icon: 'swap-horizontal' }
  ];

  const handleSendCounterOffer = async () => {
    try {
      setLoading(true);

      if (!reason.trim()) {
        Alert.alert('Missing Information', 'Please provide a reason for your counter-offer.');
        return;
      }

      const counterOfferData = {
        counterType: counterType,
        cashAmount: parseFloat(cashAmount) || 0,
        reason: reason.trim(),
        justification: justification.trim(),
        newTerms: {
          cashAmount: parseFloat(cashAmount) || 0,
          tradeType: originalOffer?.tradeType || 'cash',
          itemIds: originalOffer?.itemIds || []
        }
      };

      const result = await EnhancedOfferService.createCounterOffer(
        originalOffer.id,
        counterOfferData,
        userId
      );

      if (result.success) {
        const alertTitle = result.maxRoundsReached 
          ? 'Final Counter-Offer Sent!' 
          : 'Counter-Offer Sent!';
          
        const alertMessage = result.message || 
          `Your counter-offer has been sent. This is negotiation round ${result.negotiationRound}.`;
        
        Alert.alert(
          alertTitle,
          alertMessage,
          [{ text: 'OK', onPress: () => {
            onCounterOfferSent(result);
            onClose();
          }}]
        );
      }

    } catch (error) {
      console.error('Error sending counter-offer:', error);
      Alert.alert('Error', 'Failed to send counter-offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCounterType('price_adjustment');
    setCashAmount(originalOffer?.cashAmount?.toString() || '0');
    setReason('');
    setJustification('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Make Counter-Offer</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Original Offer Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Original Offer</Text>
            <View style={styles.originalOfferCard}>
              <Text style={styles.originalOfferText}>
                {originalOffer?.tradeType === 'cash' 
                  ? `$${originalOffer?.cashAmount || 0} cash`
                  : 'Item trade'
                }
              </Text>
              {originalOffer?.reason && (
                <Text style={styles.originalOfferReason}>{originalOffer.reason}</Text>
              )}
            </View>
          </View>

          {/* Counter-Offer Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Counter-Offer Type</Text>
            <View style={styles.typeGrid}>
              {counterTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    counterType === type.id && styles.typeButtonSelected
                  ]}
                  onPress={() => setCounterType(type.id)}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={20} 
                    color={counterType === type.id ? '#FFF' : '#FF6B6B'} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    counterType === type.id && styles.typeButtonTextSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cash Amount (if applicable) */}
          {(counterType === 'price_adjustment' || counterType === 'cash_modification') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New Cash Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.cashInput}
                  value={cashAmount}
                  onChangeText={setCashAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          )}

          {/* Reason */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Counter-Offer *</Text>
            <TextInput
              style={styles.textInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Why are you making this counter-offer?"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          {/* Justification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Justification (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={justification}
              onChangeText={setJustification}
              placeholder="Provide additional context or market research..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          {/* Value Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value Comparison</Text>
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Original:</Text>
                <Text style={styles.comparisonValue}>
                  ${originalOffer?.cashAmount || 0}
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Your Counter:</Text>
                <Text style={[
                  styles.comparisonValue,
                  { color: '#FF6B6B', fontWeight: 'bold' }
                ]}>
                  ${cashAmount || 0}
                </Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Difference:</Text>
                <Text style={[
                  styles.comparisonValue,
                  { 
                    color: (parseFloat(cashAmount) || 0) > (originalOffer?.cashAmount || 0) 
                      ? '#4CAF50' : '#F44336' 
                  }
                ]}>
                  {(parseFloat(cashAmount) || 0) > (originalOffer?.cashAmount || 0) ? '+' : ''}
                  ${((parseFloat(cashAmount) || 0) - (originalOffer?.cashAmount || 0)).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendCounterOffer}
            disabled={loading}
          >
            <Text style={styles.sendButtonText}>
              {loading ? 'Sending...' : 'Send Counter-Offer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  originalOfferCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  originalOfferText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  originalOfferReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    gap: 8,
  },
  typeButtonSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#FFF',
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
  cashInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  comparisonCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
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
  warningSection: {
    marginBottom: 20,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
});

export default CounterOfferModal;
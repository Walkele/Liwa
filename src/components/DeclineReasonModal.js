import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  TextInput,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const DeclineReasonModal = ({ 
  visible, 
  onClose, 
  onDecline,
  proposalData 
}) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const declineReasons = [
    {
      id: 'not_interested',
      title: 'Not interested in these items',
      description: 'The items offered don\'t match what I\'m looking for',
      icon: 'close-circle'
    },
    {
      id: 'need_more_cash',
      title: 'Need more cash to balance the deal',
      description: 'The value difference is too large without additional cash',
      icon: 'cash'
    },
    {
      id: 'item_condition',
      title: 'Concerned about item condition',
      description: 'Need more photos or details about the item condition',
      icon: 'warning'
    },
    {
      id: 'timing',
      title: 'Not ready to trade right now',
      description: 'Can\'t meet or complete the trade at this time',
      icon: 'time'
    },
    {
      id: 'location',
      title: 'Location is too far',
      description: 'Meeting location is not convenient for me',
      icon: 'location'
    },
    {
      id: 'other',
      title: 'Other reason',
      description: 'I\'ll provide a custom message',
      icon: 'chatbubble'
    }
  ];

  const handleDecline = async () => {
    if (!selectedReason) {
      Alert.alert('Please select a reason', 'This helps the other person understand and potentially make a better offer.');
      return;
    }

    if (selectedReason === 'other' && !customMessage.trim()) {
      Alert.alert('Please provide a message', 'A brief explanation helps improve future offers.');
      return;
    }

    setLoading(true);
    try {
      const reason = selectedReason === 'other' ? customMessage : declineReasons.find(r => r.id === selectedReason)?.title;
      await onDecline(selectedReason, reason);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomMessage('');
    onClose();
  };

  const getSuggestedCashAmount = () => {
    if (!proposalData) return 0;
    
    const yourValue = proposalData.targetItemValue || 0;
    const theirValue = proposalData.proposerItemValue || 0;
    const currentCash = proposalData.cashAmount || 0;
    
    const difference = yourValue - theirValue - currentCash;
    return Math.max(0, Math.ceil(difference / 10) * 10); // Round up to nearest $10
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Why are you declining?</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.subtitle}>
          This helps the other person understand and potentially make a better offer.
        </Text>

        <View style={styles.reasonsList}>
          {declineReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonOption,
                selectedReason === reason.id && styles.selectedReason
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <View style={styles.reasonContent}>
                <Ionicons 
                  name={reason.icon} 
                  size={24} 
                  color={selectedReason === reason.id ? '#FF6B6B' : '#666'} 
                />
                <View style={styles.reasonText}>
                  <Text style={[
                    styles.reasonTitle,
                    selectedReason === reason.id && styles.selectedText
                  ]}>
                    {reason.title}
                  </Text>
                  <Text style={styles.reasonDescription}>
                    {reason.description}
                  </Text>
                </View>
              </View>
              
              {selectedReason === reason.id && (
                <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedReason === 'other' && (
          <View style={styles.customMessageContainer}>
            <Text style={styles.customMessageLabel}>Your message:</Text>
            <TextInput
              style={styles.customMessageInput}
              placeholder="Please explain why you're declining..."
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {customMessage.length}/200
            </Text>
          </View>
        )}

        {selectedReason === 'need_more_cash' && (
          <View style={styles.suggestionContainer}>
            <Text style={styles.suggestionTitle}>💡 Helpful suggestion:</Text>
            <Text style={styles.suggestionText}>
              Based on item values, they might need to add around ${getSuggestedCashAmount()} 
              to balance the trade.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.declineButton, (!selectedReason || loading) && styles.disabledButton]}
            onPress={handleDecline}
            disabled={!selectedReason || loading}
          >
            <Text style={styles.declineButtonText}>
              {loading ? 'Declining...' : 'Decline Offer'}
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
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  reasonsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  selectedReason: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reasonText: {
    marginLeft: 16,
    flex: 1,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedText: {
    color: '#FF6B6B',
  },
  reasonDescription: {
    fontSize: 14,
    color: '#666',
  },
  customMessageContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  customMessageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  customMessageInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: 'white',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  suggestionContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  declineButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  declineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
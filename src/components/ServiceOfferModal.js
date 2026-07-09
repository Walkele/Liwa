// Service Offer Modal Component
// Allows users to offer services for items (repair, delivery, installation, etc.)

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingButton from './LoadingButton';
import { ServiceOfferService } from '../services/ServiceOfferService';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function ServiceOfferModal({
  visible,
  onClose,
  item,
  user,
  navigation
}) {
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  const serviceTypes = Object.values(ServiceOfferService.SERVICE_TYPES);

  const resetForm = () => {
    setSelectedServiceType(null);
    setServiceTitle('');
    setServiceDescription('');
    setServicePrice('');
    setEstimatedTime('');
    setLocation('');
    setMessage('');
  };

  const handleServiceTypeSelect = (serviceType) => {
    setSelectedServiceType(serviceType);
    
    // Auto-fill title based on service type
    switch (serviceType.id) {
      case 'repair':
        setServiceTitle(`Repair ${item.title}`);
        setServiceDescription(`I can repair/fix your ${item.title}`);
        break;
      case 'delivery':
        setServiceTitle(`Deliver ${item.title}`);
        setServiceDescription(`I can deliver your ${item.title} to your location`);
        break;
      case 'installation':
        setServiceTitle(`Install ${item.title}`);
        setServiceDescription(`I can install/set up your ${item.title}`);
        break;
      case 'skill_exchange':
        setServiceTitle(`Skill Exchange for ${item.title}`);
        setServiceDescription(`I can teach/provide skills in exchange for your ${item.title}`);
        break;
      case 'custom':
        setServiceTitle(`Custom Service for ${item.title}`);
        setServiceDescription(`I can provide a custom service for your ${item.title}`);
        break;
    }
  };

  const handleSubmitServiceOffer = async () => {
    // Validation
    if (!selectedServiceType) {
      Alert.alert('Service Type Required', 'Please select a service type.');
      return;
    }

    if (!serviceTitle.trim()) {
      Alert.alert('Service Title Required', 'Please enter a service title.');
      return;
    }

    if (!serviceDescription.trim()) {
      Alert.alert('Service Description Required', 'Please describe your service.');
      return;
    }

    if (!servicePrice.trim() || isNaN(parseFloat(servicePrice))) {
      Alert.alert('Valid Price Required', 'Please enter a valid service price.');
      return;
    }

    if (!estimatedTime.trim()) {
      Alert.alert('Estimated Time Required', 'Please provide an estimated time for the service.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Location Required', 'Please specify where the service will be performed.');
      return;
    }

    await withLoading(
      async () => {
        const serviceDetails = {
          serviceType: selectedServiceType.id,
          serviceTitle: serviceTitle.trim(),
          serviceDescription: serviceDescription.trim(),
          servicePrice: parseFloat(servicePrice),
          estimatedTime: estimatedTime.trim(),
          location: location.trim(),
          message: message.trim() || `I'd like to offer my ${selectedServiceType.title.toLowerCase()} for your ${item.title}.`
        };

        const result = await ServiceOfferService.createServiceOffer(
          item.id,
          item.userId,
          user.uid,
          serviceDetails
        );

        showNotification({
          type: 'success',
          title: 'Service Offer Sent!',
          message: `Your ${selectedServiceType.title.toLowerCase()} offer has been sent to ${item.userName || 'the seller'}.`,
          autoHide: true,
          duration: 4000
        });

        // Navigate to the conversation
        navigation.navigate('Chat', {
          conversationId: result.conversationId,
          otherUserName: item.userName || 'Seller',
          itemTitle: item.title
        });

        resetForm();
        onClose();
      },
      {
        errorMessage: 'Failed to send service offer',
        showErrorNotification: true
      }
    );
  };

  const renderServiceTypeSelector = () => (
    <View style={styles.serviceTypesContainer}>
      <Text style={styles.sectionTitle}>Select Service Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {serviceTypes.map((serviceType) => (
          <TouchableOpacity
            key={serviceType.id}
            style={[
              styles.serviceTypeCard,
              selectedServiceType?.id === serviceType.id && {
                backgroundColor: serviceType.color,
                borderColor: serviceType.color
              }
            ]}
            onPress={() => handleServiceTypeSelect(serviceType)}
          >
            <Ionicons
              name={serviceType.icon}
              size={24}
              color={selectedServiceType?.id === serviceType.id ? 'white' : serviceType.color}
            />
            <Text
              style={[
                styles.serviceTypeTitle,
                selectedServiceType?.id === serviceType.id && { color: 'white' }
              ]}
            >
              {serviceType.title}
            </Text>
            <Text
              style={[
                styles.serviceTypeDescription,
                selectedServiceType?.id === serviceType.id && { color: 'rgba(255,255,255,0.8)' }
              ]}
            >
              {serviceType.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderServiceDetails = () => {
    if (!selectedServiceType) return null;

    return (
      <View style={styles.serviceDetailsContainer}>
        <Text style={styles.sectionTitle}>Service Details</Text>
        
        {/* Service Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Title *</Text>
          <TextInput
            style={styles.textInput}
            value={serviceTitle}
            onChangeText={setServiceTitle}
            placeholder={`e.g., Repair ${item.title}`}
            maxLength={100}
          />
        </View>

        {/* Service Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={serviceDescription}
            onChangeText={setServiceDescription}
            placeholder="Describe what you'll do and how you'll help..."
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Price and Time Row */}
        <View style={styles.rowContainer}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Service Price *</Text>
            <TextInput
              style={styles.textInput}
              value={servicePrice}
              onChangeText={setServicePrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Estimated Time *</Text>
            <TextInput
              style={styles.textInput}
              value={estimatedTime}
              onChangeText={setEstimatedTime}
              placeholder="e.g., 2 hours, 1 day"
              maxLength={50}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Location *</Text>
          <TextInput
            style={styles.textInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Where will the service be performed?"
            maxLength={100}
          />
        </View>

        {/* Additional Message */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Message (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Any additional details or questions..."
            multiline
            numberOfLines={2}
            maxLength={300}
          />
        </View>
      </View>
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Offer Service</Text>
            <Text style={styles.modalSubtitle}>
              Offer a service for "{item?.title}"
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {renderServiceTypeSelector()}
            {renderServiceDetails()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <LoadingButton
              title="Send Service Offer"
              onPress={handleSubmitServiceOffer}
              loading={loading}
              disabled={!selectedServiceType || !serviceTitle.trim()}
              variant="primary"
              icon="send"
              style={styles.sendButton}
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
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  serviceTypesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  serviceTypeCard: {
    width: 140,
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  serviceTypeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  serviceTypeDescription: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  serviceDetailsContainer: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  sendButton: {
    flex: 2,
  },
});

export { ServiceOfferModal };
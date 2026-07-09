import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemVerificationService } from '../services/ItemVerificationService';

const VerificationRequestModal = ({
  visible,
  onClose,
  itemId,
  itemCategory,
  onRequestSent
}) => {
  const [selectedPhotoTypes, setSelectedPhotoTypes] = useState([]);
  const [customRequest, setCustomRequest] = useState('');
  const [loading, setLoading] = useState(false);

  const requirements = ItemVerificationService.getVerificationRequirements(itemCategory);
  const photoTypes = ItemVerificationService.VERIFICATION_PHOTO_TYPES;

  const togglePhotoType = (typeId) => {
    if (selectedPhotoTypes.includes(typeId)) {
      setSelectedPhotoTypes(selectedPhotoTypes.filter(id => id !== typeId));
    } else {
      setSelectedPhotoTypes([...selectedPhotoTypes, typeId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPhotoTypes.length === 0 && !customRequest.trim()) {
      Alert.alert('Selection Required', 'Please select at least one photo type or enter a custom request');
      return;
    }

    try {
      setLoading(true);
      // This would be called with actual user data
      // await ItemVerificationService.requestVerificationPhotos(
      //   itemId,
      //   selectedPhotoTypes,
      //   userId,
      //   userName
      // );
      
      onRequestSent && onRequestSent({ photoTypes: selectedPhotoTypes, customRequest });
      onClose();
      Alert.alert('Request Sent', 'Verification photo request has been sent to the seller');
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send verification request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Request Verification Photos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Request specific photos to verify the item matches the description
          </Text>

          <ScrollView style={styles.scrollContent}>
            {/* Required Photos for Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Based on item category: {itemCategory || 'General'}
              </Text>
              
              {requirements.requiredPhotos.map(photoType => {
                const photoInfo = photoTypes[photoType];
                const isSelected = selectedPhotoTypes.includes(photoType);
                return (
                  <TouchableOpacity
                    key={photoType}
                    style={[
                      styles.photoOption,
                      isSelected && styles.selectedPhotoOption
                    ]}
                    onPress={() => togglePhotoType(photoType)}
                  >
                    <View style={styles.photoIndicator}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color="#CCC" />
                      )}
                    </View>
                    <View style={styles.photoInfo}>
                      <View style={styles.photoHeader}>
                        <Ionicons name={photoInfo.icon} size={18} color="#666" />
                        <Text style={styles.photoLabel}>{photoInfo.label}</Text>
                      </View>
                      <Text style={styles.photoDescription}>{photoInfo.description}</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Photos */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Optional Photos</Text>
              
              {requirements.optionalPhotos.map(photoType => {
                const photoInfo = photoTypes[photoType];
                const isSelected = selectedPhotoTypes.includes(photoType);
                return (
                  <TouchableOpacity
                    key={photoType}
                    style={[
                      styles.photoOption,
                      isSelected && styles.selectedPhotoOption
                    ]}
                    onPress={() => togglePhotoType(photoType)}
                  >
                    <View style={styles.photoIndicator}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color="#CCC" />
                      )}
                    </View>
                    <View style={styles.photoInfo}>
                      <View style={styles.photoHeader}>
                        <Ionicons name={photoInfo.icon} size={18} color="#666" />
                        <Text style={styles.photoLabel}>{photoInfo.label}</Text>
                      </View>
                      <Text style={styles.photoDescription}>{photoInfo.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Request */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Request</Text>
              <TextInput
                style={styles.customInput}
                placeholder="Request specific details or additional photos..."
                value={customRequest}
                onChangeText={setCustomRequest}
                multiline
                maxLength={300}
              />
            </View>

            {/* Best Practices Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#2196F3" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Best Practices</Text>
                <Text style={styles.infoText}>
                  • Request clear, well-lit photos
                </Text>
                <Text style={styles.infoText}>
                  • Ask for timestamped photos to ensure recent
                </Text>
                <Text style={styles.infoText}>
                  • Request photos with visible serial numbers
                </Text>
                <Text style={styles.infoText}>
                  • Ask for proof of possession if high-value item
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Sending...' : 'Send Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  content: {
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
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  photoOption: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPhotoOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  photoIndicator: {
    marginRight: 12,
  },
  photoInfo: {
    flex: 1,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  photoDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  requiredBadge: {
    alignSelf: 'flex-start',
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#0D47A1',
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default VerificationRequestModal;

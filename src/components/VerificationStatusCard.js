import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemVerificationService } from '../services/ItemVerificationService';

const VerificationStatusCard = ({
  itemId,
  itemCategory,
  verificationStatus,
  onRequestVerification
}) => {
  const getStatusInfo = () => {
    switch (verificationStatus) {
      case 'verified':
        return {
          icon: 'checkmark-circle',
          color: '#4CAF50',
          label: 'Verified',
          description: 'Item has been verified'
        };
      case 'partially_verified':
        return {
          icon: 'alert-circle',
          color: '#FF9800',
          label: 'Partially Verified',
          description: 'Some verification completed'
        };
      case 'pending':
        return {
          icon: 'time',
          color: '#2196F3',
          label: 'Verification Pending',
          description: 'Verification in progress'
        };
      default:
        return {
          icon: 'help-circle',
          color: '#999',
          label: 'Not Verified',
          description: 'Request verification to build trust'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const requirements = ItemVerificationService.getVerificationRequirements(itemCategory);

  return (
    <View style={styles.container}>
      <View style={styles.statusHeader}>
        <View style={styles.statusIconContainer}>
          <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
        </View>
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusLabel}>{statusInfo.label}</Text>
          <Text style={styles.statusDescription}>{statusInfo.description}</Text>
        </View>
      </View>

      {verificationStatus !== 'verified' && (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={onRequestVerification}
        >
          <Ionicons name="camera-outline" size={18} color="#666" />
          <Text style={styles.requestButtonText}>
            Request Verification Photos
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.requirementsSection}>
        <Text style={styles.requirementsTitle}>
          Category Requirements: {itemCategory || 'General'}
        </Text>
        <View style={styles.requirementsList}>
          <View style={styles.requirementItem}>
            <Ionicons name="pricetag-outline" size={16} color="#666" />
            <Text style={styles.requirementText}>
              {requirements.requiredPhotos.length} required photos
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="extension-puzzle-outline" size={16} color="#666" />
            <Text style={styles.requirementText}>
              {requirements.optionalPhotos.length} optional photos
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.requirementText}>
              {requirements.requiredFields.length} required fields
            </Text>
          </View>
        </View>
      </View>

      {verificationStatus === 'verified' && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
          <Text style={styles.verifiedText}>
            Trusted seller with verified items
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  requirementsSection: {
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
});

export default VerificationStatusCard;

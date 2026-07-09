import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfferStatus } from '../hooks/useOfferStatus';
import { OfferStateSyncService } from '../services/OfferStateSyncService';
import { AdvancedOfferManagementService } from '../services/AdvancedOfferManagementService';

export default function SmartOfferButton({ 
  item, 
  onMakeOffer, 
  onMakeBetterOffer, 
  onWithdrawOffer,
  onAcceptOffer,
  onRejectOffer,
  style 
}) {
  const { offerStatus, uiState, loading, refreshStatus, isOwner } = useOfferStatus(item.id, item.userId);
  const [actionLoading, setActionLoading] = useState(false);

  const handleMakeOffer = () => {
    if (onMakeOffer) {
      onMakeOffer(item);
    }
  };

  const handleMakeBetterOffer = () => {
    if (onMakeBetterOffer) {
      onMakeBetterOffer(item, offerStatus.lastOffer);
    }
  };

  const handleWithdrawOffer = async () => {
    try {
      setActionLoading(true);
      
      Alert.alert(
        'Withdraw Offer',
        'Are you sure you want to withdraw your offer?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: async () => {
              try {
                await AdvancedOfferManagementService.withdrawOffer(
                  offerStatus.lastOffer.id,
                  offerStatus.lastOffer.buyerId
                );
                
                await refreshStatus();
                
                if (onWithdrawOffer) {
                  onWithdrawOffer(offerStatus.lastOffer);
                }
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      setActionLoading(true);
      
      Alert.alert(
        'Accept Offer',
        'Accept this offer and proceed with the trade?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                await AdvancedOfferManagementService.acceptOffer(
                  offerStatus.lastOffer.id,
                  item.userId
                );
                
                await refreshStatus();
                
                if (onAcceptOffer) {
                  onAcceptOffer(offerStatus.lastOffer);
                }
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOffer = () => {
    Alert.prompt(
      'Reject Offer',
      'Would you like to provide a reason? This helps the buyer make a better offer.',
      async (reason) => {
        try {
          setActionLoading(true);
          
          await AdvancedOfferManagementService.rejectOffer(
            offerStatus.lastOffer.id,
            item.userId,
            reason || ''
          );
          
          await refreshStatus();
          
          if (onRejectOffer) {
            onRejectOffer(offerStatus.lastOffer, reason);
          }
        } catch (error) {
          Alert.alert('Error', error.message);
        } finally {
          setActionLoading(false);
        }
      },
      'plain-text',
      '',
      'default'
    );
  };

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton, style]} disabled>
        <ActivityIndicator size="small" color="#FFF" />
        <Text style={styles.buttonText}>Loading...</Text>
      </TouchableOpacity>
    );
  }

  if (!uiState) {
    return null;
  }

  // Owner (Seller) UI
  if (isOwner) {
    if (uiState.showAcceptReject && offerStatus?.hasOffer) {
      return (
        <View style={[styles.buttonContainer, style]}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={handleRejectOffer}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="close" size={16} color="#FFF" />
                <Text style={styles.buttonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAcceptOffer}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.buttonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: uiState.buttonColor }, style]} 
        disabled
      >
        <Text style={styles.buttonText}>{uiState.buttonText}</Text>
      </TouchableOpacity>
    );
  }

  // Buyer UI
  const getButtonAction = () => {
    if (uiState.showMakeOffer) return handleMakeOffer;
    if (uiState.showBetterOffer) return handleMakeBetterOffer;
    if (uiState.showWithdraw) return handleWithdrawOffer;
    return null;
  };

  const buttonAction = getButtonAction();
  const isDisabled = !buttonAction || actionLoading || uiState.buttonColor === '#CCC';

  return (
    <View style={style}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: uiState.buttonColor },
          isDisabled && styles.disabledButton
        ]}
        onPress={buttonAction}
        disabled={isDisabled}
      >
        {actionLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            {uiState.showMakeOffer && <Ionicons name="add" size={16} color="#FFF" />}
            {uiState.showBetterOffer && <Ionicons name="trending-up" size={16} color="#FFF" />}
            {uiState.showWithdraw && <Ionicons name="arrow-back" size={16} color="#FFF" />}
            <Text style={styles.buttonText}>{uiState.buttonText}</Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* Status indicator */}
      {uiState.statusText && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: uiState.statusColor }]} />
          <Text style={[styles.statusText, { color: uiState.statusColor }]}>
            {uiState.statusText}
          </Text>
        </View>
      )}
      
      {/* Rejection reason */}
      {uiState.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Ionicons name="information-circle" size={14} color="#F44336" />
          <Text style={styles.rejectionText}>{uiState.rejectionReason}</Text>
        </View>
      )}
      
      {/* Throttle warning */}
      {offerStatus?.rejectionCount >= 2 && offerStatus?.status === 'rejected' && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={14} color="#FF9800" />
          <Text style={styles.warningText}>
            {offerStatus.rejectionCount === 2 
              ? 'Last chance! One more rejection = 24h throttle'
              : 'Throttled for 24 hours after 3 rejections'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    gap: 8
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1
  },
  loadingButton: {
    backgroundColor: '#CCC'
  },
  acceptButton: {
    backgroundColor: '#4CAF50'
  },
  rejectButton: {
    backgroundColor: '#F44336'
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'center'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500'
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: 4
  },
  rejectionText: {
    fontSize: 11,
    color: '#F44336',
    marginLeft: 4,
    flex: 1
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 4
  },
  warningText: {
    fontSize: 11,
    color: '#FF9800',
    marginLeft: 4,
    flex: 1
  }
});
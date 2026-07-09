import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdvancedOfferManagementService } from '../services/AdvancedOfferManagementService';

export default function AdvancedOfferCard({ 
  offer, 
  currentUserId, 
  onOfferUpdate,
  isLatestOffer = false 
}) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const isBuyer = offer.buyerId === currentUserId;
  const isSeller = offer.sellerId === currentUserId;
  const isSystemMessage = offer.senderId === 'system';

  const getStatusColor = () => {
    switch (offer.status) {
      case 'pending': return '#FF6B6B';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'expired': return '#9E9E9E';
      case 'withdrawn': return '#FF9800';
      case 'voided': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusIcon = () => {
    switch (offer.status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'expired': return 'hourglass-outline';
      case 'withdrawn': return 'arrow-back-circle';
      case 'voided': return 'ban-outline';
      default: return 'help-circle-outline';
    }
  };

  const getStatusText = () => {
    switch (offer.status) {
      case 'pending': return 'Pending Response';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      case 'withdrawn': return 'Withdrawn';
      case 'voided': return 'No Longer Available';
      default: return 'Unknown';
    }
  };

  const handleAcceptOffer = async () => {
    try {
      setActionLoading('accept');
      const result = await AdvancedOfferManagementService.acceptOffer(offer.id, currentUserId);
      
      if (result.success) {
        Alert.alert(
          'Offer Accepted! 🎉',
          `You've accepted this offer. ${result.voidedOffersCount > 0 ? `${result.voidedOffersCount} other offers have been automatically declined.` : ''}`,
          [{ text: 'Great!', onPress: () => onOfferUpdate?.(result.offer) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleRejectOffer = () => {
    Alert.prompt(
      'Reject Offer',
      'Would you like to provide a reason? This helps the buyer make a better offer.',
      async (reason) => {
        try {
          setActionLoading('reject');
          const result = await AdvancedOfferManagementService.rejectOffer(
            offer.id, 
            currentUserId, 
            reason || ''
          );
          
          if (result.success) {
            const message = result.canMakeBetterOffer 
              ? 'Offer rejected. The buyer can now send a better offer.'
              : 'Offer rejected. The buyer has reached the maximum number of attempts.';
            
            Alert.alert('Offer Rejected', message, [
              { text: 'OK', onPress: () => onOfferUpdate?.(result.offer) }
            ]);
          }
        } catch (error) {
          Alert.alert('Error', error.message);
        } finally {
          setActionLoading('');
        }
      },
      'plain-text',
      '',
      'default'
    );
  };

  const handleWithdrawOffer = () => {
    Alert.alert(
      'Withdraw Offer',
      'Are you sure you want to withdraw this offer? You can submit a new one immediately after.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('withdraw');
              const result = await AdvancedOfferManagementService.withdrawOffer(offer.id, currentUserId);
              
              if (result.success) {
                Alert.alert('Offer Withdrawn', 'Your offer has been withdrawn.', [
                  { text: 'OK', onPress: () => onOfferUpdate?.(result.offer) }
                ]);
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setActionLoading('');
            }
          }
        }
      ]
    );
  };

  const renderOfferItems = () => {
    if (!offer.offeredItems || offer.offeredItems.length === 0) {
      return null;
    }

    return (
      <View style={styles.offeredItemsContainer}>
        <Text style={styles.offeredItemsLabel}>Offered Items:</Text>
        {offer.offeredItems.map((item, index) => (
          <View key={index} style={styles.offeredItem}>
            <Text style={styles.offeredItemTitle}>{item.title}</Text>
            {item.estimatedValue > 0 && (
              <Text style={styles.offeredItemValue}>~${item.estimatedValue}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderActionButtons = () => {
    if (offer.status !== 'pending' || !isLatestOffer) {
      return null;
    }

    if (isSeller) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleRejectOffer}
            disabled={actionLoading !== ''}
          >
            {actionLoading === 'reject' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="close" size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAcceptOffer}
            disabled={actionLoading !== ''}
          >
            {actionLoading === 'accept' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (isBuyer) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.withdrawButton]}
            onPress={handleWithdrawOffer}
            disabled={actionLoading !== ''}
          >
            {actionLoading === 'withdraw' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="arrow-back" size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderRejectionInfo = () => {
    if (offer.status !== 'rejected' || !offer.rejectionReason) {
      return null;
    }

    return (
      <View style={styles.rejectionInfo}>
        <Ionicons name="information-circle" size={16} color="#F44336" />
        <Text style={styles.rejectionReason}>{offer.rejectionReason}</Text>
      </View>
    );
  };

  const renderThrottleWarning = () => {
    if (offer.status !== 'rejected' || !isBuyer) {
      return null;
    }

    const rejectionCount = offer.rejectionCount || 0;
    const remainingAttempts = AdvancedOfferManagementService.REJECTION_LIMIT - rejectionCount;

    if (remainingAttempts <= 1) {
      return (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color="#FF9800" />
          <Text style={styles.warningText}>
            {remainingAttempts === 1 
              ? 'Last chance! One more rejection will throttle you for 24 hours.'
              : 'You\'ve been throttled from making offers for 24 hours.'}
          </Text>
        </View>
      );
    }

    return null;
  };

  const cardStyle = [
    styles.offerCard,
    !isLatestOffer && styles.historicalOffer,
    offer.status === 'rejected' && styles.rejectedOffer,
    offer.status === 'accepted' && styles.acceptedOffer,
    offer.status === 'voided' && styles.voidedOffer
  ];

  return (
    <View style={cardStyle}>
      {/* Header */}
      <View style={styles.offerHeader}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon()} 
            size={16} 
            color={getStatusColor()} 
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        {isLatestOffer && offer.status === 'pending' && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Offer Details */}
      <View style={styles.offerContent}>
        {offer.cashAmount > 0 && (
          <View style={styles.cashOffer}>
            <Ionicons name="cash-outline" size={20} color="#4CAF50" />
            <Text style={styles.cashAmount}>${offer.cashAmount}</Text>
          </View>
        )}
        
        {renderOfferItems()}
        
        {offer.offerValue > 0 && (
          <View style={styles.totalValue}>
            <Text style={styles.totalValueLabel}>Total Value:</Text>
            <Text style={styles.totalValueAmount}>${offer.offerValue}</Text>
          </View>
        )}
      </View>

      {/* Additional Info */}
      {renderRejectionInfo()}
      {renderThrottleWarning()}

      {/* Timestamps */}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>
          {offer.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
        </Text>
        {offer.expiresAt && offer.status === 'pending' && (
          <Text style={styles.expiryText}>
            Expires: {offer.expiresAt.toDate?.()?.toLocaleDateString() || 'Soon'}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      {renderActionButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  offerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B'
  },
  historicalOffer: {
    opacity: 0.7,
    borderLeftColor: '#CCC'
  },
  rejectedOffer: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE'
  },
  acceptedOffer: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E8'
  },
  voidedOffer: {
    borderLeftColor: '#9E9E9E',
    backgroundColor: '#F5F5F5'
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  liveBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  offerContent: {
    marginBottom: 12
  },
  cashOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  cashAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8
  },
  offeredItemsContainer: {
    marginBottom: 8
  },
  offeredItemsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  offeredItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2
  },
  offeredItemTitle: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  offeredItemValue: {
    fontSize: 12,
    color: '#666'
  },
  totalValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  totalValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B'
  },
  rejectionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8
  },
  rejectionReason: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 6,
    flex: 1
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 6,
    flex: 1
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  timestamp: {
    fontSize: 11,
    color: '#999'
  },
  expiryText: {
    fontSize: 11,
    color: '#FF9800'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4
  },
  acceptButton: {
    backgroundColor: '#4CAF50'
  },
  rejectButton: {
    backgroundColor: '#F44336'
  },
  withdrawButton: {
    backgroundColor: '#FF9800'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  }
});
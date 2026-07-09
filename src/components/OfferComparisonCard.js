import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OfferComparisonService } from '../services/OfferComparisonService';

const OfferComparisonCard = ({ itemId, currentUserId, onSelectOffer }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      const data = await OfferComparisonService.getOfferComparisonData(currentUserId, itemId);
      setComparisonData(data);
      setVisible(true);
    } catch (error) {
      console.error('Error loading comparison data:', error);
      Alert.alert('Error', 'Failed to load offer comparison');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleOfferSelect = (offer) => {
    if (comparisonData.availability.softLocked && !offer.isCompetingOffer) {
      Alert.alert(
        'Item Soft-Locked',
        'This item is currently in negotiation. Making an offer will apply a -2 trust score penalty.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              onSelectOffer(offer, comparisonData.availability.penalty);
              setVisible(false);
            }
          }
        ]
      );
    } else {
      onSelectOffer(offer, null);
      setVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.comparisonButton}
        onPress={loadComparisonData}
        disabled={loading}
      >
        <Ionicons name="list-outline" size={20} color="#666" />
        <Text style={styles.comparisonButtonText}>
          {loading ? 'Loading...' : 'View All Offers'}
        </Text>
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>
            {comparisonData?.offerCount || 0}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Offer Comparison</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {comparisonData?.availability.softLocked && (
              <View style={styles.softLockWarning}>
                <Ionicons name="lock-closed" size={20} color="#FF9800" />
                <View style={styles.softLockTextContainer}>
                  <Text style={styles.softLockTitle}>Item is Soft-Locked</Text>
                  <Text style={styles.softLockDescription}>
                    Currently negotiating with another user. New offers have -2 trust score penalty.
                  </Text>
                </View>
              </View>
            )}

            <ScrollView style={styles.offersList}>
              {comparisonData?.offers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>No offers yet</Text>
                </View>
              ) : (
                comparisonData?.offers.map((offer, index) => (
                  <TouchableOpacity
                    key={offer.id}
                    style={[
                      styles.offerCard,
                      index === 0 && styles.topOfferCard,
                      offer.senderId === currentUserId && styles.userOfferCard
                    ]}
                    onPress={() => handleOfferSelect(offer)}
                  >
                    <View style={styles.offerHeader}>
                      <View style={styles.offerRank}>
                        <Text style={styles.offerRankText}>#{index + 1}</Text>
                      </View>
                      {index === 0 && (
                        <View style={styles.topOfferBadge}>
                          <Ionicons name="trophy" size={16} color="#FFD700" />
                          <Text style={styles.topOfferText}>Top Offer</Text>
                        </View>
                      )}
                      {offer.senderId === currentUserId && (
                        <View style={styles.userOfferBadge}>
                          <Text style={styles.userOfferText}>Your Offer</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.offerDetails}>
                      {offer.cashAmount && (
                        <View style={styles.offerDetailRow}>
                          <Ionicons name="cash-outline" size={16} color="#4CAF50" />
                          <Text style={styles.offerDetailText}>
                            {formatCurrency(offer.cashAmount)}
                          </Text>
                        </View>
                      )}
                      
                      {offer.offerType === 'item' && (
                        <View style={styles.offerDetailRow}>
                          <Ionicons name="cube-outline" size={16} color="#2196F3" />
                          <Text style={styles.offerDetailText}>
                            Item Trade (~{formatCurrency(offer.estimatedValue || 0)})
                          </Text>
                        </View>
                      )}

                      {offer.isCompetingOffer && (
                        <View style={styles.competingBadge}>
                          <Ionicons name="swap-horizontal" size={14} color="#FF6B6B" />
                          <Text style={styles.competingText}>Competing Offer</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.offerFooter}>
                      <Text style={styles.offerSender}>
                        {offer.senderName || 'Anonymous'}
                      </Text>
                      <Text style={styles.offerDate}>
                        {offer.createdAt?.toDate?.().toLocaleDateString() || 'Recent'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  comparisonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  comparisonButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  offerBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offerBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  softLockWarning: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF3E0',
    margin: 16,
    borderRadius: 8,
  },
  softLockTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  softLockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 4,
  },
  softLockDescription: {
    fontSize: 12,
    color: '#8D6E63',
  },
  offersList: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  offerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  topOfferCard: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  userOfferCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  topOfferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  topOfferText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  userOfferBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userOfferText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  offerDetails: {
    marginBottom: 12,
  },
  offerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerDetailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  competingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  competingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 4,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerSender: {
    fontSize: 13,
    color: '#666',
  },
  offerDate: {
    fontSize: 12,
    color: '#999',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

export default OfferComparisonCard;

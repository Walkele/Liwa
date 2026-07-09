import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { OfferManagementService } from '../services/OfferManagementService';
import { LifecycleBadge } from '../components/LifecycleBadge';

export default function OfferComparisonScreen({ route, navigation }) {
  const { itemId, itemTitle } = route.params;
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    loadOffers();
  }, [itemId]);

  const loadOffers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('📋 Loading offers for item:', itemId);
      
      // Load offers without conversation details first for faster initial load
      const itemOffers = await OfferManagementService.getItemOffers(itemId, false);
      setOffers(itemOffers);
      console.log(`✅ Loaded ${itemOffers.length} offers`);
      
      // Then load conversation details in background if needed
      if (itemOffers.length > 0) {
        setTimeout(async () => {
          try {
            const offersWithConversations = await OfferManagementService.getItemOffers(itemId, true);
            setOffers(offersWithConversations);
            console.log(`✅ Updated with conversation details`);
          } catch (error) {
            console.log('⚠️ Could not load conversation details:', error.message);
          }
        }, 100);
      }
      
    } catch (error) {
      console.error('❌ Error loading offers:', error);
      Alert.alert('Error', 'Failed to load offers. Please try again.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleAcceptOffer = async (offer) => {
    Alert.alert(
      'Accept Offer',
      `Are you sure you want to accept this ${offer.type} offer? This will automatically reject all other pending offers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              
              const result = await OfferManagementService.acceptOffer(
                offer.id,
                offer.type,
                user.uid,
                itemId
              );
              
              Alert.alert(
                'Offer Accepted!',
                `You accepted the ${offer.type} offer. ${result.rejectedOffers} other offers were automatically rejected.`,
                [
                  {
                    text: 'Go to Chat',
                    onPress: () => {
                      navigation.navigate('Chat', {
                        conversationId: offer.conversationId,
                        otherUserId: offer.userId || offer.proposerUserId,
                        otherUserName: offer.userName || offer.proposerUserName || 'User',
                        itemTitle: offer.itemTitle || 'Item'
                      });
                    }
                  },
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
              
            } catch (error) {
              console.error('❌ Error accepting offer:', error);
              Alert.alert('Error', 'Failed to accept offer: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectOffer = async (offer) => {
    Alert.alert(
      'Reject Offer',
      `Are you sure you want to reject this ${offer.type} offer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfferManagementService.rejectOffer(
                offer.id,
                offer.type,
                user.uid,
                'declined'
              );
              
              // Refresh offers list
              await loadOffers();
              
              Alert.alert('Offer Rejected', 'The offer has been rejected.');
              
            } catch (error) {
              console.error('❌ Error rejecting offer:', error);
              Alert.alert('Error', 'Failed to reject offer: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const openConversation = (offer) => {
    if (offer.conversationId) {
      navigation.navigate('Chat', {
        conversationId: offer.conversationId,
        otherUserId: offer.userId || offer.proposerUserId,
        otherUserName: offer.userName || offer.proposerUserName || 'User',
        itemTitle: offer.itemTitle || 'Item'
      });
    }
  };

  const formatOfferValue = (offer) => {
    if (offer.type === 'cash') {
      return `$${offer.amount}`;
    } else {
      return `${offer.proposerItemTitle} ($${offer.proposerItemPrice || 0})`;
    }
  };

  const getOfferStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const renderOfferCard = (offer, index) => {
    const isSelected = selectedOffer === offer.id;
    const statusColor = getOfferStatusColor(offer.status);
    const canInteract = offer.status === 'pending';

    return (
      <TouchableOpacity
        key={offer.id}
        style={[
          styles.offerCard,
          isSelected && styles.selectedOfferCard,
          !canInteract && styles.disabledOfferCard
        ]}
        onPress={() => setSelectedOffer(isSelected ? null : offer.id)}
      >
        <View style={styles.offerHeader}>
          <View style={styles.offerTypeContainer}>
            <Ionicons 
              name={offer.type === 'cash' ? 'cash' : 'swap-horizontal'} 
              size={20} 
              color={offer.type === 'cash' ? '#4CAF50' : '#2196F3'} 
            />
            <Text style={styles.offerType}>
              {offer.type === 'cash' ? 'Cash Offer' : 'Trade Offer'}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{offer.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.offerValue}>
          <Text style={styles.valueLabel}>Offer Value:</Text>
          <Text style={styles.valueAmount}>{formatOfferValue(offer)}</Text>
        </View>

        <View style={styles.offerDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.detailText}>
              From: {offer.userName || offer.proposerUserName || 'Unknown User'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.detailText}>
              {new Date(offer.createdAt?.toDate?.() || offer.createdAt).toLocaleDateString()}
            </Text>
          </View>
          
          {offer.messageCount > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="chatbubble" size={16} color="#666" />
              <Text style={styles.detailText}>
                {offer.messageCount} messages
              </Text>
            </View>
          )}
        </View>

        {offer.type === 'trade' && offer.proposerItemId && (
          <View style={styles.tradeItemPreview}>
            <Text style={styles.tradeItemLabel}>Their Item:</Text>
            <View style={styles.tradeItemInfo}>
              <View style={styles.tradeItemImage}>
                <Ionicons name="image-outline" size={24} color="#ccc" />
              </View>
              <View style={styles.tradeItemDetails}>
                <Text style={styles.tradeItemTitle} numberOfLines={1}>
                  {offer.proposerItemTitle}
                </Text>
                <Text style={styles.tradeItemPrice}>
                  ${offer.proposerItemPrice || 0}
                </Text>
              </View>
            </View>
          </View>
        )}

        {isSelected && canInteract && (
          <View style={styles.offerActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptOffer(offer)}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectOffer(offer)}
            >
              <Ionicons name="close" size={20} color="white" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
            
            {offer.conversationId && (
              <TouchableOpacity
                style={[styles.actionButton, styles.chatButton]}
                onPress={() => openConversation(offer)}
              >
                <Ionicons name="chatbubble" size={20} color="white" />
                <Text style={styles.actionButtonText}>Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isSelected && !canInteract && (
          <View style={styles.offerStatusInfo}>
            <Text style={styles.statusInfoText}>
              {offer.status === 'accepted' ? 
                '✅ This offer has been accepted' : 
                '❌ This offer has been rejected'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const pendingOffers = offers.filter(offer => offer.status === 'pending');
  const processedOffers = offers.filter(offer => offer.status !== 'pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offers</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Offers</Text>
        <TouchableOpacity onPress={() => loadOffers(true)}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOffers(true)}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{itemTitle}</Text>
          <Text style={styles.offerSummary}>
            {offers.length} total offers • {pendingOffers.length} pending
          </Text>
        </View>

        {pendingOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📋 Pending Offers ({pendingOffers.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Tap an offer to see actions. Accepting one will reject all others.
            </Text>
            {pendingOffers.map((offer, index) => renderOfferCard(offer, index))}
          </View>
        )}

        {processedOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📁 Previous Offers ({processedOffers.length})
            </Text>
            {processedOffers.map((offer, index) => renderOfferCard(offer, index))}
          </View>
        )}

        {offers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Offers Yet</Text>
            <Text style={styles.emptySubtext}>
              When people make offers on your item, they'll appear here for comparison.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  itemHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  offerSummary: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  offerCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOfferCard: {
    borderColor: '#FF6B6B',
    backgroundColor: '#fff5f5',
  },
  disabledOfferCard: {
    opacity: 0.7,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  offerValue: {
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  offerDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  tradeItemPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tradeItemLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  tradeItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tradeItemImage: {
    width: 40,
    height: 40,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeItemDetails: {
    flex: 1,
  },
  tradeItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  tradeItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  chatButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  offerStatusInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  statusInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
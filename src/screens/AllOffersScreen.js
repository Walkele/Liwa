import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useTrade } from '../context/TradeContext';
import { OfferManagementService } from '../services/OfferManagementService';
import LoadingButton from '../components/LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function AllOffersScreen({ navigation }) {
  const { user } = useAuth();
  const { acceptTradeProposal } = useTrade();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'cash', 'trade', 'service'
  const [searchQuery, setSearchQuery] = useState('');
  const { loading: actionLoading, withLoading } = useLoadingState();
  const { showSuccess, showError, showNotification } = useNotification();

  useEffect(() => {
    if (!user) return;
    if (selectedTab === 'items') {
      loadAvailableItems();
    } else {
      loadOffers();
    }
  }, [user, selectedTab]);

  const loadAvailableItems = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Query for available items that are not from the current user
      let itemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
        const availableItems = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'item',
          ...doc.data()
        })).filter(item => 
          // Don't show user's own items
          item.userId !== user.uid
        );

        const filteredItems = filterOffers(availableItems);
        setOffers(filteredItems);
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading available items:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOffers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Query for all pending offers that are not from the current user
      let offersQuery = query(
        collection(db, 'offers'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      // For trade proposals, query separately
      let tradeProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribeOffers = onSnapshot(offersQuery, (snapshot) => {
        const cashOffers = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'cash',
          ...doc.data()
        })).filter(offer => {
          // Show offers where current user is the SELLER (can accept offers for their items)
          // OR where current user is NOT involved (can make offers on other items)
          return offer.sellerId === user.uid || 
                 (offer.buyerId !== user.uid && offer.sellerId !== user.uid);
        });

        const unsubscribeTrades = onSnapshot(tradeProposalsQuery, (tradeSnapshot) => {
          const tradeOffers = tradeSnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'trade',
            ...doc.data()
          })).filter(trade => {
            // Show trade proposals where current user is the TARGET (can accept)
            // OR where current user is NOT involved (can see available trades)
            return trade.targetUserId === user.uid || 
                   (trade.proposerUserId !== user.uid && trade.targetUserId !== user.uid);
          });

          // Combine and filter offers
          const allOffers = [...cashOffers, ...tradeOffers];
          const filteredOffers = filterOffers(allOffers);
          
          setOffers(filteredOffers);
          setLoading(false);
          setRefreshing(false);
        });

        return () => {
          unsubscribeTrades();
        };
      });

      return unsubscribeOffers;
    } catch (error) {
      console.error('Error loading offers:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterOffers = (allOffers) => {
    let filtered = allOffers;

    // Filter by tab
    if (selectedTab === 'cash') {
      filtered = filtered.filter(offer => offer.type === 'cash');
    } else if (selectedTab === 'trade') {
      filtered = filtered.filter(offer => offer.type === 'trade');
    } else if (selectedTab === 'service') {
      filtered = filtered.filter(offer => 
        offer.type === 'cash' && offer.offerType === 'service'
      );
    } else if (selectedTab === 'items') {
      filtered = filtered.filter(offer => offer.type === 'item');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.itemTitle?.toLowerCase().includes(query) ||
        offer.title?.toLowerCase().includes(query) ||
        offer.proposerItemTitle?.toLowerCase().includes(query) ||
        offer.targetItemTitle?.toLowerCase().includes(query) ||
        offer.buyerName?.toLowerCase().includes(query) ||
        offer.userName?.toLowerCase().includes(query) ||
        offer.message?.toLowerCase().includes(query) ||
        offer.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const handleAcceptCashOffer = async (offer) => {
    showNotification({
      type: 'warning',
      title: 'Accept Cash Offer',
      message: `Accept $${offer.offerAmount} for "${offer.itemTitle}"?`,
      autoHide: false,
      actions: [
        { title: 'Cancel', onPress: () => {}, style: 'secondary' },
        { title: 'Accept', onPress: () => executeAcceptCashOffer(offer), style: 'primary' }
      ]
    });
  };

  const executeAcceptCashOffer = async (offer) => {
    await withLoading(
      async () => {
        await OfferManagementService.acceptOffer(offer.id, user.uid);
        
        // Remove from list
        setOffers(prev => prev.filter(o => o.id !== offer.id));
      },
      {
        successMessage: `Accepted $${offer.offerAmount} offer for "${offer.itemTitle}"`,
        errorMessage: 'Failed to accept offer',
        showSuccessNotification: true
      }
    );
  };

  const handleAcceptTradeOffer = async (offer) => {
    showNotification({
      type: 'warning',
      title: 'Accept Trade Offer',
      message: `Accept trade: "${offer.proposerItemTitle}" for "${offer.targetItemTitle}"?`,
      autoHide: false,
      actions: [
        { title: 'Cancel', onPress: () => {}, style: 'secondary' },
        { title: 'Accept', onPress: () => executeAcceptTradeOffer(offer), style: 'primary' }
      ]
    });
  };

  const executeAcceptTradeOffer = async (offer) => {
    await withLoading(
      async () => {
        // Accept the trade proposal using the trade context
        await acceptTradeProposal(offer.id);
        
        // Remove from list
        setOffers(prev => prev.filter(o => o.id !== offer.id));
      },
      {
        successMessage: `Accepted trade: "${offer.proposerItemTitle}" ↔ "${offer.targetItemTitle}"`,
        errorMessage: 'Failed to accept trade',
        showSuccessNotification: true
      }
    );
  };

  const handleDeclineOffer = async (offer) => {
    showNotification({
      type: 'warning',
      title: 'Decline Offer',
      message: `Decline this ${offer.type} offer?`,
      autoHide: false,
      actions: [
        { title: 'Cancel', onPress: () => {}, style: 'secondary' },
        { title: 'Decline', onPress: () => executeDeclineOffer(offer), style: 'primary' }
      ]
    });
  };

  const executeDeclineOffer = async (offer) => {
    await withLoading(
      async () => {
        if (offer.type === 'cash') {
          await OfferManagementService.rejectOffer(offer.id, user.uid, 'Not interested');
        } else {
          // Handle trade proposal rejection
          console.log('Declining trade offer:', offer.id);
        }
        
        // Remove from list
        setOffers(prev => prev.filter(o => o.id !== offer.id));
      },
      {
        successMessage: 'Offer declined',
        errorMessage: 'Failed to decline offer',
        showSuccessNotification: true
      }
    );
  };

  const renderCashOffer = (offer) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerTypeIndicator}>
          <Ionicons name="cash" size={16} color="#4CAF50" />
          <Text style={styles.offerTypeText}>Cash Offer</Text>
        </View>
        <Text style={styles.offerAmount}>${offer.offerAmount}</Text>
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemImageContainer}>
          {offer.itemImages && offer.itemImages.length > 0 ? (
            <Image source={{ uri: offer.itemImages[0] }} style={styles.itemImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={30} color="#ccc" />
            </View>
          )}
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle}>{offer.itemTitle}</Text>
          <Text style={styles.originalPrice}>Original Price: ${offer.originalPrice}</Text>
          <Text style={styles.buyerName}>From: {offer.buyerName}</Text>
          {offer.message && (
            <Text style={styles.offerMessage}>"{offer.message}"</Text>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <LoadingButton
          title="Accept"
          onPress={() => handleAcceptCashOffer(offer)}
          loading={actionLoading}
          variant="success"
          icon="checkmark"
          style={styles.acceptButton}
        />
        <LoadingButton
          title="Decline"
          onPress={() => handleDeclineOffer(offer)}
          loading={actionLoading}
          variant="danger"
          icon="close"
          style={styles.declineButton}
        />
      </View>
    </View>
  );

  const renderTradeOffer = (offer) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerTypeIndicator}>
          <Ionicons name="swap-horizontal" size={16} color="#FF9800" />
          <Text style={styles.offerTypeText}>Trade Offer</Text>
        </View>
      </View>

      <View style={styles.tradeInfo}>
        <View style={styles.tradeItem}>
          <Text style={styles.tradeLabel}>They Offer:</Text>
          <Text style={styles.tradeItemTitle}>{offer.proposerItemTitle}</Text>
        </View>
        
        <Ionicons name="swap-horizontal" size={24} color="#FF6B6B" style={styles.swapIcon} />
        
        <View style={styles.tradeItem}>
          <Text style={styles.tradeLabel}>For Your:</Text>
          <Text style={styles.tradeItemTitle}>{offer.targetItemTitle}</Text>
        </View>
      </View>

      <Text style={styles.proposerName}>From: {offer.proposerName || 'Unknown User'}</Text>

      <View style={styles.actionButtons}>
        <LoadingButton
          title="Accept Trade"
          onPress={() => handleAcceptTradeOffer(offer)}
          loading={actionLoading}
          variant="success"
          icon="checkmark"
          style={styles.acceptButton}
        />
        <LoadingButton
          title="Decline"
          onPress={() => handleDeclineOffer(offer)}
          loading={actionLoading}
          variant="danger"
          icon="close"
          style={styles.declineButton}
        />
      </View>
    </View>
  );

  const renderAvailableItem = (item) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerTypeIndicator}>
          <Ionicons name="storefront" size={16} color="#4CAF50" />
          <Text style={styles.offerTypeText}>Available Item</Text>
        </View>
        <Text style={styles.offerAmount}>${item.price}</Text>
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={30} color="#ccc" />
            </View>
          )}
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.originalPrice}>Price: ${item.price}</Text>
          <Text style={styles.buyerName}>By: {item.userName || 'Unknown User'}</Text>
          {item.description && (
            <Text style={styles.offerMessage} numberOfLines={2}>"{item.description}"</Text>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <LoadingButton
          title="View Details"
          onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
          loading={actionLoading}
          variant="secondary"
          icon="eye"
          style={styles.viewButton}
        />
        <LoadingButton
          title="Make Offer"
          onPress={() => navigation.navigate('ItemDetails', { 
            itemId: item.id, 
            showOfferModal: true 
          })}
          loading={actionLoading}
          variant="primary"
          icon="cash"
          style={styles.offerButton}
        />
      </View>
    </View>
  );

  const renderOffer = ({ item }) => {
    if (item.type === 'item') {
      return renderAvailableItem(item);
    } else if (item.type === 'cash') {
      return renderCashOffer(item);
    } else if (item.type === 'trade') {
      return renderTradeOffer(item);
    }
    return null;
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'all', title: 'All Offers', icon: 'list' },
        { key: 'cash', title: 'Cash', icon: 'cash' },
        { key: 'trade', title: 'Trade', icon: 'swap-horizontal' },
        { key: 'service', title: 'Service', icon: 'construct' },
        { key: 'items', title: 'Available Items', icon: 'storefront' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
          onPress={() => setSelectedTab(tab.key)}
        >
          <Ionicons 
            name={tab.icon} 
            size={16} 
            color={selectedTab === tab.key ? '#FFF' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            selectedTab === tab.key && styles.activeTabText
          ]}>
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Offers Available</Text>
      <Text style={styles.emptyText}>
        {selectedTab === 'all' 
          ? 'No pending offers to display right now. Check back later or create some test data to see how offers work!'
          : selectedTab === 'items'
          ? 'No available items to make offers on right now.'
          : `No ${selectedTab} offers available at the moment.`
        }
      </Text>
      <TouchableOpacity
        style={styles.backToOffersButton}
        onPress={() => navigation.navigate('Offers')}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
        <Text style={styles.backToOffersButtonText}>Back to My Offers</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Offers</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => selectedTab === 'items' ? loadAvailableItems(true) : loadOffers(true)}
        >
          <Ionicons name="refresh" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search offers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {renderTabBar()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading offers...</Text>
        </View>
      ) : offers.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => selectedTab === 'items' ? loadAvailableItems(true) : loadOffers(true)}
              colors={['#FF6B6B']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offerTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  offerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemInfo: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  itemImageContainer: {
    marginRight: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  buyerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  offerMessage: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  tradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeItem: {
    flex: 1,
  },
  tradeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tradeItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  swapIcon: {
    marginHorizontal: 10,
  },
  proposerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  viewButton: {
    flex: 1,
  },
  offerButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  backToOffersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  backToOffersButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
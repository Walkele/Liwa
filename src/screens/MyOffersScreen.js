import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { OfferManagementService } from '../services/OfferManagementService';
import { LifecycleBadge } from '../components/LifecycleBadge';

export default function MyOffersScreen({ navigation }) {
  const { user } = useAuth();
  const [itemsWithOffers, setItemsWithOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserOffers();
    }
  }, [user]);

  const loadUserOffers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('📋 Loading offers for user items...');
      const offersSummary = await OfferManagementService.getUserItemOffersSummary(user.uid);
      setItemsWithOffers(offersSummary);
      console.log(`✅ Found ${offersSummary.length} items with offers`);
    } catch (error) {
      console.error('❌ Error loading user offers:', error);
      Alert.alert('Error', 'Failed to load offers. Please try again.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadUserOffers(true);
  };

  const openOfferComparison = (item) => {
    navigation.navigate('OfferComparison', {
      itemId: item.id,
      itemTitle: item.title
    });
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const diff = now - new Date(timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const renderItemCard = ({ item }) => {
    const hasUrgentOffers = item.pendingOffers > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          hasUrgentOffers && styles.urgentItemCard
        ]}
        onPress={() => openOfferComparison(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemImageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={24} color="#ccc" />
              </View>
            )}
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemPrice}>${item.price}</Text>
            <LifecycleBadge item={item} size="small" />
          </View>
          
          {hasUrgentOffers && (
            <View style={styles.urgentBadge}>
              <Ionicons name="notifications" size={16} color="white" />
            </View>
          )}
        </View>

        <View style={styles.offerSummary}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[
                styles.summaryValue,
                hasUrgentOffers && styles.urgentValue
              ]}>
                {item.pendingOffers}
              </Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{item.totalOffers}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            
            {item.highestCashOffer > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>${item.highestCashOffer}</Text>
                <Text style={styles.summaryLabel}>Highest</Text>
              </View>
            )}
            
            {item.tradeOffers > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{item.tradeOffers}</Text>
                <Text style={styles.summaryLabel}>Trades</Text>
              </View>
            )}
          </View>
          
          <View style={styles.offerActions}>
            {item.lastOfferAt && (
              <Text style={styles.lastOfferText}>
                Last offer: {formatTimeAgo(item.lastOfferAt)}
              </Text>
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  hasUrgentOffers ? styles.urgentActionButton : styles.normalActionButton
                ]}
                onPress={() => openOfferComparison(item)}
              >
                <Text style={[
                  styles.actionButtonText,
                  hasUrgentOffers && styles.urgentActionText
                ]}>
                  {hasUrgentOffers ? 'Review Offers' : 'View Offers'}
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color={hasUrgentOffers ? 'white' : '#FF6B6B'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Offers</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalPendingOffers = itemsWithOffers.reduce((sum, item) => sum + item.pendingOffers, 0);
  const totalOffers = itemsWithOffers.reduce((sum, item) => sum + item.totalOffers, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Offers</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {itemsWithOffers.length > 0 && (
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryHeaderText}>
            {totalPendingOffers > 0 ? 
              `${totalPendingOffers} pending offers across ${itemsWithOffers.length} items` :
              `${totalOffers} total offers on ${itemsWithOffers.length} items`
            }
          </Text>
          {totalPendingOffers > 0 && (
            <View style={styles.urgentIndicator}>
              <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
              <Text style={styles.urgentText}>Action needed</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={itemsWithOffers}
        renderItem={renderItemCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Offers Yet</Text>
            <Text style={styles.emptySubtext}>
              When people make offers on your items, they'll appear here. 
              Make sure your items are visible and attractively priced!
            </Text>
            <TouchableOpacity
              style={styles.promoteButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Ionicons name="megaphone" size={20} color="white" />
              <Text style={styles.promoteButtonText}>View My Items</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  summaryHeader: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryHeaderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  urgentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  urgentItemCard: {
    borderColor: '#FF6B6B',
    backgroundColor: '#fff5f5',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  urgentBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerSummary: {
    gap: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  urgentValue: {
    color: '#FF6B6B',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastOfferText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  normalActionButton: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  urgentActionButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentActionText: {
    color: 'white',
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
    marginBottom: 24,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ItemArchiveService } from '../services/ItemArchiveService';
import { useNotification } from '../context/NotificationContext';

export default function TradeHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [archivedItems, setArchivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [archiveStats, setArchiveStats] = useState({});
  const { showError, showNotification } = useNotification();

  useEffect(() => {
    if (user) {
      loadArchivedItems();
      loadArchiveStats();
    }
  }, [user]);

  const loadArchivedItems = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const items = await ItemArchiveService.getUserArchivedItems(user.uid);
      setArchivedItems(items);
      console.log(`📚 Loaded ${items.length} archived items`);
    } catch (error) {
      console.error('Error loading archived items:', error);
      showError('Error', 'Failed to load trade history');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadArchiveStats = async () => {
    try {
      const stats = await ItemArchiveService.getArchiveStats(user.uid);
      setArchiveStats(stats);
    } catch (error) {
      console.error('Error loading archive stats:', error);
    }
  };

  const onRefresh = () => {
    loadArchivedItems(true);
    loadArchiveStats();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getArchiveReasonIcon = (reason) => {
    switch (reason) {
      case 'traded':
        return '🤝';
      case 'user_deleted':
        return '🗑️';
      case 'expired':
        return '⏰';
      case 'admin_action':
        return '👮';
      default:
        return '📦';
    }
  };

  const getArchiveReasonText = (reason) => {
    switch (reason) {
      case 'traded':
        return 'Successfully Traded';
      case 'user_deleted':
        return 'Deleted by User';
      case 'expired':
        return 'Listing Expired';
      case 'admin_action':
        return 'Admin Action';
      default:
        return 'Archived';
    }
  };

  const renderArchivedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => {
        showNotification({
          type: 'info',
          title: 'Item Details',
          message: `Title: ${item.title}\nPrice: $${item.price}\nArchived: ${formatDate(item.archivedAt)}\nReason: ${getArchiveReasonText(item.archiveReason)}`,
          autoHide: false,
          actions: [
            { title: 'OK', onPress: () => {}, style: 'primary' }
          ]
        });
      }}
    >
      <View style={styles.itemImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={30} color="#ccc" />
          </View>
        )}
        <View style={styles.archiveOverlay}>
          <Text style={styles.archiveIcon}>
            {getArchiveReasonIcon(item.archiveReason)}
          </Text>
        </View>
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
        
        <View style={styles.archiveInfo}>
          <Text style={styles.archiveReason}>
            {getArchiveReasonText(item.archiveReason)}
          </Text>
          <Text style={styles.archiveDate}>
            {formatDate(item.archivedAt)}
          </Text>
        </View>

        {item.tradeDetails && item.tradeDetails.participants && (
          <View style={styles.tradeInfo}>
            <Ionicons name="people" size={14} color="#666" />
            <Text style={styles.tradeText}>
              Traded with {item.tradeDetails.participants.length} user(s)
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>📊 Trade History Summary</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{archiveStats.totalArchived || 0}</Text>
          <Text style={styles.statLabel}>Total Archived</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{archiveStats.tradedItems || 0}</Text>
          <Text style={styles.statLabel}>Successfully Traded</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{archiveStats.recentArchives || 0}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{archiveStats.deletedItems || 0}</Text>
          <Text style={styles.statLabel}>User Deleted</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="archive-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Trade History</Text>
      <Text style={styles.emptyText}>
        Your completed trades and archived items will appear here.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.emptyButtonText}>Start Trading</Text>
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
        <Text style={styles.headerTitle}>Trade History</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {archivedItems.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={archivedItems}
          renderItem={renderArchivedItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderStatsCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
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
  listContainer: {
    padding: 15,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  noImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveIcon: {
    fontSize: 16,
  },
  itemInfo: {
    padding: 15,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  archiveInfo: {
    marginBottom: 10,
  },
  archiveReason: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  archiveDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
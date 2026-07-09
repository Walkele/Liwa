import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ItemArchiveService } from '../services/ItemArchiveService';
import LoadingButton from '../components/LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

function ArchivedItemsScreen({ navigation }) {
  const { user } = useAuth();
  const [archivedItems, setArchivedItems] = useState([]);
  const [completedTrades, setCompletedTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('items'); // 'items' or 'trades'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { loading: restoreLoading, withLoading: withRestoreLoading } = useLoadingState();
  const { showSuccess, showError, showNotification } = useNotification();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      await Promise.all([
        loadArchivedItems(),
        loadCompletedTrades()
      ]);
    } catch (error) {
      console.error('Error loading archived data:', error);
      showError('Error', 'Failed to load archived data');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadArchivedItems = async () => {
    try {
      // Get user's archived items
      const userArchivedItems = await ItemArchiveService.getUserArchivedItems(user.uid);
      
      // Also get items where user was involved in trades (as buyer)
      const tradesQuery = query(
        collection(db, 'tradeProposals'),
        where('status', '==', 'completed'),
        where('proposerUserId', '==', user.uid)
      );
      
      const tradesSnapshot = await getDocs(tradesQuery);
      const tradeItemIds = [];
      
      tradesSnapshot.forEach(doc => {
        const trade = doc.data();
        if (trade.targetItemId) {
          tradeItemIds.push(trade.targetItemId);
        }
      });
      
      // Get items from completed trades
      const tradeItems = [];
      for (const itemId of tradeItemIds) {
        try {
          const itemQuery = query(
            collection(db, 'items'),
            where('__name__', '==', itemId)
          );
          const itemSnapshot = await getDocs(itemQuery);
          itemSnapshot.forEach(doc => {
            tradeItems.push({
              id: doc.id,
              ...doc.data(),
              archiveReason: 'traded_as_buyer',
              archivedAt: new Date()
            });
          });
        } catch (error) {
          console.log('Could not fetch trade item:', itemId);
        }
      }
      
      // Combine and deduplicate
      const allItems = [...userArchivedItems, ...tradeItems];
      const uniqueItems = allItems.filter((item, index, self) => 
        index === self.findIndex(i => i.id === item.id)
      );
      
      setArchivedItems(uniqueItems);
      console.log(`📚 Loaded ${uniqueItems.length} archived items`);
      
    } catch (error) {
      console.error('Error loading archived items:', error);
    }
  };

  const loadCompletedTrades = async () => {
    try {
      // Get completed trades where user was involved
      const tradesQuery1 = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', user.uid),
        where('status', 'in', ['completed', 'finished', 'traded']),
        orderBy('completedAt', 'desc')
      );
      
      const tradesQuery2 = query(
        collection(db, 'tradeProposals'),
        where('targetUserId', '==', user.uid),
        where('status', 'in', ['completed', 'finished', 'traded']),
        orderBy('completedAt', 'desc')
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(tradesQuery1),
        getDocs(tradesQuery2)
      ]);
      
      const trades = [];
      
      snapshot1.forEach(doc => {
        trades.push({ id: doc.id, ...doc.data(), userRole: 'proposer' });
      });
      
      snapshot2.forEach(doc => {
        trades.push({ id: doc.id, ...doc.data(), userRole: 'target' });
      });
      
      // Remove duplicates and sort by completion date
      const uniqueTrades = trades.filter((trade, index, self) => 
        index === self.findIndex(t => t.id === trade.id)
      );
      
      uniqueTrades.sort((a, b) => {
        const aTime = a.completedAt?.toDate?.() || new Date(0);
        const bTime = b.completedAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      setCompletedTrades(uniqueTrades);
      console.log(`🤝 Loaded ${uniqueTrades.length} completed trades`);
      
    } catch (error) {
      console.error('Error loading completed trades:', error);
    }
  };

  const onRefresh = () => {
    loadData(true);
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
      case 'traded_as_buyer':
        return '🤝';
      case 'user_deleted':
        return '🗑️';
      case 'expired':
        return '⏰';
      case 'admin_action':
      case 'test_data_cleanup':
        return '👮';
      default:
        return '📦';
    }
  };

  const getArchiveReasonText = (reason) => {
    switch (reason) {
      case 'traded':
        return 'Successfully Traded';
      case 'traded_as_buyer':
        return 'Acquired in Trade';
      case 'user_deleted':
        return 'Deleted by User';
      case 'expired':
        return 'Listing Expired';
      case 'admin_action':
        return 'Admin Action';
      case 'test_data_cleanup':
        return 'Test Data Cleanup';
      default:
        return 'Archived';
    }
  };

  const handleRestoreItem = async (item) => {
    showNotification({
      type: 'warning',
      title: 'Restore Item',
      message: `Are you sure you want to restore "${item.title}" back to active listings?`,
      autoHide: false,
      actions: [
        { title: 'Cancel', onPress: () => {}, style: 'secondary' },
        { title: 'Restore', onPress: () => executeRestore(item), style: 'primary' }
      ]
    });
  };

  const executeRestore = async (item) => {
    await withRestoreLoading(
      async () => {
        await ItemArchiveService.restoreItem(item.id, 'user_request');
        
        // Remove from archived items list
        setArchivedItems(prev => prev.filter(i => i.id !== item.id));
        setShowDetailsModal(false);
      },
      {
        successMessage: `"${item.title}" has been restored to active listings`,
        errorMessage: 'Failed to restore item',
        showSuccessNotification: true
      }
    );
  };

  const filteredItems = archivedItems.filter(item =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrades = completedTrades.filter(trade =>
    trade.proposerItemTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.targetItemTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderArchivedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => {
        setSelectedItem(item);
        setShowDetailsModal(true);
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
      </View>
    </TouchableOpacity>
  );

  const renderCompletedTrade = ({ item }) => (
    <TouchableOpacity style={styles.tradeCard}>
      <View style={styles.tradeHeader}>
        <Text style={styles.tradeTitle}>
          {item.userRole === 'proposer' ? '🔄 You traded' : '🔄 You received'}
        </Text>
        <Text style={styles.tradeDate}>
          {formatDate(item.completedAt)}
        </Text>
      </View>
      
      <View style={styles.tradeItems}>
        <View style={styles.tradeItem}>
          <Text style={styles.tradeItemLabel}>Your Item:</Text>
          <Text style={styles.tradeItemTitle}>
            {item.userRole === 'proposer' ? item.proposerItemTitle : item.targetItemTitle}
          </Text>
        </View>
        
        <Ionicons name="swap-horizontal" size={20} color="#FF6B6B" style={styles.swapIcon} />
        
        <View style={styles.tradeItem}>
          <Text style={styles.tradeItemLabel}>Their Item:</Text>
          <Text style={styles.tradeItemTitle}>
            {item.userRole === 'proposer' ? item.targetItemTitle : item.proposerItemTitle}
          </Text>
        </View>
      </View>
      
      {item.tradeValue && (
        <Text style={styles.tradeValue}>
          Trade Value: ${item.tradeValue}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'items' && styles.activeTab]}
        onPress={() => setSelectedTab('items')}
      >
        <Text style={[styles.tabText, selectedTab === 'items' && styles.activeTabText]}>
          Archived Items ({filteredItems.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'trades' && styles.activeTab]}
        onPress={() => setSelectedTab('trades')}
      >
        <Text style={[styles.tabText, selectedTab === 'trades' && styles.activeTabText]}>
          Completed Trades ({filteredTrades.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={selectedTab === 'items' ? 'archive-outline' : 'swap-horizontal-outline'} 
        size={80} 
        color="#ccc" 
      />
      <Text style={styles.emptyTitle}>
        {selectedTab === 'items' ? 'No Archived Items' : 'No Completed Trades'}
      </Text>
      <Text style={styles.emptyText}>
        {selectedTab === 'items' 
          ? 'Your archived and traded items will appear here.'
          : 'Your completed trade history will appear here.'
        }
      </Text>
    </View>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Item Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedItem && (
            <View style={styles.modalBody}>
              <Text style={styles.detailTitle}>{selectedItem.title}</Text>
              <Text style={styles.detailPrice}>${selectedItem.price}</Text>
              <Text style={styles.detailDescription}>{selectedItem.description}</Text>
              
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailValue}>
                  {getArchiveReasonText(selectedItem.archiveReason)}
                </Text>
              </View>
              
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Archived:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(selectedItem.archivedAt)}
                </Text>
              </View>
              
              {selectedItem.archiveReason !== 'test_data_cleanup' && (
                <LoadingButton
                  title="Restore Item"
                  onPress={() => handleRestoreItem(selectedItem)}
                  loading={restoreLoading}
                  variant="primary"
                  icon="refresh"
                  style={styles.restoreButton}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
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
        <Text style={styles.headerTitle}>Archived & Completed</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search archived items or trades..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {renderTabBar()}

      {(selectedTab === 'items' ? filteredItems : filteredTrades).length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={selectedTab === 'items' ? filteredItems : filteredTrades}
          renderItem={selectedTab === 'items' ? renderArchivedItem : renderCompletedTrade}
          keyExtractor={(item) => item.id}
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

      {renderDetailsModal()}
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
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  archiveIcon: {
    fontSize: 12,
  },
  itemInfo: {
    flex: 1,
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
    marginTop: 5,
  },
  archiveReason: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  archiveDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tradeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tradeDate: {
    fontSize: 12,
    color: '#999',
  },
  tradeItems: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tradeItem: {
    flex: 1,
  },
  tradeItemLabel: {
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
  tradeValue: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  detailPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 15,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  restoreButton: {
    marginTop: 20,
  },
});

export default ArchivedItemsScreen;
// Comprehensive Notifications Screen
// Displays categorized notifications with filtering and management options

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { EnhancedNotificationService } from '../services/EnhancedNotificationService';
import LoadingButton from '../components/LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    total: 0,
    byCategory: {},
    byPriority: {}
  });
  const { loading: actionLoading, withLoading } = useLoadingState();

  const categories = [
    { key: 'all', label: 'All', icon: 'list', color: '#9E9E9E' },
    { key: 'trade', label: 'Trades', icon: 'swap-horizontal', color: '#4CAF50' },
    { key: 'offer', label: 'Offers', icon: 'cash', color: '#FF9800' },
    { key: 'message', label: 'Messages', icon: 'chatbubble', color: '#2196F3' },
    { key: 'system', label: 'System', icon: 'settings', color: '#9E9E9E' },
    { key: 'security', label: 'Security', icon: 'shield', color: '#F44336' },
    { key: 'item', label: 'Items', icon: 'cube', color: '#E91E63' },
    { key: 'social', label: 'Social', icon: 'people', color: '#9C27B0' }
  ];

  const priorities = [
    { key: 'all', label: 'All Priorities', color: '#9E9E9E' },
    { key: 'critical', label: 'Critical', color: '#F44336' },
    { key: 'high', label: 'High', color: '#FF9800' },
    { key: 'medium', label: 'Medium', color: '#2196F3' },
    { key: 'low', label: 'Low', color: '#4CAF50' }
  ];

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadNotificationCounts();
    }
  }, [user]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedCategory, selectedPriority]);

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const allNotifications = await EnhancedNotificationService.getNotifications(user.uid, {
        limit: 100,
        includeExpired: false
      });

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNotificationCounts = async () => {
    try {
      const counts = await EnhancedNotificationService.getNotificationCounts(user.uid);
      setNotificationCounts(counts || {
        total: 0,
        byCategory: {},
        byPriority: {}
      });
    } catch (error) {
      console.error('Error loading notification counts:', error);
      // Set default counts on error
      setNotificationCounts({
        total: 0,
        byCategory: {},
        byPriority: {}
      });
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(notification => notification.category === selectedCategory);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(notification => notification.priority === selectedPriority);
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt); // Newer first
    });

    setFilteredNotifications(filtered);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await EnhancedNotificationService.markAsRead(notification.id, user.uid);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    }

    // Navigate based on notification type
    navigateFromNotification(notification);
  };

  const navigateFromNotification = (notification) => {
    const { type, data } = notification;

    switch (type) {
      case 'TRADE_PROPOSAL_RECEIVED':
      case 'TRADE_PROPOSAL_ACCEPTED':
      case 'TRADE_STEP_COMPLETED':
        if (data.tradeProposalId || data.tradeId) {
          navigation.navigate('TradeLifecycle', {
            tradeId: data.tradeId || data.tradeProposalId,
            type: 'trade'
          });
        }
        break;

      case 'OFFER_RECEIVED':
      case 'OFFER_ACCEPTED':
      case 'COUNTER_OFFER':
        if (data.offerId) {
          navigation.navigate('Offers');
        }
        break;

      case 'NEW_MESSAGE':
        if (data.conversationId) {
          navigation.navigate('Chat', {
            conversationId: data.conversationId,
            otherUserId: data.senderId || data.otherUserId,
            otherUserName: data.senderName || 'User',
            itemTitle: data.itemTitle || 'Chat'
          });
        } else {
          navigation.navigate('Messages');
        }
        break;

      case 'ITEM_LIKED':
      case 'ITEM_VIEWED':
        if (data.itemId) {
          navigation.navigate('ItemDetails', { itemId: data.itemId });
        }
        break;

      default:
        // For system notifications, stay on notifications screen
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    await withLoading(
      async () => {
        const category = selectedCategory === 'all' ? null : selectedCategory;
        const markedCount = await EnhancedNotificationService.markAllAsRead(user.uid, category);
        
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({
            ...notification,
            read: category ? (notification.category === category ? true : notification.read) : true
          }))
        );

        Alert.alert('Success', `Marked ${markedCount} notifications as read`);
        await loadNotificationCounts();
      },
      {
        errorMessage: 'Failed to mark notifications as read',
        showErrorNotification: false
      }
    );
  };

  const handleDismissNotification = async (notificationId) => {
    await EnhancedNotificationService.dismissNotification(notificationId, user.uid);
    
    // Remove from local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    await loadNotificationCounts();
  };

  const renderNotification = ({ item }) => {
    const isUnread = !item.read;
    const priorityColor = getPriorityColor(item.priority);
    const categoryIcon = getCategoryIcon(item.category);
    const timeAgo = getTimeAgo(item.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            <Ionicons 
              name={item.icon || categoryIcon} 
              size={20} 
              color={item.color || priorityColor} 
            />
          </View>
          
          <View style={styles.notificationContent}>
            <Text style={[
              styles.notificationTitle,
              isUnread && styles.unreadText
            ]}>
              {item.title}
            </Text>
            <Text style={styles.notificationMessage}>
              {item.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Text style={styles.timeText}>{timeAgo}</Text>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: priorityColor }
              ]}>
                <Text style={styles.priorityText}>
                  {item.priority?.toUpperCase() || 'LOW'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.notificationActions}>
            {isUnread && (
              <View style={styles.unreadDot} />
            )}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => handleDismissNotification(item.id)}
            >
              <Ionicons name="close" size={16} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = ({ item }) => {
    const isSelected = selectedCategory === item.key;
    const count = item.key === 'all' 
      ? (notificationCounts?.total || 0) 
      : (notificationCounts?.byCategory?.[item.key] || 0);

    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          isSelected && { backgroundColor: item.color }
        ]}
        onPress={() => setSelectedCategory(item.key)}
      >
        <Ionicons 
          name={item.icon} 
          size={16} 
          color={isSelected ? 'white' : item.color} 
        />
        <Text style={[
          styles.categoryText,
          isSelected && styles.selectedCategoryText
        ]}>
          {item.label}
        </Text>
        {count > 0 && (
          <View style={[
            styles.categoryBadge,
            isSelected && styles.selectedCategoryBadge
          ]}>
            <Text style={[
              styles.categoryBadgeText,
              isSelected && styles.selectedCategoryBadgeText
            ]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        {selectedCategory === 'all' 
          ? "You're all caught up! No new notifications."
          : `No ${selectedCategory} notifications at the moment.`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryFilter}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Action Bar */}
      {filteredNotifications.some(n => !n.read) && (
        <View style={styles.actionBar}>
          <LoadingButton
            title="Mark All as Read"
            onPress={handleMarkAllAsRead}
            loading={actionLoading}
            variant="secondary"
            icon="checkmark-done"
            style={styles.markAllButton}
          />
        </View>
      )}

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              colors={['#FF6B6B']}
            />
          }
          contentContainerStyle={styles.notificationsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filtersModal}>
            <Text style={styles.modalTitle}>Filter Notifications</Text>
            
            <Text style={styles.filterSectionTitle}>Priority</Text>
            {priorities.map(priority => (
              <TouchableOpacity
                key={priority.key}
                style={[
                  styles.filterOption,
                  selectedPriority === priority.key && styles.selectedFilterOption
                ]}
                onPress={() => setSelectedPriority(priority.key)}
              >
                <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
                <Text style={styles.filterOptionText}>{priority.label}</Text>
                {selectedPriority === priority.key && (
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.closeFiltersText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper functions
const getPriorityColor = (priority) => {
  const colors = {
    critical: '#F44336',
    high: '#FF9800',
    medium: '#2196F3',
    low: '#4CAF50'
  };
  return colors[priority] || '#9E9E9E';
};

const getCategoryIcon = (category) => {
  const icons = {
    trade: 'swap-horizontal',
    offer: 'cash',
    message: 'chatbubble',
    system: 'settings',
    security: 'shield',
    item: 'cube',
    social: 'people'
  };
  return icons[category] || 'notifications';
};

const getTimeAgo = (date) => {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return notificationDate.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#666',
  },
  selectedCategoryText: {
    color: 'white',
  },
  categoryBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
  },
  selectedCategoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  selectedCategoryBadgeText: {
    color: 'white',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  notificationActions: {
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginBottom: 8,
  },
  dismissButton: {
    padding: 4,
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
    marginTop: 16,
    marginBottom: 8,
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
    justifyContent: 'flex-end',
  },
  filtersModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedFilterOption: {
    backgroundColor: '#f0f8ff',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  closeFiltersButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeFiltersText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
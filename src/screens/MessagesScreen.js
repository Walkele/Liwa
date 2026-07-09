import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTrade } from '../context/TradeContext';
import { TradeLifecycleService } from '../services/TradeLifecycleService';
import { OfferManagementService } from '../services/OfferManagementService';

export default function EnhancedMessagesScreen({ navigation }) {
  const { user } = useAuth();
  const { conversations, loading, error } = useTrade();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const onRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filterConversations = () => {
    if (selectedFilter === 'all') return conversations;
    if (selectedFilter === 'active') {
      return conversations.filter(conv => 
        conv.tradeState && 
        conv.tradeState !== TradeLifecycleService.TRADE_STATES.COMPLETED &&
        conv.tradeState !== TradeLifecycleService.TRADE_STATES.CANCELLED
      );
    }
    if (selectedFilter === 'offers') {
      return conversations.filter(conv => conv.conversationType === 'cash_offer');
    }
    if (selectedFilter === 'trades') {
      return conversations.filter(conv => conv.conversationType === 'trade_proposal');
    }
    return conversations;
  };

  const getTradeStateInfo = (tradeState) => {
    const states = {
      [TradeLifecycleService.TRADE_STATES.OFFER_PENDING]: {
        icon: '⏳',
        color: '#FF9500',
        label: 'Pending',
        description: 'Waiting for response'
      },
      [TradeLifecycleService.TRADE_STATES.OFFER_ACCEPTED]: {
        icon: '✅',
        color: '#4CAF50',
        label: 'Accepted',
        description: 'Offer accepted'
      },
      [TradeLifecycleService.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED]: {
        icon: '🔄',
        color: '#2196F3',
        label: 'Multiple Offers',
        description: 'Seller choosing offer'
      },
      [TradeLifecycleService.TRADE_STATES.COMMITMENT_PENDING]: {
        icon: '🤝',
        color: '#FF9500',
        label: 'Commitment Pending',
        description: 'Waiting for commitment'
      },
      [TradeLifecycleService.TRADE_STATES.BOTH_COMMITTED]: {
        icon: '🔒',
        color: '#4CAF50',
        label: 'Both Committed',
        description: 'Trade locked in'
      },
      [TradeLifecycleService.TRADE_STATES.IN_PROGRESS]: {
        icon: '🚚',
        color: '#2196F3',
        label: 'In Progress',
        description: 'Exchange in progress'
      },
      [TradeLifecycleService.TRADE_STATES.DELIVERY_PENDING]: {
        icon: '📦',
        color: '#FF9500',
        label: 'Delivery Pending',
        description: 'Waiting for confirmation'
      },
      [TradeLifecycleService.TRADE_STATES.COMPLETED]: {
        icon: '🎉',
        color: '#4CAF50',
        label: 'Completed',
        description: 'Trade successful'
      },
      [TradeLifecycleService.TRADE_STATES.CANCELLED]: {
        icon: '❌',
        color: '#F44336',
        label: 'Cancelled',
        description: 'Trade cancelled'
      },
      [TradeLifecycleService.TRADE_STATES.DISPUTED]: {
        icon: '⚠️',
        color: '#FF5722',
        label: 'Disputed',
        description: 'Under review'
      }
    };
    
    return states[tradeState] || {
      icon: '💬',
      color: '#666',
      label: 'Message',
      description: 'General conversation'
    };
  };

  const getConversationTypeInfo = (item) => {
    if (item.conversationType === 'cash_offer') {
      return {
        type: '💰 Cash Offer',
        amount: item.offerAmount ? `$${item.offerAmount}` : '',
        subtitle: `Cash offer for ${item.itemTitle || 'item'}`
      };
    } else if (item.conversationType === 'trade_proposal') {
      return {
        type: '🔄 Trade Proposal',
        amount: '',
        subtitle: 'Item trade proposal'
      };
    } else {
      return {
        type: '💬 Message',
        amount: '',
        subtitle: 'General conversation'
      };
    }
  };

  const handleTradeAction = async (item, action) => {
    try {
      switch (action) {
        case 'accept_offer':
          await TradeLifecycleService.acceptOffer(item.offerId, user.uid);
          Alert.alert('Success', 'Offer accepted!');
          break;
        case 'decline_offer':
          await OfferManagementService.rejectOffer(item.offerId, user.uid, 'Declined by recipient');
          Alert.alert('Success', 'Offer declined');
          break;
        case 'accept_trade':
          // For trade proposals, we'll use a similar pattern
          Alert.alert('Info', 'Trade proposal acceptance coming soon!');
          break;
        case 'decline_trade':
          Alert.alert('Info', 'Trade proposal decline coming soon!');
          break;
        case 'commit_seller':
          await TradeLifecycleService.commitToOffer(item.offerId, user.uid);
          Alert.alert('Success', 'You have committed to this offer!');
          break;
        case 'commit_buyer':
          await TradeLifecycleService.buyerCommitToTrade(item.offerId, user.uid);
          Alert.alert('Success', 'You have committed to this trade!');
          break;
        case 'mark_completed':
          await TradeLifecycleService.markTradeCompleted(item.offerId, user.uid);
          Alert.alert('Success', 'Trade marked as completed!');
          break;
        default:
          break;
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderTradeActions = (item) => {
    const tradeState = item.tradeState;
    const isSellerView = item.sellerId === user.uid;
    const isBuyerView = item.buyerId === user.uid;
    
    // For cash offers: seller receives the offer and can accept/decline
    if (item.conversationType === 'cash_offer' && 
        (tradeState === TradeLifecycleService.TRADE_STATES.OFFER_PENDING || !tradeState) && 
        isSellerView && item.status !== 'accepted' && item.status !== 'rejected') {
      return (
        <View style={styles.swapitActionContainer}>
          <View style={styles.swapitActionHeader}>
            <Ionicons name="cash" size={16} color="#FF6B6B" />
            <Text style={styles.swapitActionTitle}>Cash Offer Response</Text>
          </View>
          <View style={styles.swapitButtonsRow}>
            <TouchableOpacity
              style={[styles.swapitButton, styles.swapitDeclineButton]}
              onPress={() => handleTradeAction(item, 'decline_offer')}
            >
              <Text style={styles.swapitDeclineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.swapitButton, styles.swapitAcceptButton]}
              onPress={() => handleTradeAction(item, 'accept_offer')}
            >
              <Text style={styles.swapitAcceptText}>Accept Offer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // For trade proposals: recipient can accept/decline
    if (item.conversationType === 'trade_proposal' && 
        (tradeState === TradeLifecycleService.TRADE_STATES.OFFER_PENDING || !tradeState) && 
        item.status !== 'accepted' && item.status !== 'rejected') {
      // Check if current user is the recipient of the trade proposal
      const isRecipient = item.targetUserId === user.uid || item.recipientId === user.uid;
      
      if (isRecipient) {
        return (
          <View style={styles.swapitActionContainer}>
            <View style={styles.swapitActionHeader}>
              <Ionicons name="swap-horizontal" size={16} color="#FF6B6B" />
              <Text style={styles.swapitActionTitle}>Trade Proposal Response</Text>
            </View>
            <View style={styles.swapitButtonsRow}>
              <TouchableOpacity
                style={[styles.swapitButton, styles.swapitDeclineButton]}
                onPress={() => handleTradeAction(item, 'decline_trade')}
              >
                <Text style={styles.swapitDeclineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.swapitButton, styles.swapitAcceptButton]}
                onPress={() => handleTradeAction(item, 'accept_trade')}
              >
                <Text style={styles.swapitAcceptText}>Accept Trade</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
    }

    // Existing commit buttons for accepted offers
    if (tradeState === TradeLifecycleService.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED && isSellerView) {
      return (
        <View style={styles.swapitActionContainer}>
          <TouchableOpacity
            style={[styles.swapitButton, styles.swapitCommitButton]}
            onPress={() => handleTradeAction(item, 'commit_seller')}
          >
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.swapitCommitText}>Commit to Offer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tradeState === TradeLifecycleService.TRADE_STATES.COMMITMENT_PENDING && isBuyerView) {
      return (
        <View style={styles.swapitActionContainer}>
          <TouchableOpacity
            style={[styles.swapitButton, styles.swapitCommitButton]}
            onPress={() => handleTradeAction(item, 'commit_buyer')}
          >
            <Ionicons name="people" size={16} color="white" />
            <Text style={styles.swapitCommitText}>Commit to Trade</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tradeState === TradeLifecycleService.TRADE_STATES.BOTH_COMMITTED) {
      return (
        <View style={styles.swapitActionContainer}>
          <TouchableOpacity
            style={[styles.swapitButton, styles.swapitCompleteButton]}
            onPress={() => handleTradeAction(item, 'mark_completed')}
          >
            <Ionicons name="checkmark-done" size={16} color="white" />
            <Text style={styles.swapitCompleteText}>Mark Completed</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderFilterTabs = () => {
    const filters = [
      { key: 'all', label: 'All', icon: 'chatbubbles' },
      { key: 'active', label: 'Active', icon: 'pulse' },
      { key: 'offers', label: 'Offers', icon: 'cash' },
      { key: 'trades', label: 'Trades', icon: 'swap-horizontal' }
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              selectedFilter === filter.key && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Ionicons 
              name={filter.icon} 
              size={16} 
              color={selectedFilter === filter.key ? '#FF6B6B' : '#666'} 
            />
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter.key && styles.filterTabTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderConversation = ({ item, index }) => {
    const otherUserId = item.participants?.find(id => id !== user?.uid);
    const otherUserName = item.participantNames?.[otherUserId] || 'Unknown User';
    
    const conversationInfo = getConversationTypeInfo(item);
    const tradeStateInfo = getTradeStateInfo(item.tradeState);
    
    const handleConversationPress = () => {
      navigation.navigate('Chat', {
        conversationId: item.id,
        otherUserId,
        otherUserName,
        itemTitle: item.itemTitle || 'Item',
        tradeState: item.tradeState,
        offerContext: item.conversationType === 'cash_offer' ? {
          offerId: item.offerId,
          offerAmount: item.offerAmount,
          status: item.status || 'active'
        } : null,
        tradeContext: item.conversationType === 'trade_proposal' ? {
          tradeProposalId: item.tradeProposalId,
          status: item.status || 'active'
        } : null
      });
    };

    const handleItemPress = () => {
      if (item.itemId) {
        navigation.navigate('ItemDetails', {
          item: {
            id: item.itemId,
            title: item.itemTitle,
            userId: otherUserId,
            price: item.offerAmount || 0
          }
        });
      } else {
        handleConversationPress();
      }
    };

    const handleTradeManagementPress = () => {
      navigation.navigate('TradeManagement', {
        offerId: item.offerId,
        tradeState: item.tradeState,
        type: item.conversationType === 'cash_offer' ? 'offer' : 'trade'
      });
    };
    
    return (
      <Animated.View style={[styles.conversationCard, { opacity: 1 }]}>
        {/* Priority Indicator */}
        {item.tradeState && item.tradeState !== TradeLifecycleService.TRADE_STATES.COMPLETED && (
          <View style={[styles.priorityIndicator, { backgroundColor: tradeStateInfo.color }]} />
        )}

        {/* Pending Action Badge */}
        {((item.conversationType === 'cash_offer' && item.sellerId === user.uid) ||
          (item.conversationType === 'trade_proposal' && (item.targetUserId === user.uid || item.recipientId === user.uid))) &&
         (!item.status || item.status === 'pending') && (
          <View style={styles.pendingActionBadge}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={styles.pendingActionText}>Action Required</Text>
          </View>
        )}

        {/* Main Conversation Area */}
        <TouchableOpacity
          style={styles.conversationMain}
          onPress={handleConversationPress}
          activeOpacity={0.7}
        >
          <View style={styles.conversationLeft}>
            <View style={[styles.avatar, { backgroundColor: tradeStateInfo.color }]}>
              <Text style={styles.avatarText}>
                {otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
            
            {/* Online Status Indicator */}
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={styles.userName}>{otherUserName}</Text>
              <View style={styles.conversationMeta}>
                <Text style={styles.timestamp}>
                  {item.lastMessageAt?.toDate ? 
                    item.lastMessageAt.toDate().toLocaleDateString() : 
                    'Now'
                  }
                </Text>
                {item.unreadCount && item.unreadCount[user.uid] > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount[user.uid]}</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Conversation Type Badge */}
            <View style={styles.conversationTypeBadge}>
              <Text style={styles.conversationType}>{conversationInfo.type}</Text>
            </View>
            
            {/* Trade State Indicator */}
            <View style={styles.tradeStateContainer}>
              <View style={[styles.tradeStateBadge, { backgroundColor: tradeStateInfo.color }]}>
                <Text style={styles.tradeStateIcon}>{tradeStateInfo.icon}</Text>
                <Text style={styles.tradeStateLabel}>{tradeStateInfo.label}</Text>
              </View>
              <Text style={styles.tradeStateDescription}>{tradeStateInfo.description}</Text>
            </View>
            
            <Text style={styles.lastMessage} numberOfLines={2}>
              {item.lastMessage || 'Start a conversation...'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Enhanced Item Card */}
        <TouchableOpacity 
          style={styles.itemCard}
          onPress={handleItemPress}
          activeOpacity={0.8}
        >
          <View style={styles.itemImageContainer}>
            {item.itemImage ? (
              <Image source={{ uri: item.itemImage }} style={styles.itemImage} />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <Ionicons name="image-outline" size={28} color="#999" />
              </View>
            )}
            {conversationInfo.amount && (
              <View style={styles.priceOverlay}>
                <Text style={styles.priceText}>{conversationInfo.amount}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.itemTitle || 'Item'}
            </Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {conversationInfo.subtitle}
            </Text>
            
            {/* Item Status */}
            <View style={styles.itemStatusContainer}>
              <View style={[styles.itemStatusDot, { backgroundColor: tradeStateInfo.color }]} />
              <Text style={styles.itemStatusText}>{tradeStateInfo.label}</Text>
            </View>
          </View>
          
          <View style={styles.itemActions}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        {/* Enhanced Trade Actions */}
        {renderTradeActions(item)}

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={handleConversationPress}
          >
            <Ionicons name="chatbubble" size={16} color="#666" />
            <Text style={styles.quickActionText}>Chat</Text>
          </TouchableOpacity>
          
          {item.itemId && (
            <TouchableOpacity
              style={styles.quickAction}
              onPress={handleItemPress}
            >
              <Ionicons name="eye" size={16} color="#666" />
              <Text style={styles.quickActionText}>View Item</Text>
            </TouchableOpacity>
          )}
          
          {item.tradeState && item.tradeState !== TradeLifecycleService.TRADE_STATES.OFFER_PENDING && (
            <TouchableOpacity
              style={styles.quickAction}
              onPress={handleTradeManagementPress}
            >
              <Ionicons name="settings" size={16} color="#666" />
              <Text style={styles.quickActionText}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please login to view messages</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {filterConversations().length} conversation{filterConversations().length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('TradeActions')}
          >
            <Ionicons name="notifications" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {filterConversations().length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          </View>
          <Text style={styles.emptyText}>
            {loading ? 'Loading messages...' : 
             selectedFilter === 'all' ? 'No conversations yet' :
             `No ${selectedFilter} conversations`}
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedFilter === 'all' ? 
              'Start trading to begin conversations!' :
              `Switch to "All" to see other conversations`}
          </Text>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>
                {error.includes('index') ? 'Setting up database...' : error}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={filterConversations()}
          renderItem={renderConversation}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          style={styles.conversationsList}
          contentContainerStyle={styles.conversationsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B6B']}
              tintColor="#FF6B6B"
            />
          }
        />
      )}
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  filterTabActive: {
    backgroundColor: '#FFE5E5',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  conversationsList: {
    flex: 1,
  },
  conversationsContent: {
    padding: 16,
  },
  conversationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  priorityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 1,
  },
  pendingActionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    zIndex: 2,
  },
  pendingActionText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 4,
  },
  conversationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  conversationLeft: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 16,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  conversationTypeBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  conversationType: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tradeStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  tradeStateIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  tradeStateLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  tradeStateDescription: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  lastMessage: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  itemImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  itemStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  itemStatusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  itemActions: {
    marginLeft: 12,
  },
  actionButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F44336',
  },
  // SwapIt-style action buttons
  swapitActionContainer: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  swapitActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  swapitActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
  },
  swapitButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  swapitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 40,
  },
  swapitDeclineButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DC3545',
    flex: 1,
  },
  swapitAcceptButton: {
    backgroundColor: '#FF6B6B',
    flex: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  swapitCommitButton: {
    backgroundColor: '#28A745',
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  swapitCompleteButton: {
    backgroundColor: '#FD7E14',
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  swapitDeclineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC3545',
  },
  swapitAcceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  swapitCommitText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  swapitCompleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
    fontStyle: 'italic',
  },
});
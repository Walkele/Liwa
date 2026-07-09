import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTrade } from '../context/TradeContext';

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const { conversations, loading, error } = useTrade();

  const renderConversation = ({ item }) => {
    const otherUserId = item.participants?.find(id => id !== user?.uid);
    const otherUserName = item.participantNames?.[otherUserId] || 'Unknown User';
    
    // Determine conversation type and display appropriate info
    const getConversationInfo = () => {
      if (item.conversationType === 'cash_offer') {
        return {
          type: '💰 Cash Offer',
          amount: item.offerAmount ? `$${item.offerAmount}` : '',
          subtitle: `${item.type || 'Offer'} • ${item.amount || ''}`
        };
      } else if (item.conversationType === 'trade_proposal') {
        return {
          type: '🔄 Trade Proposal',
          amount: '',
          subtitle: 'Item Trade Proposal'
        };
      } else {
        return {
          type: '💬 Message',
          amount: '',
          subtitle: 'General conversation'
        };
      }
    };

    const conversationInfo = getConversationInfo();
    
    const handleConversationPress = () => {
      navigation.navigate('Chat', {
        conversationId: item.id,
        otherUserId,
        otherUserName,
        itemTitle: item.itemTitle || 'Item',
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
        // Navigate to item details if we have an itemId
        navigation.navigate('ItemDetails', {
          item: {
            id: item.itemId,
            title: item.itemTitle,
            userId: otherUserId
          }
        });
      } else {
        // Fallback to chat if no item details
        handleConversationPress();
      }
    };
    
    return (
      <View style={styles.conversationCard}>
        <TouchableOpacity
          style={styles.conversationMain}
          onPress={handleConversationPress}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherUserName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={styles.userName}>{otherUserName}</Text>
              <Text style={styles.conversationType}>{conversationInfo.type}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.itemSection}
              onPress={handleItemPress}
              activeOpacity={0.7}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.itemTitle || 'Item'}</Text>
                {conversationInfo.amount && (
                  <Text style={styles.offerAmount}>{conversationInfo.amount}</Text>
                )}
                <Text style={styles.itemSubtitle}>{conversationInfo.subtitle}</Text>
              </View>
              <View style={styles.itemAction}>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || 'Start a conversation...'}
            </Text>
          </View>
        </TouchableOpacity>
        
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {loading ? 'Loading messages...' : 'No conversations yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            Start trading to begin conversations!
          </Text>
          {error && (
            <Text style={styles.errorText}>
              {error.includes('index') ? 'Setting up database...' : error}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          style={styles.conversationsList}
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
    padding: 20,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  conversationsList: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  conversationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  conversationType: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
  },
  offerAmount: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginTop: 2,
  },
  itemSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemAction: {
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
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
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
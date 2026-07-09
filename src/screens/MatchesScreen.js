import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { MatchingService } from '../services/MatchingService';

export default function MatchesScreen({ navigation }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingMatch, setOpeningMatch] = useState(null); // Track which match is being opened
  const [activeConversations, setActiveConversations] = useState(new Set()); // Track active conversations

  useEffect(() => {
    if (user) {
      loadMatches();
    }
  }, [user]);

  // Cleanup active conversations when screen unmounts
  useEffect(() => {
    return () => {
      setActiveConversations(new Set());
      setOpeningMatch(null);
    };
  }, []);

  const loadMatches = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('📋 Loading matches for user:', user.uid);
      const userMatches = await MatchingService.getUserMatches(user.uid);
      console.log(`✅ Found ${userMatches.length} matches`);
      setMatches(userMatches);
    } catch (error) {
      console.error('❌ Error loading matches:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadMatches(true);
  };

  const openMatchConversation = async (match) => {
    // Prevent duplicate opening of the same match
    if (openingMatch === match.id) {
      console.log('⚠️ Match already being opened, ignoring duplicate click');
      return;
    }

    // Check if conversation is already active/open
    const conversationKey = `${match.user1Id}_${match.user2Id}`;
    if (activeConversations.has(conversationKey)) {
      console.log('⚠️ Conversation already active, ignoring duplicate');
      Alert.alert(
        'Already Open',
        'This conversation is already open. Please check your active chats.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('🔍 Opening match conversation:', {
      matchId: match.id,
      conversationId: match.conversationId,
      conversationStarted: match.conversationStarted
    });
    
    setOpeningMatch(match.id);
    setActiveConversations(prev => new Set([...prev, conversationKey]));
    
    const otherUser = getOtherUserInfo(match);
    
    // Get both matched items details for trade negotiation
    let targetItem = null;
    let myItem = null;
    try {
      const [targetItemDetails, myItemDetails] = await Promise.all([
        MatchingService.getItemDetails(otherUser.itemId),
        MatchingService.getItemDetails(otherUser.myItemId)
      ]);
      targetItem = targetItemDetails;
      myItem = myItemDetails;
      console.log('📦 Target item details:', targetItem);
      console.log('📦 My item details:', myItem);
    } catch (error) {
      console.error('❌ Error getting item details:', error);
      setOpeningMatch(null);
      setActiveConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationKey);
        return newSet;
      });
      Alert.alert('Error', 'Failed to load item details. Please try again.');
      return;
    }
    
    if (match.conversationId) {
      // Navigate to existing conversation with both items data
      setOpeningMatch(null);
      navigation.navigate('Chat', { 
        conversationId: match.conversationId,
        otherUserId: otherUser.userId,
        otherUserName: 'Match User',
        itemTitle: otherUser.itemTitle,
        isMatch: true,
        targetItem: targetItem, // Pass the other user's item
        myItem: myItem, // Pass the user's own item
        matchData: match // Pass match data for reference
      });
    } else {
      // Try to create conversation if missing
      console.log('⚠️ No conversation ID for match, attempting to create one...');
      
      try {
        // Get item details for conversation creation
        const [item1, item2] = await Promise.all([
          MatchingService.getItemDetails(match.user1ItemId),
          MatchingService.getItemDetails(match.user2ItemId)
        ]);
        
        if (item1 && item2) {
          // Create the missing conversation
          const conversationId = await MatchingService.createMatchConversation(
            match.id,
            match.user1Id,
            match.user2Id,
            item1,
            item2
          );
          
          console.log('✅ Created missing conversation:', conversationId);
          
          setOpeningMatch(null);
          
          // Navigate to the new conversation with both items data
          navigation.navigate('Chat', { 
            conversationId,
            otherUserId: otherUser.userId,
            otherUserName: 'Match User',
            itemTitle: otherUser.itemTitle,
            isMatch: true,
            targetItem: targetItem, // Pass the other user's item
            myItem: myItem, // Pass the user's own item
            matchData: match // Pass match data for reference
          });
          
          // Refresh matches to update the conversation ID
          loadMatches();
        } else {
          console.error('❌ Could not get item details for conversation creation');
          setOpeningMatch(null);
          setActiveConversations(prev => {
            const newSet = new Set(prev);
            newSet.delete(conversationKey);
            return newSet;
          });
          Alert.alert(
            'Error', 
            'Could not open chat. Please try refreshing your matches.',
            [
              { text: 'Refresh', onPress: () => loadMatches() },
              { text: 'OK' }
            ]
          );
        }
      } catch (error) {
        console.error('❌ Error creating conversation:', error);
        setOpeningMatch(null);
        setActiveConversations(prev => {
          const newSet = new Set(prev);
          newSet.delete(conversationKey);
          return newSet;
        });
        Alert.alert(
          'Error', 
          'Could not open chat. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const getOtherUserInfo = (match) => {
    const isUser1 = match.user1Id === user.uid;
    return {
      userId: isUser1 ? match.user2Id : match.user1Id,
      itemId: isUser1 ? match.user2ItemId : match.user1ItemId,
      itemTitle: isUser1 ? match.user2ItemTitle : match.user1ItemTitle,
      myItemId: isUser1 ? match.user1ItemId : match.user2ItemId,
      myItemTitle: isUser1 ? match.user1ItemTitle : match.user2ItemTitle
    };
  };

  const formatMatchDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const renderMatch = ({ item: match }) => {
    const otherUser = getOtherUserInfo(match);
    const isOpening = openingMatch === match.id;
    
    return (
      <TouchableOpacity
        style={[styles.matchCard, isOpening && styles.matchCardOpening]}
        onPress={() => openMatchConversation(match)}
        disabled={isOpening}
        activeOpacity={isOpening ? 1 : 0.7}
      >
        <View style={styles.matchHeader}>
          <View style={styles.matchAvatar}>
            {match.otherUserPhoto ? (
              <Image source={{ uri: match.otherUserPhoto }} style={styles.matchAvatarImage} />
            ) : (
              <View style={styles.matchAvatarPlaceholder}>
                <Text style={styles.matchAvatarText}>
                  {match.otherUserName?.charAt(0).toUpperCase() || otherUser.userName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle}>
              {isOpening ? 'Opening...' : '🎉 It\'s a Match!'}
            </Text>
            <Text style={styles.matchDate}>{formatMatchDate(match.createdAt)}</Text>
          </View>
          
          <View style={styles.matchStatus}>
            {isOpening ? (
              <Ionicons name="refresh" size={24} color="#999" />
            ) : match.tradeCompleted ? (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            ) : match.conversationStarted ? (
              <Ionicons name="chatbubble" size={24} color="#2196F3" />
            ) : (
              <Ionicons name="time" size={24} color="#FF9800" />
            )}
          </View>
        </View>
        
        <View style={styles.itemsContainer}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Your item:</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {otherUser.myItemTitle}
            </Text>
          </View>
          
          <View style={styles.tradeArrow}>
            <Ionicons name="swap-horizontal" size={20} color="#666" />
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Their item:</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {otherUser.itemTitle}
            </Text>
          </View>
        </View>
        
        <View style={styles.matchActions}>
          <Text style={styles.actionHint}>
            {match.tradeCompleted 
              ? '✅ Trade completed' 
              : match.conversationStarted 
                ? '💬 Tap to continue chatting'
                : '👆 Tap to start chatting'
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matches</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptySubtext}>
            Keep swiping to find items you're interested in! When someone else is also interested in your items, you'll get a match.
          </Text>
          <TouchableOpacity
            style={styles.swipeButton}
            onPress={() => navigation.navigate('Swipe')}
          >
            <Ionicons name="heart" size={20} color="white" />
            <Text style={styles.swipeButtonText}>Start Swiping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.matchesList}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    padding: 8,
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
  matchesList: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchCardOpening: {
    opacity: 0.6,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  matchAvatarImage: {
    width: '100%',
    height: '100%',
  },
  matchAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  matchDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  matchStatus: {
    padding: 4,
  },
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  tradeArrow: {
    marginHorizontal: 12,
    padding: 8,
  },
  matchActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'center',
  },
  actionHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  swipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
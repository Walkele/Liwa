import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { EnhancedTradeService } from '../services/EnhancedTradeService';
import { TrustScoreService } from '../services/TrustScoreService';
import { TradeActionButtons } from '../components/TradeActionButtons';
import { TrustScoreDisplay, VerificationBadges } from '../components/TrustScoreDisplay';

export default function EnhancedChatScreen({ route, navigation }) {
  const { conversationId, otherUserId, otherUserName } = route.params;
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [tradeOffers, setTradeOffers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [otherUserData, setOtherUserData] = useState(null);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;

    // Load other user data for trust display
    loadOtherUserData();

    // Listen to messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      
      // Auto-scroll to bottom on new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Listen to trade offers
    const offersUnsubscribe = EnhancedTradeService.subscribeToTradeOffers(
      conversationId,
      setTradeOffers
    );

    return () => {
      messagesUnsubscribe();
      offersUnsubscribe();
    };
  }, [conversationId]);

  const loadOtherUserData = async () => {
    try {
      // Calculate trust score for other user
      const trustScore = await TrustScoreService.calculateTrustScore(otherUserId);
      const verifications = await TrustScoreService.getUserVerifications(otherUserId);
      
      setOtherUserData({
        trustScore,
        verifications
      });
    } catch (error) {
      console.error('Error loading other user data:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const messageData = {
        conversationId,
        senderId: user.uid,
        senderName: user.name || user.email,
        receiverId: otherUserId,
        text: newMessage.trim(),
        type: 'text',
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update conversation
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: 1
      });

      // Update response time for trust score
      await TrustScoreService.updateResponseTime(user.uid, 0.1); // Very fast response

      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleTradeActionComplete = (action) => {
    // Refresh data after trade actions
    console.log('Trade action completed:', action);
    
    // Show success message
    const actionMessages = {
      accepted: 'Trade offer accepted! 🎉',
      declined: 'Trade offer declined',
      counter_offered: 'Counter offer sent',
      boot_added: 'Cash/boot added to trade'
    };
    
    if (actionMessages[action]) {
      Alert.alert('Success', actionMessages[action]);
    }
  };

  const renderMessage = ({ item: message }) => {
    const isOwnMessage = message.senderId === user.uid;
    const isSystemMessage = message.type === 'system';

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>{message.text}</Text>
            {message.actionData && (
              <View style={styles.systemMessageDetails}>
                {message.actionData.bootAmount > 0 && (
                  <Text style={styles.bootInfo}>
                    💰 {message.actionData.bootAmount} {message.actionData.bootType}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {message.createdAt?.toDate?.()?.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) || 'Sending...'}
          </Text>
        </View>
      </View>
    );
  };

  const renderTradeOffer = (tradeOffer) => {
    return (
      <View key={tradeOffer.id} style={styles.tradeOfferContainer}>
        <View style={styles.tradeOfferHeader}>
          <Ionicons name="swap-horizontal" size={20} color="#FF6B6B" />
          <Text style={styles.tradeOfferTitle}>
            {tradeOffer.type === 'counter_offer' ? 'Counter Offer' : 'Trade Offer'}
          </Text>
          <View style={styles.tradeOfferStatus}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(tradeOffer.status) }
            ]}>
              {tradeOffer.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {tradeOffer.bootAmount > 0 && (
          <View style={styles.bootDisplay}>
            <Ionicons name="cash" size={16} color="#4CAF50" />
            <Text style={styles.bootText}>
              +{tradeOffer.bootAmount} {tradeOffer.bootType} boot
            </Text>
          </View>
        )}

        {tradeOffer.message && (
          <Text style={styles.tradeOfferMessage}>"{tradeOffer.message}"</Text>
        )}

        <TradeActionButtons
          tradeOffer={tradeOffer}
          currentUserId={user.uid}
          onActionComplete={handleTradeActionComplete}
          style={styles.actionButtons}
        />
      </View>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FF9800',
      accepted: '#4CAF50',
      declined: '#F44336',
      countered: '#2196F3'
    };
    return colors[status] || '#666';
  };

  const activeTradeOffer = tradeOffers.find(offer => 
    ['pending', 'accepted'].includes(offer.status)
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Trust Info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.userNameContainer}>
            <Text style={styles.headerTitle}>{otherUserName}</Text>
            {otherUserData?.verifications && (
              <VerificationBadges 
                verifications={otherUserData.verifications} 
                size="small" 
                maxVisible={2} 
              />
            )}
          </View>
          {otherUserData?.trustScore && (
            <Text style={styles.trustInfo}>
              Trust Score: {otherUserData.trustScore.score} • {otherUserData.trustScore.level.name}
            </Text>
          )}
        </View>

        {otherUserData?.trustScore && (
          <TrustScoreDisplay
            score={otherUserData.trustScore.score}
            level={otherUserData.trustScore.level}
            size="small"
          />
        )}
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Active Trade Offer */}
        {activeTradeOffer && renderTradeOffer(activeTradeOffer)}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={loading || !newMessage.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? 'white' : '#ccc'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 8,
  },
  trustInfo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: '#FF6B6B',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '90%',
  },
  systemMessageText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  systemMessageDetails: {
    marginTop: 4,
    alignItems: 'center',
  },
  bootInfo: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  tradeOfferContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeOfferTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  tradeOfferStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bootDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bootText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  tradeOfferMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButtons: {
    marginTop: 8,
  },
  inputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
});
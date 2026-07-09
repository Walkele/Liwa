import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

// Existing imports
import { LiwaSOPService } from '../services/LiwaSOPService';
import ContactSharingModal from '../components/ContactSharingModal';
import OfferComparisonAlert from '../components/OfferComparisonAlert';
import CounterOfferModal from '../components/CounterOfferModal';
import SafetyCodeVerification from '../components/SafetyCodeVerification';
import ReOfferButton from '../components/ReOfferButton';
import { OfferComparisonService } from '../services/OfferComparisonService';
import { EnhancedOfferService } from '../services/EnhancedOfferService';
import { ReOfferService } from '../services/ReOfferService';
import { SafetyHandshakeService } from '../services/SafetyHandshakeService';
import { TradeManagementService } from '../services/TradeManagementService';
import { NotificationService } from '../services/notificationService';
import { TradeStateEngine } from '../services/TradeStateEngine';
import { SOPConsistencyService } from '../services/SOPConsistencyService';
import { UnifiedMessageService } from '../services/UnifiedMessageService';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';
import SOPFixButton from '../components/SOPFixButton';
import TradeStepProgression from '../components/TradeStepProgression';

// NEW: Confusion Killer System imports
import { TradeStatusBadge } from '../components/TradeStatusBadge';
import { DynamicTradeButtons } from '../components/DynamicTradeButtons';
import { ItemLockIndicator } from '../components/ItemLockIndicator';
import { ValueMeter } from '../components/ValueMeter';
import { DeclineReasonModal } from '../components/DeclineReasonModal';
import { TradeTray } from '../components/TradeTray';
import { OfflineQRFallback } from '../components/OfflineQRFallback';
import { WhatsNextFooter } from '../components/WhatsNextFooter';
import { TradeConfirmationStatus } from '../components/TradeConfirmationStatus';
import { ConfusionKillerService } from '../services/ConfusionKillerService';
import { SOPCompliantTradeService } from '../services/SOPCompliantTradeService';
import { SOPValidationService } from '../services/SOPValidationService';

export default function EnhancedChatScreenWithConfusionKiller({ route, navigation }) {
  const { conversationId, otherUserId, otherUserName, itemTitle, tradeState, offerContext, tradeContext } = route.params;
  
  // Add error handling for useAuth
  let user;
  try {
    const authContext = useAuth();
    user = authContext?.user;
  } catch (error) {
    console.error('Error accessing AuthContext:', error);
    user = { uid: 'fallback', email: 'fallback@example.com', displayName: 'User' };
  }
  
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading user information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Existing state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sopState, setSOPState] = useState(tradeState);
  const [showSOPActions, setShowSOPActions] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showOfferComparison, setShowOfferComparison] = useState(false);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [showSafetyVerification, setShowSafetyVerification] = useState(false);
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState(null);
  const [currentOfferContext, setCurrentOfferContext] = useState(offerContext);
  const [isTyping, setIsTyping] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const flatListRef = useRef(null);
  const inputHeight = useRef(new Animated.Value(44)).current;

  // NEW: Confusion Killer state
  const [tradeStatus, setTradeStatus] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineProposalData, setDeclineProposalData] = useState(null);
  const [showBrowseInventory, setShowBrowseInventory] = useState(false);
  const [itemLockStatus, setItemLockStatus] = useState({});
  const [showOfflineQR, setShowOfflineQR] = useState(false);
  const [canSendNudge, setCanSendNudge] = useState(false);

  // NEW: Load trade status using Confusion Killer service
  useEffect(() => {
    const loadTradeStatus = async () => {
      if (!conversationId || !user?.uid) return;
      
      try {
        const status = await ConfusionKillerService.getTradeStatus(conversationId, user.uid);
        setTradeStatus(status);
        
        // Check nudge eligibility
        const nudgeStatus = await ConfusionKillerService.canSendNudge(conversationId, user.uid);
        setCanSendNudge(nudgeStatus.canNudge);
        
      } catch (error) {
        console.error('Error loading trade status:', error);
      }
    };

    loadTradeStatus();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadTradeStatus, 10000);
    return () => clearInterval(interval);
  }, [conversationId, user?.uid, messages]);

  // NEW: Load item lock status for items in conversation
  useEffect(() => {
    const loadItemLockStatus = async () => {
      if (!messages.length) return;
      
      const itemIds = new Set();
      messages.forEach(msg => {
        if (msg.proposerItemId) itemIds.add(msg.proposerItemId);
        if (msg.targetItemId) itemIds.add(msg.targetItemId);
        if (msg.itemId) itemIds.add(msg.itemId);
      });
      
      const lockStatuses = {};
      for (const itemId of itemIds) {
        try {
          const status = await ConfusionKillerService.getItemLockStatus(itemId);
          lockStatuses[itemId] = status;
        } catch (error) {
          console.error(`Error loading lock status for item ${itemId}:`, error);
        }
      }
      
      setItemLockStatus(lockStatuses);
    };

    loadItemLockStatus();
  }, [messages]);

  // Existing useEffect for messages
  useEffect(() => {
    if (!conversationId) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      
      const latestSOPMessage = messagesList
        .filter(msg => msg.isSystemMessage && msg.sopState)
        .pop();
      
      if (latestSOPMessage && latestSOPMessage.sopState !== sopState) {
        setSOPState(latestSOPMessage.sopState);
      }
    });

    return unsubscribe;
  }, [conversationId]);

  // NEW: Enhanced message sending with validation
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      // Validate the action before sending
      const validation = await ConfusionKillerService.validateTradeAction(
        conversationId, 
        'send_message', 
        user.uid,
        { messageText: newMessage.trim() }
      );

      if (!validation.valid) {
        Alert.alert('Cannot Send Message', validation.errors.join('\n'));
        return;
      }

      await OfferComparisonService.trackChatNegotiation(
        conversationId,
        newMessage.trim(),
        user.uid
      );

      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        receiverId: otherUserId,
        text: newMessage.trim(),
        messageType: 'text',
        isSystemMessage: false,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: 1
      });

      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Enhanced trade proposal handling with confusion killer features
  const handleTradeProposalAction = async (action, messageData) => {
    try {
      setLoading(true);
      
      // Validate action first
      const validation = await ConfusionKillerService.validateTradeAction(
        conversationId, 
        action === 'accept' ? 'accept_proposal' : 'decline_proposal', 
        user.uid,
        messageData
      );

      if (!validation.valid) {
        Alert.alert('Cannot Proceed', validation.errors.join('\n'));
        return;
      }

      if (action === 'decline') {
        // Show decline reason modal instead of immediate decline
        setDeclineProposalData(messageData);
        setShowDeclineModal(true);
        return;
      }

      if (action === 'accept') {
        // Check for simultaneous accepts
        const simultaneousCheck = await ConfusionKillerService.handleSimultaneousAccept(
          conversationId, 
          user.uid, 
          messageData.tradeProposalId
        );

        if (!simultaneousCheck.success) {
          Alert.alert('Trade No Longer Available', simultaneousCheck.reason);
          return;
        }

        // Proceed with existing acceptance logic
        const proposalData = {
          proposerUserId: messageData.proposerUserId,
          targetUserId: messageData.targetUserId,
          proposerItemId: messageData.proposerItemId,
          targetItemId: messageData.targetItemId,
          proposerItemTitle: messageData.proposerItemTitle,
          targetItemTitle: messageData.targetItemTitle,
          conversationId: conversationId,
          targetUserName: user.displayName || user.email
        };

        await proceedWithTradeAcceptance(proposalData, messageData.tradeProposalId);
      }
      
    } catch (error) {
      console.error('❌ Error handling trade proposal action:', error);
      Alert.alert('Error', `Failed to ${action} trade proposal. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle decline with reason
  const handleDeclineWithReason = async (reason, reasonText) => {
    try {
      if (!declineProposalData) return;

      // Update the original message status to declined
      const messageQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'trade_proposal'),
        where('tradeProposalId', '==', declineProposalData.tradeProposalId)
      );
      
      const messageSnapshot = await getDocs(messageQuery);
      if (!messageSnapshot.empty) {
        const messageDoc = messageSnapshot.docs[0];
        await updateDoc(doc(db, 'messages', messageDoc.id), {
          status: 'declined',
          tradeStatus: 'declined',
          declinedAt: serverTimestamp(),
          declinedBy: user.uid,
          declineReason: reason,
          declineReasonText: reasonText
        });
      }

      // Send enhanced decline message with reason
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        `❌ Trade proposal declined.\n\nReason: ${reasonText}\n\n${reason === 'need_more_cash' ? '💡 Consider adjusting your offer based on this feedback.' : ''}`,
        'trade_declined',
        'declined',
        {
          declineReason: reason,
          declineReasonText: reasonText,
          hasActionButtons: true,
          actionButtonText: 'Make New Offer'
        }
      );

      // Update item availability
      if (declineProposalData.targetItemId) {
        await ReOfferService.updateItemAvailabilityAfterDecline(declineProposalData.targetItemId);
      }
      if (declineProposalData.proposerItemId) {
        await ReOfferService.updateItemAvailabilityAfterDecline(declineProposalData.proposerItemId);
      }

      Alert.alert('Trade Declined', 'Your response has been sent with the reason provided.');
      
    } catch (error) {
      console.error('Error declining with reason:', error);
      Alert.alert('Error', 'Failed to decline proposal. Please try again.');
    }
  };

  // NEW: Handle nudge sending
  const handleSendNudge = async () => {
    try {
      if (!canSendNudge) {
        Alert.alert('Cannot Send Nudge', 'You must wait 24 hours between nudges.');
        return;
      }

      await ConfusionKillerService.sendNudge(conversationId, user.uid, 'general');
      Alert.alert('Nudge Sent', 'A friendly reminder has been sent to the other party.');
      setCanSendNudge(false);
      
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // NEW: Handle browse inventory
  const handleBrowseInventory = () => {
    navigation.navigate('Profile', { 
      userId: otherUserId,
      userName: otherUserName,
      mode: 'browse_inventory'
    });
  };

  // NEW: Handle item lock navigation
  const handleNavigateToLockingTrade = (tradeId) => {
    navigation.navigate('Chat', { 
      conversationId: tradeId,
      // Add other required params
    });
  };

  // Existing helper functions (keeping the same)
  const proceedWithTradeAcceptance = async (proposalData, tradeProposalId) => {
    try {
      const result = await LiwaSOPService.acceptTradeProposalSOP(
        tradeProposalId, 
        user.uid, 
        proposalData
      );

      setCurrentOfferContext({
        offerId: result.offerId,
        itemId: proposalData.targetItemId,
        itemTitle: proposalData.targetItemTitle
      });

      await UnifiedMessageService.createTradeAcceptanceMessage(
        conversationId,
        otherUserName,
        result.offerId
      );

      Alert.alert(
        'Trade Proposal Accepted!',
        'Trade proposal accepted! Both parties have 24 hours to commit. Items will be locked only after both commit.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error in trade acceptance:', error);
      throw error;
    }
  };

  // NEW: Enhanced message rendering with confusion killer components
  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === user.uid;
    const isSystemMessage = item.isSystemMessage;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const showTimestamp = index === 0 || 
      (item.createdAt?.toDate?.() && messages[index - 1]?.createdAt?.toDate?.() &&
       item.createdAt.toDate().getTime() - messages[index - 1].createdAt.toDate().getTime() > 300000);

    if (isSystemMessage) {
      const isTradeProposalMessage = item.text && (
        item.text.includes('proposed a trade') || 
        item.text.includes('Trade Proposal') ||
        item.messageType === 'trade_proposal'
      );

      const isProposer = item.proposerUserId === user.uid;
      const isTarget = item.targetUserId === user.uid;

      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessageCard}>
            {/* System message header */}
            <View style={styles.systemMessageHeader}>
              <View style={styles.systemIconContainer}>
                <Ionicons name="information-circle" size={20} color="#2196F3" />
              </View>
              <Text style={styles.systemMessageTitle}>SwipeIt System</Text>
            </View>
            
            <Text style={styles.systemMessageText}>{item.text}</Text>

            {/* NEW: Show item lock indicators if items are locked */}
            {(item.proposerItemId || item.targetItemId) && (
              <View style={styles.itemLockSection}>
                {item.proposerItemId && itemLockStatus[item.proposerItemId]?.locked && (
                  <ItemLockIndicator
                    itemId={item.proposerItemId}
                    lockType={itemLockStatus[item.proposerItemId].lockType}
                    lockingTradeId={itemLockStatus[item.proposerItemId].lockingTradeId}
                    onNavigateToTrade={handleNavigateToLockingTrade}
                    style={styles.itemLockIndicator}
                  />
                )}
                {item.targetItemId && itemLockStatus[item.targetItemId]?.locked && (
                  <ItemLockIndicator
                    itemId={item.targetItemId}
                    lockType={itemLockStatus[item.targetItemId].lockType}
                    lockingTradeId={itemLockStatus[item.targetItemId].lockingTradeId}
                    onNavigateToTrade={handleNavigateToLockingTrade}
                    style={styles.itemLockIndicator}
                  />
                )}
              </View>
            )}

            {/* NEW: Show value meter for trade proposals */}
            {isTradeProposalMessage && item.proposerItemId && item.targetItemId && (
              <ValueMeter
                yourItems={isTarget ? [{ 
                  id: item.targetItemId, 
                  title: item.targetItemTitle, 
                  estimatedValue: item.targetItemValue || 0 
                }] : [{ 
                  id: item.proposerItemId, 
                  title: item.proposerItemTitle, 
                  estimatedValue: item.proposerItemValue || 0 
                }]}
                theirItems={isTarget ? [{ 
                  id: item.proposerItemId, 
                  title: item.proposerItemTitle, 
                  estimatedValue: item.proposerItemValue || 0 
                }] : [{ 
                  id: item.targetItemId, 
                  title: item.targetItemTitle, 
                  estimatedValue: item.targetItemValue || 0 
                }]}
                cashAmount={item.cashAmount || 0}
                cashDirection={isTarget ? "you_receive" : "you_pay"}
                style={styles.valueMeter}
              />
            )}

            {/* NEW: Dynamic trade buttons instead of static ones */}
            {isTradeProposalMessage && isTarget && (!item.status || item.status === 'pending') && (
              <DynamicTradeButtons
                userRole="receiver"
                tradeState="proposed"
                proposalData={item}
                onAccept={() => handleTradeProposalAction('accept', item)}
                onCounter={() => handleCounterOffer(item)}
                onDecline={() => handleTradeProposalAction('decline', item)}
                onBrowseInventory={handleBrowseInventory}
                disabled={loading}
              />
            )}

            {/* Show status for proposers */}
            {isTradeProposalMessage && isProposer && (
              <DynamicTradeButtons
                userRole="proposer"
                tradeState="proposed"
                proposalData={item}
                onWithdraw={() => handleWithdrawProposal(item)}
                onBrowseInventory={handleBrowseInventory}
                disabled={loading}
              />
            )}

            {/* NEW: Trade confirmation status for bilateral steps */}
            {item.messageType === 'bilateral_confirmation' && (
              <TradeConfirmationStatus
                conversationId={conversationId}
                step={item.step}
                currentUserId={user.uid}
                onConfirm={() => handleConfirmTradeStep(item.step)}
                style={styles.confirmationStatus}
              />
            )}
          </View>
        </View>
      );
    }

    // Regular message rendering (unchanged)
    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>
              {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.otherMessageRow
        ]}>
          {showAvatar && !isMyMessage && (
            <View style={styles.avatarContainer}>
              <View style={styles.messageAvatar}>
                <Text style={styles.avatarText}>
                  {otherUserName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          
          <View style={[
            styles.messageContent,
            isMyMessage ? styles.myMessageContent : styles.otherMessageContent,
            !showAvatar && !isMyMessage && styles.messageContentWithoutAvatar
          ]}>
            {!isMyMessage && showAvatar && (
              <Text style={styles.senderName}>{item.senderName}</Text>
            )}
            
            <View style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {item.text}
              </Text>
              
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                  {item.createdAt?.toDate?.()?.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) || 'Now'}
                </Text>
                
                {isMyMessage && (
                  <View style={styles.messageStatus}>
                    <Ionicons 
                      name={item.read ? "checkmark-done" : "checkmark"} 
                      size={14} 
                      color={item.read ? "#4CAF50" : "rgba(255, 255, 255, 0.7)"} 
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // NEW: Get next step description for footer
  const getNextStepInfo = () => {
    if (!tradeStatus) return null;

    const nextStepDescription = ConfusionKillerService.getNextStepDescription(
      tradeStatus.tradeState,
      tradeStatus.userRole,
      { /* trade data would go here */ }
    );

    return {
      nextStep: tradeStatus.tradeState,
      nextStepDescription,
      actionRequired: tradeStatus.isWaitingForUser,
      actionButtonText: tradeStatus.nextAction,
      timeRemaining: null // Would be calculated from trade expiration
    };
  };

  // Placeholder functions for missing handlers
  const handleCounterOffer = (item) => {
    const originalOffer = {
      id: item.tradeProposalId || item.id,
      cashAmount: item.cashAmount || 0,
      tradeType: 'item_trade',
      itemIds: [item.proposerItemId, item.targetItemId].filter(Boolean),
      reason: item.text || ''
    };
    
    setSelectedOfferForCounter(originalOffer);
    setShowCounterOfferModal(true);
  };

  const handleWithdrawProposal = async (item) => {
    Alert.alert(
      'Withdraw Proposal',
      'Are you sure you want to withdraw this trade proposal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Withdraw', 
          style: 'destructive',
          onPress: async () => {
            // Implementation for withdrawing proposal
            console.log('Withdrawing proposal:', item.id);
          }
        }
      ]
    );
  };

  const handleConfirmTradeStep = async (step) => {
    try {
      const result = await BilateralTradeConfirmationService.confirmTradeStep(
        conversationId,
        step,
        user.uid,
        { confirmedAt: new Date() }
      );
      
      if (result.bothConfirmed) {
        Alert.alert('Step Confirmed!', result.message);
      } else {
        Alert.alert('Confirmation Sent', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm step: ' + error.message);
    }
  };

  const handleCounterOfferSent = (result) => {
    console.log('Counter-offer sent:', result);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Enhanced Header with Trade Status Badge */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{otherUserName}</Text>
              <Text style={styles.headerSubtitle}>{itemTitle}</Text>
            </View>
          </View>
          
          {/* NEW: Trade Status Badge in header */}
          {tradeStatus && (
            <TradeStatusBadge
              userRole={tradeStatus.userRole}
              tradeState={tradeStatus.tradeState}
              isWaitingForUser={tradeStatus.isWaitingForUser}
              nextAction={tradeStatus.nextAction}
              style={styles.headerStatusBadge}
            />
          )}
          
          <View style={styles.headerActions}>
            {/* NEW: Nudge button */}
            {canSendNudge && (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={handleSendNudge}
              >
                <Ionicons name="notifications" size={20} color="white" />
              </TouchableOpacity>
            )}
            
            <SOPFixButton 
              conversationId={conversationId}
              style={styles.sopFixButton}
            />
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowSOPActions(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />

        {/* NEW: What's Next Footer */}
        {(() => {
          const nextStepInfo = getNextStepInfo();
          return nextStepInfo ? (
            <WhatsNextFooter
              nextStep={nextStepInfo.nextStep}
              nextStepDescription={nextStepInfo.nextStepDescription}
              actionRequired={nextStepInfo.actionRequired}
              actionButtonText={nextStepInfo.actionButtonText}
              timeRemaining={nextStepInfo.timeRemaining}
              onActionPress={() => {
                // Handle next action
                console.log('Next action pressed');
              }}
            />
          ) : null;
        })()}

        {/* Enhanced Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowImagePicker(true)}
            >
              <Ionicons name="add" size={24} color="#666" />
            </TouchableOpacity>
            
            <Animated.View style={[styles.inputWrapper, { height: inputHeight }]}>
              <TextInput
                style={styles.messageInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                multiline={true}
                maxLength={500}
                onContentSizeChange={(event) => {
                  const height = Math.max(44, Math.min(100, event.nativeEvent.contentSize.height + 20));
                  Animated.timing(inputHeight, {
                    toValue: height,
                    duration: 100,
                    useNativeDriver: false,
                  }).start();
                }}
              />
            </Animated.View>
            
            <TouchableOpacity
              style={[
                styles.sendButton, 
                { 
                  opacity: newMessage.trim() ? 1 : 0.5,
                  backgroundColor: newMessage.trim() ? '#FF6B6B' : '#ccc'
                }
              ]}
              onPress={sendMessage}
              disabled={loading || !newMessage.trim()}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* NEW: Decline Reason Modal */}
        <DeclineReasonModal
          visible={showDeclineModal}
          onClose={() => setShowDeclineModal(false)}
          onDecline={handleDeclineWithReason}
          proposalData={declineProposalData}
        />

        {/* NEW: Offline QR Fallback */}
        <Modal
          visible={showOfflineQR}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowOfflineQR(false)}
        >
          <OfflineQRFallback
            conversationId={conversationId}
            currentUserId={user.uid}
            onCodeConfirmed={(result) => {
              console.log('Offline QR confirmed:', result);
              setShowOfflineQR(false);
            }}
          />
        </Modal>

        {/* Existing modals */}
        <ContactSharingModal
          visible={showContactModal}
          onClose={() => setShowContactModal(false)}
          offerId={currentOfferContext?.offerId}
          conversationId={conversationId}
          otherUserName={otherUserName}
          onContactShared={async (contactData) => {
            console.log('Contact shared:', contactData);
            setShowContactModal(false);
          }}
        />

        <CounterOfferModal
          visible={showCounterOfferModal}
          onClose={() => setShowCounterOfferModal(false)}
          originalOffer={selectedOfferForCounter}
          userId={user.uid}
          onCounterOfferSent={handleCounterOfferSent}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Enhanced styles with new components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF6B6B',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerStatusBadge: {
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  timestampContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContent: {
    maxWidth: '75%',
  },
  myMessageContent: {
    alignItems: 'flex-end',
  },
  otherMessageContent: {
    alignItems: 'flex-start',
  },
  messageContentWithoutAvatar: {
    marginLeft: 40,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    backgroundColor: '#FF6B6B',
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#999',
  },
  messageStatus: {
    marginLeft: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  systemMessageCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 16,
    maxWidth: '90%',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  systemMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  systemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  systemMessageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  systemMessageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  // NEW: Confusion Killer component styles
  itemLockSection: {
    marginTop: 12,
  },
  itemLockIndicator: {
    marginBottom: 8,
  },
  valueMeter: {
    marginTop: 12,
  },
  confirmationStatus: {
    marginTop: 12,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    marginRight: 12,
  },
  messageInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sopFixButton: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
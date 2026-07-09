import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Dimensions, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import LiwaNextStepCard from '../components/LiwaNextStepCard';
import TradeInfoDisplay from '../components/TradeInfoDisplay';
import CounterOfferTrackingService from '../services/CounterOfferTrackingService';
import MeetingArrangementModal from '../components/MeetingArrangementModal';
import ConversationStatusBanner from '../components/ConversationStatusBanner';
import SystemMessage from '../components/SystemMessage';
import ServiceOfferCard from '../components/ServiceOfferCard';
import { MatchChatHeader } from '../components/MatchChatHeader';
import ServiceCounterOfferCard from '../components/ServiceCounterOfferCard';
import ServiceStepProgression from '../components/ServiceStepProgression';
import ServiceProgressTracker from '../components/ServiceProgressTracker';
import ServicePaymentConfirmation from '../components/ServicePaymentConfirmation';
import { ItemArchiveService } from '../services/ItemArchiveService';
import { TradeSecurityService } from '../services/TradeSecurityService';
import { ConversationLifecycleService } from '../services/ConversationLifecycleService';
import { TradeNegotiationService } from '../services/TradeNegotiationService';
import { EscrowService } from '../services/EscrowService';
import ItemSelectionModal from '../components/ItemSelectionModal';
import TradeNegotiationStatus from '../components/TradeNegotiationStatus';

const { width } = Dimensions.get('window');

export default function ChatScreen({ route, navigation }) {
  const { conversationId, otherUserId, otherUserName, itemTitle, targetItem, myItem, matchData } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [conversationStatus, setConversationStatus] = useState(null);
  const flatListRef = useRef();
  
  // Service flow state
  const [isServiceConversation, setIsServiceConversation] = useState(false);
  const [serviceStage, setServiceStage] = useState(null);
  const [serviceData, setServiceData] = useState(null);

  // Trade negotiation state
  const [showTradeProposal, setShowTradeProposal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shareContactStep, setShareContactStep] = useState(null);
  const [shareContactTrade, setShareContactTrade] = useState(null);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [activeTradeProposal, setActiveTradeProposal] = useState(null);
  const [escrowStatus, setEscrowStatus] = useState(null);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [conversationData, setConversationData] = useState(null);

  // Load conversation details
  useEffect(() => {
    if (!conversationId) return;

    // Load conversation status
    loadConversationStatus();
    
    // Detect if this is a service conversation
    const isService = conversationId.startsWith('service_');
    setIsServiceConversation(isService);
    console.log('🔧 Is service conversation:', isService, 'conversationId:', conversationId);

    // Load other user profile if not in conversation data
    if (otherUserId && !conversationData?.participantPhotos?.[otherUserId]) {
      loadOtherUserProfile();
    } else if (conversationData?.participantPhotos?.[otherUserId]) {
      setOtherUserProfile({ profilePhoto: conversationData.participantPhotos[otherUserId] });
    }

    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
      
      // Auto-scroll to bottom when new messages arrive
      if (flatListRef.current && messagesData.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      
      // Update service stage if this is a service conversation
      if (isService) {
        updateServiceStage(messagesData);
      }
    });

    return unsubscribe;
  }, [conversationId, otherUserId]);

  // Load conversation data with photos
  useEffect(() => {
    if (!conversationId) return;

    const loadConversationData = async () => {
      try {
        const conversationDoc = await getDoc(doc(db, 'messages', conversationId));
        if (conversationDoc.exists()) {
          const data = conversationDoc.data();
          setConversationData(data);
          
          // Set other user profile photo from conversation data
          if (otherUserId && data.participantPhotos?.[otherUserId]) {
            setOtherUserProfile({ profilePhoto: data.participantPhotos[otherUserId] });
          }
        }
      } catch (error) {
        console.error('Error loading conversation data:', error);
      }
    };

    loadConversationData();
  }, [conversationId, otherUserId]);

  const loadOtherUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        setOtherUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading other user profile:', error);
    }
  };

  // Reset conversation tracking when leaving chat
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      console.log('🔄 Leaving conversation:', conversationId);
      // This would communicate back to MatchesScreen to reset the active conversation
      // For now, we'll just log it
    });

    return unsubscribe;
  }, [navigation, conversationId]);

  const loadConversationStatus = async () => {
    try {
      const status = await ConversationLifecycleService.getConversationStatus(conversationId);
      setConversationStatus(status);
    } catch (error) {
      console.error('Error loading conversation status:', error);
    }
  };
  
  // Update service stage based on messages
  const updateServiceStage = (messagesData) => {
    console.log('🔧 Updating service stage from messages:', messagesData.length);
    
    // Find the service offer message
    const serviceMessage = messagesData.find(msg => 
      msg.messageType === 'service_offer_created' || 
      msg.isServiceMessage ||
      msg.messageType === 'service_offer'
    );
    
    if (serviceMessage) {
      console.log('🔧 Found service message:', serviceMessage);
      setServiceData(serviceMessage);
      
      // Determine current stage based on message data
      let currentStage = 'pending';
      
      if (serviceMessage.serviceStage) {
        currentStage = serviceMessage.serviceStage;
      } else if (serviceMessage.status === 'accepted') {
        currentStage = 'service_accepted';
      } else if (serviceMessage.status === 'pending') {
        currentStage = 'pending';
      }
      
      // Check for service progress messages to determine more advanced stages
      const hasServiceStarted = messagesData.some(msg => 
        msg.messageType === 'service_bilateral_confirmation' && 
        msg.step === 'service_started' &&
        msg.stepCompleted
      );
      
      const hasServiceCompleted = messagesData.some(msg => 
        msg.messageType === 'service_bilateral_confirmation' && 
        msg.step === 'service_completed' &&
        msg.stepCompleted
      );
      
      if (hasServiceCompleted) {
        currentStage = 'service_finished';
      } else if (hasServiceStarted) {
        currentStage = 'service_in_progress';
      }
      
      console.log('🔧 Service stage determined:', currentStage);
      setServiceStage(currentStage);
    } else {
      console.log('🔧 No service message found');
      setServiceData(null);
      setServiceStage(null);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Check if conversation allows new messages
    if (conversationStatus && conversationStatus.exists && conversationStatus.canSendMessages === false) {
      Alert.alert(
        'Conversation Archived',
        'This conversation has been archived and no new messages can be sent. You can still view the message history.',
        [{ text: 'OK' }]
      );
      return;
    }

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      setLoading(true);
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: user.uid,
        text: messageToSend,
        createdAt: serverTimestamp(),
        messageType: 'text'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Restore message if failed
      setNewMessage(messageToSend);
      
      // Show specific error message based on error type
      let errorMessage = 'Failed to send message';
      let showRetry = true;
      
      if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to send messages in this conversation';
        showRetry = false;
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection';
      } else if (error.code === 'not-found') {
        errorMessage = 'Conversation not found. It may have been deleted';
        showRetry = false;
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        showRetry ? [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry',
            onPress: () => {
              setNewMessage(messageToSend);
              sendMessage();
            }
          }
        ] : [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCleanAction = async (actionType, data) => {
    console.log('Action:', actionType, data);
    
    try {
      switch (actionType) {
        case 'accept_offer':
          await handleAcceptOffer(data);
          break;
        case 'decline_offer':
          await handleDeclineOffer(data);
          break;
        case 'make_counter_offer':
          await handleMakeCounterOffer(data);
          break;
        case 'accept_counter_offer':
          await handleAcceptCounterOffer(data);
          break;
        case 'decline_counter_offer':
          await handleDeclineCounterOffer(data);
          break;
        case 'start_trade_negotiation':
          await handleStartTradeNegotiation(data);
          break;
        case 'confirm_step':
          await handleConfirmStep(data);
          break;
        case 'meeting_arranged':
          await handleMeetingArranged(data);
          break;
        case 'meeting_proposed':
          await handleMeetingProposed(data);
          break;
        case 'share_contact':
          await handleShareContact(data);
          break;
        case 'qr_verification':
          await handleQRVerification(data);
          break;
        case 'cancel_trade':
          await handleCancelTrade(data);
          break;
        default:
          console.log('Unknown action:', actionType);
      }
    } catch (error) {
      console.error('Error handling action:', error);
      Alert.alert('Error', 'Failed to perform action');
    }
  };

  const handleTradeAction = async (action) => {
    console.log('Trade action:', action);
    
    if (!activeTradeProposal) return;

    try {
      switch (action) {
        case 'accept':
          await TradeNegotiationService.acceptProposal(activeTradeProposal.id, user.uid);
          break;
        case 'counter':
          Alert.alert('Counter Offer', 'Counter offer functionality coming soon');
          break;
        case 'select_items':
          setShowItemSelection(true);
          break;
        case 'agree_terms':
          await TradeNegotiationService.agreeToTerms(activeTradeProposal.id, user.uid, {
            agreedToTerms: true,
            timestamp: new Date().toISOString()
          });
          break;
        case 'confirm_ready':
          await TradeNegotiationService.confirmReadyForExchange(activeTradeProposal.id, user.uid);
          break;
        case 'shipping':
          Alert.alert('Shipping Info', 'Shipping info form coming soon');
          break;
        case 'confirm_receipt':
          await TradeNegotiationService.confirmItemReceived(activeTradeProposal.id, user.uid);
          break;
        default:
          console.log('Unknown trade action:', action);
      }
      
      // Reload proposal data after action
      const result = await TradeNegotiationService.getTradeProposal(activeTradeProposal.id);
      if (result.success) {
        setActiveTradeProposal(result.proposal);
      }
    } catch (error) {
      console.error('Error handling trade action:', error);
      Alert.alert('Error', 'Failed to perform trade action');
    }
  };

  const handleItemSelection = async (selectedItems) => {
    if (!activeTradeProposal) return;

    try {
      await TradeNegotiationService.selectTradeItems(activeTradeProposal.id, selectedItems, user.uid);
      
      // Reload proposal data
      const result = await TradeNegotiationService.getTradeProposal(activeTradeProposal.id);
      if (result.success) {
        setActiveTradeProposal(result.proposal);
      }
    } catch (error) {
      console.error('Error selecting items:', error);
      Alert.alert('Error', 'Failed to select items');
    }
  };

  const handleStartTradeNegotiation = async (data) => {
    try {
      // Use the targetItem from route params if available (from match), otherwise use data from messages
      const itemToUse = targetItem || {
        id: data.itemId,
        title: data.itemTitle || 'Item',
        price: data.estimatedValue || 0,
        estimatedValue: data.estimatedValue || 0
      };
      
      console.log('🎯 Starting trade negotiation with item:', itemToUse);
      console.log('📦 My matched item from route:', myItem);
      console.log('📦 My matched item from data:', data.myItemId, data.myItemTitle);
      
      // Use myItem from route params first, then from data if available
      const myItemToUse = myItem || (data.hasMyItem ? {
        id: data.myItemId,
        title: data.myItemTitle,
        price: data.myItemValue,
        estimatedValue: data.myItemValue
      } : null);
      
      console.log('📦 Final myItem to use:', myItemToUse);
      
      // Navigate to TradeProposalScreen with both matched items data
      navigation.navigate('TradeProposal', {
        targetItem: itemToUse,
        myItem: myItemToUse, // Pass the user's matched item
        otherUserId: otherUserId,
        otherUserName: otherUserName
      });
    } catch (error) {
      console.error('Error starting trade negotiation:', error);
      Alert.alert('Error', 'Failed to start trade negotiation');
    }
  };

  const handleConfirmStep = async (data) => {
    try {
      const { acceptedTrade, step } = data;
      console.log('🎯 Confirming step:', step.id, 'for trade:', acceptedTrade.id);
      
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      const { OfferComparisonService } = await import('../services/OfferComparisonService');
      
      // Check if both parties have confirmed this step
      const currentUserConfirmed = messages.some(msg => 
        msg.messageType === 'trade_step_confirmation' && 
        msg.step === step.id && 
        msg.userId === user.uid
      );
      
      const otherUserConfirmed = messages.some(msg => 
        msg.messageType === 'trade_step_confirmation' && 
        msg.step === step.id && 
        msg.userId !== user.uid
      );
      
      await addDoc(collection(db, 'messages'), {
        conversationId: acceptedTrade.conversationId || conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'You',
        messageType: 'trade_step_confirmation',
        step: step.id,
        stepId: step.id,
        stepTitle: step.title,
        parentMessageId: acceptedTrade.id,
        text: `confirmed: ${step.title}`,
        status: 'confirmed',
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
      
      // If this is the commitment step and the other user already confirmed, hard lock the item
      if (step.id === 'seller_commit' && otherUserConfirmed && !currentUserConfirmed) {
        if (acceptedTrade.itemId) {
          try {
            await OfferComparisonService.hardLockItem(acceptedTrade.itemId, acceptedTrade.id);
            console.log('✅ Item hard-locked after both parties committed');
          } catch (lockError) {
            console.error('Error hard-locking item:', lockError);
          }
        }
      }
      
      console.log('✅ Step confirmation sent');
      Alert.alert('Confirmed', `You have confirmed: ${step.title}`);
    } catch (error) {
      console.error('Error confirming step:', error);
      Alert.alert('Error', 'Failed to confirm step');
    }
  };

  const handleMeetingArranged = async (data) => {
    try {
      const { acceptedTrade, step, meetingData } = data;
      console.log('🎯 Meeting arranged:', meetingData);
      
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      await addDoc(collection(db, 'messages'), {
        conversationId: acceptedTrade.conversationId || conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'You',
        messageType: 'trade_step_confirmation',
        step: step.id,
        stepId: step.id,
        stepTitle: step.title,
        parentMessageId: acceptedTrade.id,
        text: `Meeting arranged: ${meetingData.location} at ${meetingData.time}`,
        meetingData: meetingData,
        status: 'confirmed',
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
      
      console.log('✅ Meeting arrangement sent');
      Alert.alert('Meeting Arranged', `Meeting set for ${meetingData.time} at ${meetingData.location}`);
    } catch (error) {
      console.error('Error arranging meeting:', error);
      Alert.alert('Error', 'Failed to arrange meeting');
    }
  };

  const handleMeetingProposed = async (data) => {
    try {
      const { acceptedTrade, step, proposal } = data;
      console.log('🎯 Meeting proposal:', proposal);
      
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      await addDoc(collection(db, 'messages'), {
        conversationId: acceptedTrade.conversationId || conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'You',
        messageType: 'meeting_proposal',
        step: step.id,
        stepId: step.id,
        stepTitle: step.title,
        parentMessageId: acceptedTrade.id,
        text: `proposed meeting times and locations`,
        meetingProposal: proposal,
        status: 'pending',
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
      
      console.log('✅ Meeting proposal sent');
      Alert.alert('Proposal Sent', 'Your meeting proposal has been sent. Waiting for partner to respond.');
    } catch (error) {
      console.error('Error proposing meeting:', error);
      Alert.alert('Error', 'Failed to send meeting proposal');
    }
  };

  const handleShareContact = async (data) => {
    try {
      const { step, acceptedTrade } = data;
      console.log('🎯 Sharing contact for step:', step.id);
      
      // Set state and show modal
      setShareContactStep(step);
      setShareContactTrade(acceptedTrade);
      setPhoneNumber(user.phoneNumber || user.phone || '');
      setShowContactModal(true);
    } catch (error) {
      console.error('Error preparing contact sharing:', error);
      Alert.alert('Error', 'Failed to prepare contact sharing');
    }
  };

  const handleContactSubmit = async () => {
    try {
      if (!phoneNumber || phoneNumber.trim() === '') {
        Alert.alert('Error', 'Please enter a valid phone number');
        return;
      }

      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');

      await addDoc(collection(db, 'messages'), {
        conversationId: shareContactTrade.conversationId || conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'You',
        messageType: 'trade_step_confirmation',
        step: shareContactStep.id,
        stepId: shareContactStep.id,
        stepTitle: shareContactStep.title,
        parentMessageId: shareContactTrade.id,
        text: `Shared phone number: ${phoneNumber}`,
        contactInfo: phoneNumber,
        status: 'confirmed',
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });

      setShowContactModal(false);
      setPhoneNumber('');
      setShareContactStep(null);
      setShareContactTrade(null);
      
      Alert.alert('Contact Shared', 'Your phone number has been shared with your trading partner');
    } catch (error) {
      console.error('Error sharing contact:', error);
      Alert.alert('Error', 'Failed to share contact');
    }
  };

  const handleQRVerification = async (data) => {
    try {
      const { acceptedTrade, step } = data;
      console.log('🎯 QR verification for step:', step.id);
      
      // Get the actual trade proposal ID from the counter-offer data
      const tradeProposalId = acceptedTrade.parentOfferId || acceptedTrade.originalOfferId || acceptedTrade.id;
      console.log('🎯 Using trade proposal ID:', tradeProposalId);
      
      // Navigate to QR verification screen
      navigation.navigate('QRVerification', {
        tradeId: tradeProposalId,
        otherUserName: acceptedTrade.targetUserName || 'Partner',
        tradeValue: acceptedTrade.cashAmount || 0
      });
    } catch (error) {
      console.error('Error navigating to QR verification:', error);
      Alert.alert('Error', 'Failed to open QR verification');
    }
  };

  const handleCancelTrade = async (data) => {
    try {
      const { acceptedTrade, step, reason, cancelStage } = data;
      console.log('🎯 Cancelling trade at stage:', cancelStage, 'reason:', reason);
      
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      const { OfferComparisonService } = await import('../services/OfferComparisonService');
      
      // Unlock the item if it was locked
      if (acceptedTrade.itemId) {
        try {
          await OfferComparisonService.unlockItem(
            acceptedTrade.itemId, 
            reason, 
            cancelStage
          );
          console.log('✅ Item unlocked successfully');
        } catch (unlockError) {
          console.error('Error unlocking item:', unlockError);
          // Continue with cancellation even if unlock fails
        }
      }
      
      await addDoc(collection(db, 'messages'), {
        conversationId: acceptedTrade.conversationId || conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'You',
        messageType: 'trade_cancellation',
        step: step.id,
        stepId: step.id,
        stepTitle: step.title,
        parentMessageId: acceptedTrade.id,
        text: `cancelled trade: ${reason}`,
        cancelReason: reason,
        cancelStage: cancelStage,
        status: 'cancelled',
        userId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true
      });
      
      console.log('✅ Trade cancellation sent');
      Alert.alert(
        'Trade Cancelled',
        'The trade has been cancelled and the item is now available for other offers.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error cancelling trade:', error);
      Alert.alert('Error', 'Failed to cancel trade');
    }
  };

  const handleServiceAction = async (actionType, serviceOffer, result) => {
    console.log('Service Action:', actionType, serviceOffer, result);
    
    try {
      switch (actionType) {
        case 'accepted':
          // Service offer was accepted - refresh messages to show new system messages
          console.log('✅ Service offer accepted, refreshing conversation');
          // The ServiceOfferService already handles creating system messages
          // Update service stage to show step progression
          setServiceStage('service_accepted');
          break;
          
        case 'declined':
          // Service offer was declined
          console.log('❌ Service offer declined:', result.reason);
          break;
          
        case 'counter':
          // Counter offer requested - for now just focus on message input
          console.log('🔄 Counter offer requested');
          if (result.action === 'message') {
            // Focus on the message input (you could add a ref to the TextInput)
            Alert.alert(
              'Send Message',
              'Use the message input below to negotiate different terms with the service provider.',
              [{ text: 'OK' }]
            );
          }
          break;
          
        default:
          console.log('Unknown service action type:', actionType);
      }
    } catch (error) {
      console.error('Error handling service action:', error);
      Alert.alert('Error', 'Failed to process service action. Please try again.');
    }
  };
  
  // Handle service step actions
  const handleServiceStepAction = async (stepId, actionType, result) => {
    console.log('🔧 Service step action:', stepId, actionType, result);
    
    try {
      if (result.success) {
        // Refresh service stage
        updateServiceStage(messages);
        
        // Show success message
        Alert.alert(
          'Step Confirmed!',
          result.message || 'Service step confirmed successfully',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error handling service step action:', error);
    }
  };
  
  // Handle service counter offer actions
  const handleServiceCounterAction = async (actionType, counterData, result) => {
    console.log('🔄 Service counter action:', actionType, counterData);
    
    try {
      if (actionType === 'accepted') {
        // Counter offer accepted - move to service accepted stage
        setServiceStage('service_accepted');
        
        Alert.alert(
          '✅ Counter Offer Accepted!',
          `Service agreed at $${counterData.counterPrice}. Let's proceed with the service steps.`,
          [{ text: 'Great!' }]
        );
      } else if (actionType === 'declined') {
        // Counter offer declined
        console.log('Counter offer declined:', result?.reason);
      }
    } catch (error) {
      console.error('Error handling service counter action:', error);
    }
  };
  
  // Handle service progress updates
  const handleServiceProgressUpdate = async (updateType, data) => {
    console.log('🔧 Service progress update:', updateType, data);
    
    try {
      if (updateType === 'completed') {
        // Service completed - move to payment stage
        setServiceStage('service_finished');
      }
    } catch (error) {
      console.error('Error handling service progress update:', error);
    }
  };
  
  // Handle payment completion
  const handlePaymentComplete = async () => {
    console.log('🔧 Payment completed!');
    
    try {
      Alert.alert(
        '🎉 Service Transaction Complete!',
        'Both parties have confirmed payment. The service transaction is now complete. Don\'t forget to leave reviews!',
        [
          {
            text: 'Leave Review',
            onPress: () => {
              // Navigate to review screen
              navigation.navigate('ReviewSubmission', {
                conversationId,
                serviceData,
                otherUserId,
                otherUserName
              });
            }
          },
          { text: 'Later', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error handling payment completion:', error);
    }
  };
  
  // Render service flow components based on stage
  const renderServiceFlow = () => {
    if (!isServiceConversation || !serviceData) {
      return null;
    }
    
    const isProvider = user.uid === serviceData.serviceProviderId;
    const isOwner = user.uid === serviceData.sellerId;
    
    return (
      <View>
        {/* Stage 2: Service Accepted - Show Step Progression */}
        {serviceStage === 'service_accepted' && (
          <ServiceStepProgression
            conversationId={conversationId}
            currentUserId={user.uid}
            serviceData={serviceData}
            onStepAction={handleServiceStepAction}
          />
        )}
        
        {/* Stage 3: Service In Progress - Show Progress Tracker */}
        {serviceStage === 'service_in_progress' && (
          <ServiceProgressTracker
            conversationId={conversationId}
            currentUserId={user.uid}
            serviceData={serviceData}
            isProvider={isProvider}
            onProgressUpdate={handleServiceProgressUpdate}
          />
        )}
        
        {/* Stage 4: Service Finished - Show Payment Confirmation */}
        {serviceStage === 'service_finished' && (
          <ServicePaymentConfirmation
            conversationId={conversationId}
            currentUserId={user.uid}
            serviceData={serviceData}
            isOwner={isOwner}
            isProvider={isProvider}
            onPaymentComplete={handlePaymentComplete}
          />
        )}
      </View>
    );
  };

  const handleAcceptOffer = async (offer) => {
    try {
      console.log('🔐 Initiating secure offer acceptance with trade security checks');
      
      // Check trade restrictions before accepting
      const restrictions = await TradeSecurityService.checkTradeRestrictions(user.uid, 'accept_offer');
      
      if (!restrictions.allowed) {
        Alert.alert(
          'Trading Restricted',
          restrictions.message,
          [{ text: 'OK' }]
        );
        return;
      }

      // Show security info if user has restrictions
      if (restrictions.penaltyLevel && restrictions.penaltyLevel !== 'Warning') {
        Alert.alert(
          'Trading Restrictions Active',
          `Your account has ${restrictions.penaltyLevel} restrictions. You can still accept this offer, but please be aware of your current limitations.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => proceedWithAcceptance(offer) }
          ]
        );
      } else {
        await proceedWithAcceptance(offer);
      }

    } catch (error) {
      console.error('Error in secure offer acceptance:', error);
      Alert.alert('Error', 'Failed to process offer acceptance. Please try again.');
    }
  };

  const proceedWithAcceptance = async (offer) => {
    try {
      // Use secure trade acceptance with full security checks
      const securityResult = await TradeSecurityService.secureTradeAcceptance(offer, user.uid);
      
      if (securityResult.success) {
        // Proceed with normal acceptance flow
        await CounterOfferTrackingService.acceptOffer(offer, user);
        
        Alert.alert(
          'Offer Accepted! 🎉', 
          `Trade is now active and items have been locked. ${securityResult.lockingStage.description}`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert('Security Check Failed', 'Unable to accept offer due to security restrictions.');
      }
      
    } catch (error) {
      console.error('Error accepting offer:', error);
      
      // Check if it's a security-related error
      if (error.message.includes('Trade blocked:')) {
        Alert.alert('Trade Blocked', error.message.replace('Trade blocked: ', ''));
      } else {
        Alert.alert('Error', 'Failed to accept offer. Please try again.');
      }
    }
  };

  const handleDeclineOffer = async (offer) => {
    try {
      await CounterOfferTrackingService.declineOffer(offer, user);
      Alert.alert('Declined', 'Offer has been declined.');
    } catch (error) {
      console.error('Error declining offer:', error);
      Alert.alert('Error', 'Failed to decline offer. Please try again.');
    }
  };

  const handleMakeCounterOffer = async (data) => {
    console.log('🎯 handleMakeCounterOffer called with data:', data);
    try {
      // Extract counter-offer data and original offer
      const { counterAmount, counterOfferCount, ...originalOffer } = data;
      console.log('🎯 Extracted counterAmount:', counterAmount, 'counterOfferCount:', counterOfferCount);
      console.log('🎯 Original offer data:', originalOffer);
      
      const result = await CounterOfferTrackingService.createCounterOffer(originalOffer, counterAmount, user);
      console.log('🎯 Counter-offer created successfully:', result);
      
      Alert.alert('Counter-Offer Sent', `Your counter-offer of $${counterAmount} has been sent.`);
    } catch (error) {
      console.error('🚨 Error making counter-offer:', error);
      if (error.message.includes('Maximum')) {
        Alert.alert('Counter-Offer Limit', error.message);
      } else {
        Alert.alert('Error', 'Failed to send counter-offer. Please try again.');
      }
    }
  };

  const handleAcceptCounterOffer = async (counterOffer) => {
    try {
      await CounterOfferTrackingService.acceptOffer(counterOffer, user);
      Alert.alert('Success', 'Counter-offer accepted! Trade is now active.');
    } catch (error) {
      console.error('Error accepting counter-offer:', error);
      Alert.alert('Error', 'Failed to accept counter-offer. Please try again.');
    }
  };

  const handleDeclineCounterOffer = async (counterOffer) => {
    try {
      await CounterOfferTrackingService.declineOffer(counterOffer, user);
      Alert.alert('Declined', 'Counter-offer has been declined.');
    } catch (error) {
      console.error('Error declining counter-offer:', error);
      Alert.alert('Error', 'Failed to decline counter-offer. Please try again.');
    }
  };

  const handleCommitToTrade = async (data) => {
    Alert.alert(
      'Commit to Trade',
      'Are you ready to commit to this trade? This will start the exchange process.',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Commit Now', 
          onPress: async () => {
            await addDoc(collection(db, 'messages'), {
              conversationId,
              senderId: user.uid,
              text: `🤝 ${user.displayName || 'User'} has committed to the trade!`,
              createdAt: serverTimestamp(),
              messageType: 'trade_step_confirmation',
              step: 'seller_commit',
              userId: user.uid
            });
          }
        }
      ]
    );
  };

  const handleStartExchange = async (data) => {
    Alert.alert(
      'Start Exchange',
      'Confirm that you have met and are ready to exchange?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Start Exchange', 
          onPress: async () => {
            await addDoc(collection(db, 'messages'), {
              conversationId,
              senderId: user.uid,
              text: `👥 ${user.displayName || 'User'} started the exchange!`,
              createdAt: serverTimestamp(),
              messageType: 'trade_step_confirmation',
              step: 'exchange_started',
              userId: user.uid
            });
          }
        }
      ]
    );
  };

  const handleCompleteTrade = async (data) => {
    console.log('🏆 handleCompleteTrade called with data:', data);
    
    Alert.alert(
      'Complete Trade',
      'Mark this trade as successfully completed? This will archive the traded items and remove them from listings.',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Complete Trade', 
          onPress: async () => {
            try {
              console.log('🏆 Processing trade completion...');
              
              // Create completion message first
              await addDoc(collection(db, 'messages'), {
                conversationId,
                senderId: user.uid,
                text: `🏆 ${user.displayName || 'User'} completed the trade!`,
                createdAt: serverTimestamp(),
                messageType: 'trade_step_confirmation',
                step: 'trade_completed',
                userId: user.uid
              });

              // Find the accepted trade to get item information
              const acceptedTrade = messages.find(msg => 
                (msg.messageType === 'counter_offer' || msg.messageType === 'trade_proposal') && 
                msg.status === 'accepted'
              );

              if (acceptedTrade) {
                console.log('🏆 Found accepted trade:', acceptedTrade);
                
                // Extract item IDs from the trade
                const itemIds = [];
                
                // Add the main item being traded
                if (acceptedTrade.itemId) {
                  itemIds.push(acceptedTrade.itemId);
                }
                
                // Add any additional items from the trade
                if (acceptedTrade.tradeItems && Array.isArray(acceptedTrade.tradeItems)) {
                  acceptedTrade.tradeItems.forEach(item => {
                    if (item.id) itemIds.push(item.id);
                  });
                }

                // Create trade details for archiving
                const tradeDetails = {
                  tradeId: acceptedTrade.id,
                  conversationId,
                  completedBy: user.uid,
                  completedAt: new Date().toISOString(),
                  tradeType: acceptedTrade.messageType,
                  cashAmount: acceptedTrade.cashAmount || acceptedTrade.newTerms?.cashAmount,
                  participants: [user.uid, otherUserId],
                  completionReason: 'successful_trade'
                };

                console.log('🏆 Archiving items:', itemIds, 'with details:', tradeDetails);

                if (itemIds.length > 0) {
                  // Archive the traded items
                  await ItemArchiveService.archiveTradeItems(itemIds, tradeDetails);
                  console.log('✅ Items archived successfully');
                  
                  Alert.alert(
                    'Trade Completed! 🎉',
                    `Congratulations! Your trade has been completed successfully. The traded items have been archived and removed from listings.`,
                    [{ text: 'Awesome!' }]
                  );
                } else {
                  console.log('⚠️ No items found to archive');
                  Alert.alert(
                    'Trade Completed! 🎉',
                    'Your trade has been marked as completed successfully!',
                    [{ text: 'Great!' }]
                  );
                }
              } else {
                console.log('⚠️ No accepted trade found for archiving');
                Alert.alert(
                  'Trade Completed! 🎉',
                  'Your trade has been marked as completed successfully!',
                  [{ text: 'Great!' }]
                );
              }
            } catch (error) {
              console.error('🚨 Error completing trade:', error);
              Alert.alert(
                'Error',
                'Failed to complete trade. The completion was recorded but items may not have been archived. Please contact support if needed.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleChatMenu = () => {
    setShowChatMenu(true);
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to message you or see your items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add user to blocked list
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                blockedUsers: arrayUnion(otherUserId)
              });
              
              setShowChatMenu(false);
              Alert.alert(
                'User Blocked',
                'This user has been blocked. You will no longer receive messages from them.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReportUser = () => {
    Alert.alert(
      'Report User',
      'Why do you want to report this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Harassment',
          onPress: () => submitReport('harassment')
        },
        {
          text: 'Scam/Fraud',
          onPress: () => submitReport('scam')
        },
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate')
        },
        {
          text: 'Other',
          onPress: () => submitReport('other')
        }
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        reportedUserId: otherUserId,
        conversationId,
        reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setShowChatMenu(false);
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it and take appropriate action.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === user.uid;
    
    // Render system messages with special styling
    if (item.isSystemMessage) {
      return <SystemMessage message={item} />;
    }
    
    // UNIFIED: Handle both trade_proposal and match messages as the same type
    // This prevents duplicate messages for the same item
    if (item.messageType === 'trade_proposal' || item.messageType === 'match') {
      // Check if there's a newer message of the same type for the same item
      const hasNewProposal = messages.some(msg => 
        (msg.messageType === 'trade_proposal' || msg.messageType === 'match') &&
        msg.itemId === item.itemId &&
        msg.createdAt?.toDate?.() > item.createdAt?.toDate?.()
      );
      
      // Only show the most recent one
      if (hasNewProposal) {
        return null;
      }
      
      return null; // Don't render - the SwipeItNextStepCard handles this
    }
    
    // Handle counter-offer messages (these are different from initial proposals)
    if (item.messageType === 'counter_offer') {
      // Check for duplicate counter-offers from the same round
      const hasNewerCounter = messages.some(msg => 
        msg.messageType === 'counter_offer' &&
        msg.parentOfferId === item.parentOfferId &&
        msg.counterOfferRound > (item.counterOfferRound || 0)
      );
      
      if (hasNewerCounter) {
        return null;
      }
      
      return null; // Don't render - the SwipeItNextStepCard handles this
    }
    
    // Render service offer messages as ServiceOfferCard (INLINE)
    if (item.messageType === 'service_offer_created' || item.isServiceMessage) {
      return (
        <ServiceOfferCard
          conversationId={conversationId}
          currentUserId={user.uid}
          messages={[item]} // Pass only this message
          navigation={navigation}
          onServiceAction={handleServiceAction}
        />
      );
    }
    
    // Render service counter offers
    if (item.messageType === 'service_counter_offer') {
      return (
        <ServiceCounterOfferCard
          message={item}
          currentUserId={user.uid}
          onCounterAction={handleServiceCounterAction}
        />
      );
    }
    
    // Use TradeInfoDisplay for trade step confirmations with contact/location info
    if (item.messageType === 'trade_step_confirmation' && (item.contactInfo || item.meetingInfo)) {
      return <TradeInfoDisplay message={item} currentUserId={user.uid} />;
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Enhanced Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              {otherUserProfile?.profilePhoto ? (
                <Image source={{ uri: otherUserProfile.profilePhoto }} style={styles.headerAvatarImage} />
              ) : (
                <Text style={styles.headerAvatarText}>
                  {otherUserName ? otherUserName.charAt(0).toUpperCase() : '?'}
                </Text>
              )}
            </View>
            
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{otherUserName || 'Unknown User'}</Text>
              <Text style={styles.headerSubtitle}>{itemTitle || 'Chat'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerAction} onPress={handleChatMenu}>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Conversation Status Banner */}
        {conversationStatus && conversationStatus.status === 'completed' && (
          <ConversationStatusBanner
            conversationStatus={conversationStatus}
            onViewTradeHistory={() => navigation.navigate('ArchivedItems')}
            onContactSupport={() => {
              Alert.alert(
                'Contact Support',
                'For support with this trade, please email support@swipeit.com',
                [{ text: 'OK' }]
              );
            }}
          />
        )}

        {/* Service Status Banner - Shows clear status for service conversations */}
        {isServiceConversation && serviceData && (
          <View style={styles.serviceStatusBanner}>
            <View style={styles.serviceStatusHeader}>
              <Ionicons 
                name={serviceStage === 'pending' ? 'time-outline' : 
                      serviceStage === 'service_accepted' ? 'checkmark-circle' : 
                      serviceStage === 'service_in_progress' ? 'construct' : 
                      'checkmark-done-circle'} 
                size={20} 
                color={serviceStage === 'pending' ? '#FF9800' : '#4CAF50'} 
              />
              <Text style={styles.serviceStatusTitle}>
                {serviceStage === 'pending' ? '⏳ Awaiting Response' :
                 serviceStage === 'service_accepted' ? '✅ Service Accepted' :
                 serviceStage === 'service_in_progress' ? '🔧 Service In Progress' :
                 '✅ Service Completed'}
              </Text>
            </View>
            
            <View style={styles.serviceStatusDetails}>
              {user.uid === serviceData.sellerId ? (
                // You are the item owner
                <View>
                  <Text style={styles.serviceStatusRole}>👤 You: Item Owner</Text>
                  {serviceStage === 'pending' && (
                    <Text style={styles.serviceStatusAction}>
                      ⚡ Action needed: Review the service offer below and choose to Accept, Decline, or Counter
                    </Text>
                  )}
                  {serviceStage === 'service_accepted' && (
                    <Text style={styles.serviceStatusWaiting}>
                      ⏳ Waiting for service provider to start the work
                    </Text>
                  )}
                </View>
              ) : (
                // You are the service provider
                <View>
                  <Text style={styles.serviceStatusRole}>🔧 You: Service Provider</Text>
                  {serviceStage === 'pending' && (
                    <Text style={styles.serviceStatusWaiting}>
                      ⏳ Waiting for item owner to review your offer
                    </Text>
                  )}
                  {serviceStage === 'service_accepted' && (
                    <Text style={styles.serviceStatusAction}>
                      ⚡ Action needed: Start the service work
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Liwa Next Step Card - Shows only the next action needed (for trades) */}
        {!isServiceConversation && (
          <LiwaNextStepCard
            messages={messages}
            currentUserId={user.uid}
            onAction={handleCleanAction}
            targetItem={targetItem}
            myItem={myItem}
          />
        )}

        {/* Trade Negotiation Status - Shows escrow and negotiation progress */}
        {activeTradeProposal && (
          <TradeNegotiationStatus
            tradeProposalId={activeTradeProposal.id}
            userId={user.uid}
            onAction={handleTradeAction}
          />
        )}

        {/* Service Flow Components - Shows service-specific UI */}
        {renderServiceFlow()}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Area */}
        {conversationStatus && conversationStatus.exists && conversationStatus.canSendMessages === false ? (
          <View style={[styles.inputContainer, styles.disabledInputContainer]}>
            <View style={styles.disabledInput}>
              <Ionicons name="lock-closed" size={16} color="#999" />
              <Text style={styles.disabledInputText}>
                This conversation is archived and read-only
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={!newMessage.trim() || loading}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Contact Sharing Modal */}
        <Modal
          visible={showContactModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowContactModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share Phone Number</Text>
                <TouchableOpacity onPress={() => setShowContactModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDescription}>
                Share your phone number to coordinate the meetup. This will be shared with your trading partner.
              </Text>
              
              <TextInput
                style={styles.modalInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowContactModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleContactSubmit}
                >
                  <Text style={styles.modalButtonTextSubmit}>Share Number</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Meeting Arrangement Modal */}
        <MeetingArrangementModal
          visible={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          conversationId={conversationId}
          otherUserName={otherUserName}
          onMeetingArranged={handleMeetingArranged}
        />

        {/* Item Selection Modal */}
        <ItemSelectionModal
          visible={showItemSelection}
          onClose={() => setShowItemSelection(false)}
          onItemsSelected={handleItemSelection}
          maxItems={3}
          targetItemValue={activeTradeProposal?.estimatedValue || 0}
          title="Select Your Items for Trade"
        />

        {/* Chat Menu Modal */}
        <Modal
          visible={showChatMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowChatMenu(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowChatMenu(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleBlockUser}
              >
                <Ionicons name="person-outline" size={24} color="#F44336" />
                <Text style={styles.menuItemText}>Block User</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleReportUser}
              >
                <Ionicons name="flag-outline" size={24} color="#FF9800" />
                <Text style={styles.menuItemText}>Report User</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowChatMenu(false);
                  Alert.alert(
                    'View Profile',
                    'Profile viewing will be available in a future update.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Ionicons name="person-circle-outline" size={24} color="#2196F3" />
                <Text style={styles.menuItemText}>View Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowChatMenu(false)}
              >
                <Ionicons name="close-outline" size={24} color="#666" />
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 6,
    padding: 14,
    borderRadius: 18,
    maxWidth: '75%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B6B',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  disabledInputContainer: {
    backgroundColor: '#F5F5F5',
  },
  disabledInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EEEEEE',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  disabledInputText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  serviceStatusBanner: {
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD54F',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  serviceStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  serviceStatusDetails: {
    marginTop: 4,
  },
  serviceStatusRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  serviceStatusAction: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 4,
  },
  serviceStatusWaiting: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSubmit: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    fontWeight: '500',
  },
});
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { collection, addDoc, setDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { ItemLockingService } from '../services/ItemLockingService';
import { TradeManagementService } from '../services/TradeManagementService';
import { NotificationService } from '../services/notificationService';
import { SecurityService } from '../services/SecurityService';
import { LiwaSOPService } from '../services/LiwaSOPService';
import { UnifiedMessageService } from '../services/UnifiedMessageService';
import { BidirectionalOfferPrevention } from '../services/BidirectionalOfferPrevention';

const TradeContext = createContext();

// Action types
const TRADE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_CONVERSATIONS: 'SET_CONVERSATIONS',
  SET_TRADE_PROPOSALS: 'SET_TRADE_PROPOSALS',
  SET_OFFERS: 'SET_OFFERS',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_CONVERSATION: 'UPDATE_CONVERSATION',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  loading: false,
  error: null,
  conversations: [],
  tradeProposals: [],
  offers: [],
  messages: {}
};

// Reducer
function tradeReducer(state, action) {
  switch (action.type) {
    case TRADE_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case TRADE_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case TRADE_ACTIONS.SET_CONVERSATIONS:
      return { ...state, conversations: action.payload };
    case TRADE_ACTIONS.SET_TRADE_PROPOSALS:
      return { ...state, tradeProposals: action.payload };
    case TRADE_ACTIONS.SET_OFFERS:
      return { ...state, offers: action.payload };
    case TRADE_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [
            ...(state.messages[action.payload.conversationId] || []),
            action.payload.message
          ]
        }
      };
    case TRADE_ACTIONS.UPDATE_CONVERSATION:
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? { ...conv, ...action.payload.updates } : conv
        )
      };
    case TRADE_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}

export function TradeProvider({ children }) {
  const [state, dispatch] = useReducer(tradeReducer, initialState);
  const { user } = useAuth();

  // Generate conversation ID consistently
  const generateConversationId = (userId1, userId2, itemId) => {
    const sortedUsers = [userId1, userId2].sort();
    return `${sortedUsers[0]}_${sortedUsers[1]}_${itemId}`;
  };

  // Create or get conversation
  const createOrGetConversation = async (otherUserId, itemId, itemTitle) => {
    try {
      if (!user?.uid || !otherUserId || !itemId) {
        throw new Error('Missing required parameters for conversation');
      }

      const conversationId = generateConversationId(user.uid, otherUserId, itemId);
      const conversationRef = doc(db, 'conversations', conversationId);
      
      // Check if conversation exists
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        // Create new conversation
        const conversationData = {
          id: conversationId,
          participants: [user.uid, otherUserId],
          itemId: itemId,
          itemTitle: itemTitle,
          createdAt: new Date(),
          lastMessage: '',
          lastMessageAt: new Date(),
          unreadCount: { [user.uid]: 0, [otherUserId]: 0 }
        };
        
        await setDoc(conversationRef, conversationData);
        console.log('✅ Conversation created:', conversationId);
      }
      
      return conversationId;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Send message
  const sendMessage = async (conversationId, text, receiverId, imageUrl = null) => {
    try {
      if (!conversationId || !text.trim() || !receiverId) {
        throw new Error('Missing required message parameters');
      }

      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: true });

      const messageData = {
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        receiverId,
        text: text.trim(),
        imageUrl,
        createdAt: new Date(),
        read: false,
        delivered: true,
        messageType: imageUrl ? 'image' : 'text'
      };

      // Add message to messages collection
      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      console.log('✅ Message sent with ID:', messageRef.id);

      // Update conversation with last message
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: text.trim(),
        lastMessageAt: new Date(),
        [`unreadCount.${receiverId}`]: 1
      });

      dispatch({ type: TRADE_ACTIONS.ADD_MESSAGE, payload: { conversationId, message: messageData } });
      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: false });

      return messageRef.id;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Create trade proposal with enhanced conversation creation
  const createTradeProposal = async (targetItem, proposerItem) => {
    try {
      if (!targetItem || !proposerItem) {
        throw new Error('Missing items for trade proposal');
      }

      // Check rate limiting
      const rateLimitCheck = await SecurityService.checkRateLimit(user.uid, 'trade_proposals');
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. ${rateLimitCheck.reason}. Try again later.`);
      }

      // Check if user is restricted
      const restrictionCheck = await SecurityService.isUserRestricted(user.uid);
      if (restrictionCheck.restricted) {
        throw new Error(`Account temporarily restricted: ${restrictionCheck.reason}`);
      }

      // Check if both items are available for trading
      const proposerItemCheck = await ItemLockingService.isItemAvailableForTrade(proposerItem.id);
      const targetItemCheck = await ItemLockingService.isItemAvailableForTrade(targetItem.id);

      if (!proposerItemCheck.available) {
        throw new Error(`Your item is not available: ${proposerItemCheck.reason}`);
      }

      if (!targetItemCheck.available) {
        throw new Error(`Target item is not available: ${targetItemCheck.reason}`);
      }

      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: true });

      const tradeData = {
        proposerUserId: user.uid,
        proposerUserName: user.displayName || user.email,
        proposerItemId: proposerItem.id,
        proposerItemTitle: proposerItem.title,
        proposerItemPrice: proposerItem.price,
        targetUserId: targetItem.userId,
        targetItemId: targetItem.id,
        targetItemTitle: targetItem.title,
        targetItemPrice: targetItem.price,
        status: 'pending',
        message: `I'd like to trade my ${proposerItem.title} for your ${targetItem.title}`,
        createdAt: new Date()
      };

      // Check for existing trade proposal
      const existingQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', user.uid),
        where('targetItemId', '==', targetItem.id),
        where('status', '==', 'pending')
      );
      
      // Check for bidirectional offer conflicts
      const validation = await BidirectionalOfferPrevention.validateNewOffer(
        user.uid,
        targetItem.userId,
        targetItem.id,
        'trade'
      );

      if (!validation.canMakeOffer) {
        throw new Error(validation.message);
      }
      
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        throw new Error('You already have a pending trade proposal for this item');
      }

      const tradeRef = await addDoc(collection(db, 'tradeProposals'), tradeData);
      console.log('✅ Trade proposal created with ID:', tradeRef.id);

      // Create conversation for the trade proposal
      const conversationId = generateConversationId(user.uid, targetItem.userId, targetItem.id);
      const conversationData = {
        id: conversationId,
        participants: [user.uid, targetItem.userId],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [targetItem.userId]: 'Seller'
        },
        itemId: targetItem.id,
        itemTitle: targetItem.title,
        tradeProposalId: tradeRef.id,
        conversationType: 'trade_proposal',
        lastMessage: `Trade proposal: ${proposerItem.title} ↔ ${targetItem.title}`,
        lastMessageAt: new Date(),
        unreadCount: { [user.uid]: 0, [targetItem.userId]: 1 },
        createdAt: new Date()
      };
      
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, conversationData, { merge: true });

      // Add initial system message
      const customTradeProposalId = `trade_${user.uid}_${targetItem.userId}_${Date.now()}`;
      const messageData = {
        conversationId,
        senderId: user.uid,  // ✅ FIX: Use actual user ID instead of 'system'
        senderName: user.displayName || user.email,  // ✅ FIX: Use actual user name
        targetUserId: targetItem.userId,  // ✅ FIX: Ensure target user ID is set
        targetUserName: 'Seller',  // ✅ FIX: Add target user name
        text: `${user.displayName || user.email} proposed a trade: "${proposerItem.title}" for "${targetItem.title}"`,
        messageType: 'trade_proposal',
        isSystemMessage: true,
        createdAt: new Date(),
        read: false,
        delivered: true,
        // Include item data for trade processing
        tradeProposalId: customTradeProposalId,
        proposerUserId: user.uid,
        targetUserId: targetItem.userId,
        proposerItemId: proposerItem.id,
        targetItemId: targetItem.id,
        proposerItemTitle: proposerItem.title,
        targetItemTitle: targetItem.title
      };
      
      // Update the trade proposal document with the custom ID for counter-offer lookup
      await updateDoc(tradeRef, {
        tradeProposalId: customTradeProposalId,
        conversationId: conversationId
      });
      
      await addDoc(collection(db, 'messages'), messageData);

      // Log user action for security monitoring
      await SecurityService.logUserAction(user.uid, 'trade_proposals', {
        targetUserId: targetItem.userId,
        targetItemId: targetItem.id,
        proposerItemId: proposerItem.id
      });

      // Detect suspicious behavior
      await SecurityService.detectSuspiciousBehavior(user.uid, 'trade_proposal', {
        targetUserId: targetItem.userId,
        targetItemId: targetItem.id,
        proposerItemId: proposerItem.id
      });

      // Send notification to target user
      await NotificationService.notifyTradeProposalReceived(
        targetItem.userId,
        user.displayName || user.email,
        proposerItem.title,
        targetItem.title,
        tradeRef.id
      );

      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: false });
      return { tradeId: tradeRef.id, conversationId };
    } catch (error) {
      console.error('❌ Error creating trade proposal:', error);
      dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Accept trade proposal with comprehensive trade management
  const acceptTradeProposal = async (tradeId) => {
    try {
      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: true });

      // Get the trade proposal details
      const tradeRef = doc(db, 'tradeProposals', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade proposal not found');
      }

      const tradeData = tradeDoc.data();

      // Check if user is the target user
      if (tradeData.targetUserId !== user.uid) {
        throw new Error('You are not authorized to accept this trade proposal');
      }

      // Check if items are still available
      const proposerItemCheck = await ItemLockingService.isItemAvailableForTrade(tradeData.proposerItemId);
      const targetItemCheck = await ItemLockingService.isItemAvailableForTrade(tradeData.targetItemId);

      if (!proposerItemCheck.available) {
        throw new Error(`Proposer's item is no longer available: ${proposerItemCheck.reason}`);
      }

      if (!targetItemCheck.available) {
        throw new Error(`Your item is no longer available: ${targetItemCheck.reason}`);
      }

      // Use LiwaSOPService for consistent trade management
      const result = await LiwaSOPService.acceptOfferSOP(tradeId, user.uid);

      // Send standardized acceptance message
      const conversationId = generateConversationId(tradeData.proposerUserId, user.uid, tradeData.targetItemId);
      await UnifiedMessageService.createTradeAcceptanceMessage(
        conversationId,
        tradeData.proposerUserName || 'Other User',
        tradeId
      );

      // Send notifications
      await NotificationService.notifyTradeProposalAccepted(
        tradeData.proposerUserId,
        user.displayName || user.email,
        tradeData.proposerItemTitle,
        tradeData.targetItemTitle,
        tradeId
      );

      console.log('✅ Trade proposal accepted:', tradeId);
      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: false });
    } catch (error) {
      console.error('❌ Error accepting trade:', error);
      dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Reject trade proposal with notifications
  const rejectTradeProposal = async (tradeId) => {
    try {
      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: true });

      // Get the trade proposal details
      const tradeRef = doc(db, 'tradeProposals', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade proposal not found');
      }

      const tradeData = tradeDoc.data();

      // Update trade proposal status
      await updateDoc(tradeRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user.uid
      });

      // Send notification to proposer
      await NotificationService.notifyTradeProposalRejected(
        tradeData.proposerUserId,
        user.displayName || user.email,
        tradeData.proposerItemTitle,
        tradeData.targetItemTitle
      );

      console.log('✅ Trade proposal rejected:', tradeId);
      dispatch({ type: TRADE_ACTIONS.SET_LOADING, payload: false });
    } catch (error) {
      console.error('❌ Error rejecting trade:', error);
      dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Load conversations
  useEffect(() => {
    if (!user?.uid) return;

    // Simple query without orderBy to avoid index issues initially
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((conv, index, self) => 
        // Remove duplicates based on ID
        index === self.findIndex(c => c.id === conv.id)
      )
      .sort((a, b) => {
        // Sort by lastMessageAt manually
        const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
        const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      dispatch({ type: TRADE_ACTIONS.SET_CONVERSATIONS, payload: conversations });
    }, (error) => {
      console.error('Error loading conversations:', error);
      // Don't set error for index issues, just log them
      if (!error.message.includes('index')) {
        dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      }
    });

    return unsubscribe;
  }, [user?.uid]);

  // Load trade proposals
  useEffect(() => {
    if (!user?.uid) return;

    // Simple query without orderBy to avoid index issues initially
    const tradesQuery = query(
      collection(db, 'tradeProposals'),
      where('targetUserId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(tradesQuery, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((trade, index, self) => 
        // Remove duplicates based on ID
        index === self.findIndex(t => t.id === trade.id)
      )
      .sort((a, b) => {
        // Sort by createdAt manually
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      
      dispatch({ type: TRADE_ACTIONS.SET_TRADE_PROPOSALS, payload: trades });
    }, (error) => {
      console.error('Error loading trade proposals:', error);
      // Don't set error for index issues, just log them
      if (!error.message.includes('index')) {
        dispatch({ type: TRADE_ACTIONS.SET_ERROR, payload: error.message });
      }
    });

    return unsubscribe;
  }, [user?.uid]);

  const value = {
    ...state,
    createOrGetConversation,
    sendMessage,
    createTradeProposal,
    acceptTradeProposal,
    rejectTradeProposal,
    generateConversationId,
    clearError: () => dispatch({ type: TRADE_ACTIONS.CLEAR_ERROR })
  };

  return (
    <TradeContext.Provider value={value}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrade() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrade must be used within a TradeProvider');
  }
  return context;
}
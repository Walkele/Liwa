import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { LiwaSOPService } from '../services/LiwaSOPService';
import { OfferManagementService } from '../services/OfferManagementService';

export default function TradeActionsHub({ navigation }) {
  const { user } = useAuth();
  const [pendingActions, setPendingActions] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    loadPendingActions();
  }, [user, activeTab]);

  const loadPendingActions = () => {
    if (!user) return;

    console.log('🔄 Loading pending trade actions for user:', user.uid);

    // Listen to offers that need action
    const offersQuery = query(
      collection(db, 'offers'),
      where(activeTab === 'received' ? 'sellerId' : 'buyerId', '==', user.uid),
      where('status', 'in', ['pending', 'accepted', 'counter_offered']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
      const actions = [];
      
      snapshot.docs.forEach(doc => {
        const offer = { id: doc.id, ...doc.data() };
        
        // Determine what actions are needed
        const actionType = getRequiredAction(offer);
        if (actionType) {
          actions.push({
            id: offer.id,
            type: 'offer',
            actionType,
            offer,
            priority: getActionPriority(actionType),
            deadline: getActionDeadline(offer)
          });
        }
      });

      // Sort by priority and deadline
      actions.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.deadline && b.deadline) return a.deadline - b.deadline;
        return 0;
      });

      setPendingActions(actions);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  const getRequiredAction = (offer) => {
    const isSellerView = offer.sellerId === user.uid;
    const isBuyerView = offer.buyerId === user.uid;

    // Seller actions
    if (isSellerView) {
      if (offer.status === 'pending') {
        return 'accept_reject_offer';
      }
      if (offer.status === 'accepted' && !offer.sellerCommitted) {
        return 'commit_to_offer';
      }
      if (offer.sopState === LiwaSOPService.SOP_STATES.ITEMS_LOCKED) {
        return 'proceed_with_exchange';
      }
      if (offer.sopState === LiwaSOPService.SOP_STATES.EXCHANGE_IN_PROGRESS) {
        return 'confirm_completion';
      }
    }

    // Buyer actions
    if (isBuyerView) {
      if (offer.status === 'accepted' && offer.sellerCommitted && !offer.buyerCommitted) {
        return 'commit_to_trade';
      }
      if (offer.sopState === LiwaSOPService.SOP_STATES.ITEMS_LOCKED) {
        return 'proceed_with_exchange';
      }
      if (offer.sopState === LiwaSOPService.SOP_STATES.EXCHANGE_IN_PROGRESS) {
        return 'confirm_completion';
      }
      if (offer.status === 'counter_offered') {
        return 'respond_to_counter';
      }
    }

    return null;
  };

  const getActionPriority = (actionType) => {
    const priorities = {
      'accept_reject_offer': 10,
      'commit_to_offer': 9,
      'commit_to_trade': 9,
      'respond_to_counter': 8,
      'proceed_with_exchange': 7,
      'confirm_completion': 6
    };
    return priorities[actionType] || 1;
  };

  const getActionDeadline = (offer) => {
    if (offer.commitmentDeadline) {
      return offer.commitmentDeadline.toDate();
    }
    if (offer.acceptedAt) {
      return new Date(offer.acceptedAt.toDate().getTime() + 24 * 60 * 60 * 1000);
    }
    return null;
  };

  const getActionInfo = (actionType) => {
    const actions = {
      'accept_reject_offer': {
        title: 'Accept or Reject Offer',
        description: 'You have received a new offer',
        icon: '💰',
        color: '#FF9500',
        urgency: 'high'
      },
      'commit_to_offer': {
        title: 'Commit to Offer',
        description: 'You accepted this offer. Commit within 24 hours.',
        icon: '🤝',
        color: '#4CAF50',
        urgency: 'high'
      },
      'commit_to_trade': {
        title: 'Commit to Trade',
        description: 'Seller committed. Your turn to commit.',
        icon: '🔒',
        color: '#2196F3',
        urgency: 'high'
      },
      'respond_to_counter': {
        title: 'Respond to Counter Offer',
        description: 'Seller made a counter offer',
        icon: '🔄',
        color: '#FF9500',
        urgency: 'medium'
      },
      'proceed_with_exchange': {
        title: 'Proceed with Exchange',
        description: 'Both committed. Exchange contact info.',
        icon: '📞',
        color: '#4CAF50',
        urgency: 'medium'
      },
      'confirm_completion': {
        title: 'Confirm Trade Completion',
        description: 'Mark trade as completed when done',
        icon: '✅',
        color: '#4CAF50',
        urgency: 'low'
      }
    };
    return actions[actionType] || {
      title: 'Unknown Action',
      description: 'Action required',
      icon: '❓',
      color: '#666',
      urgency: 'low'
    };
  };

  const handleAction = async (action, actionType) => {
    try {
      setLoading(true);
      
      switch (actionType) {
        case 'accept_offer':
          await LiwaSOPService.acceptOfferSOP(action.offer.id, user.uid);
          Alert.alert('Success', 'Offer accepted! You have 24 hours to commit.');
          break;
          
        case 'reject_offer':
          await OfferManagementService.rejectOffer(action.offer.id, user.uid);
          Alert.alert('Success', 'Offer rejected.');
          break;
          
        case 'commit_seller':
          await LiwaSOPService.sellerCommitSOP(action.offer.id, user.uid);
          Alert.alert('Success', 'You committed to this offer!');
          break;
          
        case 'commit_buyer':
          await LiwaSOPService.buyerCommitSOP(action.offer.id, user.uid);
          Alert.alert('Success', 'You committed! Items are now locked.');
          break;
          
        case 'exchange_contact':
          await LiwaSOPService.progressTradeSOP(
            action.offer.id, 
            user.uid, 
            LiwaSOPService.SOP_STATES.CONTACT_EXCHANGED,
            { notes: actionNotes }
          );
          Alert.alert('Success', 'Contact info exchanged!');
          break;
          
        case 'complete_trade':
          await LiwaSOPService.completeTradeSOP(action.offer.id, user.uid, actionNotes);
          Alert.alert('Success', 'Trade marked as completed!');
          break;
      }
      
      setShowActionModal(false);
      setSelectedAction(null);
      setActionNotes('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderActionCard = (action) => {
    const actionInfo = getActionInfo(action.actionType);
    const offer = action.offer;
    const timeLeft = action.deadline ? Math.max(0, action.deadline - new Date()) : null;
    const hoursLeft = timeLeft ? Math.floor(timeLeft / (1000 * 60 * 60)) : null;

    return (
      <TouchableOpacity
        key={action.id}
        style={[styles.actionCard, { borderLeftColor: actionInfo.color }]}
        onPress={() => {
          setSelectedAction(action);
          setShowActionModal(true);
        }}
      >
        <View style={styles.actionHeader}>
          <View style={styles.actionIcon}>
            <Text style={styles.actionEmoji}>{actionInfo.icon}</Text>
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>{actionInfo.title}</Text>
            <Text style={styles.actionDescription}>{actionInfo.description}</Text>
          </View>
          <View style={styles.actionMeta}>
            {hoursLeft !== null && (
              <View style={[styles.urgencyBadge, { 
                backgroundColor: hoursLeft < 6 ? '#F44336' : hoursLeft < 12 ? '#FF9500' : '#4CAF50' 
              }]}>
                <Text style={styles.urgencyText}>{hoursLeft}h left</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>

        <View style={styles.offerDetails}>
          <Text style={styles.itemTitle}>{offer.itemTitle}</Text>
          <Text style={styles.offerAmount}>${offer.offerAmount}</Text>
          <Text style={styles.otherParty}>
            {offer.sellerId === user.uid ? `From: ${offer.buyerName}` : `To: ${offer.sellerName}`}
          </Text>
        </View>

        <View style={styles.quickActions}>
          {action.actionType === 'accept_reject_offer' && (
            <>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.rejectButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAction(action, 'reject_offer');
                }}
              >
                <Text style={styles.quickActionText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.acceptButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAction(action, 'accept_offer');
                }}
              >
                <Text style={styles.quickActionText}>Accept</Text>
              </TouchableOpacity>
            </>
          )}
          
          {action.actionType === 'commit_to_offer' && (
            <TouchableOpacity
              style={[styles.quickActionButton, styles.commitButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleAction(action, 'commit_seller');
              }}
            >
              <Text style={styles.quickActionText}>Commit</Text>
            </TouchableOpacity>
          )}
          
          {action.actionType === 'commit_to_trade' && (
            <TouchableOpacity
              style={[styles.quickActionButton, styles.commitButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleAction(action, 'commit_buyer');
              }}
            >
              <Text style={styles.quickActionText}>Commit</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingActions();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Actions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
          <Ionicons name="chatbubbles" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received ({pendingActions.filter(a => a.offer.sellerId === user.uid).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({pendingActions.filter(a => a.offer.buyerId === user.uid).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {pendingActions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No pending trade actions</Text>
          </View>
        ) : (
          pendingActions
            .filter(action => 
              activeTab === 'received' 
                ? action.offer.sellerId === user.uid 
                : action.offer.buyerId === user.uid
            )
            .map(renderActionCard)
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAction && (
              <>
                <Text style={styles.modalTitle}>
                  {getActionInfo(selectedAction.actionType).title}
                </Text>
                <Text style={styles.modalDescription}>
                  {getActionInfo(selectedAction.actionType).description}
                </Text>
                
                <View style={styles.offerSummary}>
                  <Text style={styles.offerSummaryTitle}>{selectedAction.offer.itemTitle}</Text>
                  <Text style={styles.offerSummaryAmount}>${selectedAction.offer.offerAmount}</Text>
                </View>

                {(selectedAction.actionType === 'proceed_with_exchange' || 
                  selectedAction.actionType === 'confirm_completion') && (
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes (optional)"
                    value={actionNotes}
                    onChangeText={setActionNotes}
                    multiline={true}
                    numberOfLines={3}
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowActionModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => {
                      const actionMap = {
                        'commit_to_offer': 'commit_seller',
                        'commit_to_trade': 'commit_buyer',
                        'proceed_with_exchange': 'exchange_contact',
                        'confirm_completion': 'complete_trade'
                      };
                      handleAction(selectedAction, actionMap[selectedAction.actionType]);
                    }}
                  >
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    marginRight: 12,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionMeta: {
    alignItems: 'flex-end',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  urgencyText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  offerDetails: {
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  offerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  otherParty: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  quickActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  commitButton: {
    backgroundColor: '#2196F3',
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  offerSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  offerSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  offerSummaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
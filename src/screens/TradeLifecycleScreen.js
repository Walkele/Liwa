import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { TradeLifecycleService } from '../services/TradeLifecycleService';

export default function TradeLifecycleScreen({ route, navigation }) {
  const { offerId, tradeState: initialTradeState, type } = route.params;
  const { user } = useAuth();
  const [tradeData, setTradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    if (!offerId) return;

    // Listen to trade lifecycle changes
    const unsubscribe = onSnapshot(
      doc(db, 'tradeLifecycles', offerId),
      (doc) => {
        if (doc.exists()) {
          setTradeData({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to trade lifecycle:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [offerId]);

  const getTradeStateInfo = (state) => {
    const states = {
      [TradeLifecycleService.TRADE_STATES.OFFER_ACCEPTED]: {
        icon: '✅',
        color: '#4CAF50',
        title: 'Offer Accepted',
        description: 'Your offer has been accepted! You have 24 hours to commit.',
        nextAction: 'Commit to Trade'
      },
      [TradeLifecycleService.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED]: {
        icon: '🔄',
        color: '#2196F3',
        title: 'Multiple Offers Accepted',
        description: 'The seller has accepted multiple offers and will choose one within 24 hours.',
        nextAction: 'Wait for Selection'
      },
      [TradeLifecycleService.TRADE_STATES.COMMITMENT_PENDING]: {
        icon: '🤝',
        color: '#FF9500',
        title: 'Commitment Pending',
        description: 'Waiting for buyer commitment to finalize the trade.',
        nextAction: 'Commit to Trade'
      },
      [TradeLifecycleService.TRADE_STATES.BOTH_COMMITTED]: {
        icon: '🔒',
        color: '#4CAF50',
        title: 'Both Committed',
        description: 'Both parties have committed! Proceed with the exchange.',
        nextAction: 'Arrange Meeting'
      },
      [TradeLifecycleService.TRADE_STATES.IN_PROGRESS]: {
        icon: '🚚',
        color: '#2196F3',
        title: 'Trade in Progress',
        description: 'Exchange is happening. Mark as completed when done.',
        nextAction: 'Mark Completed'
      },
      [TradeLifecycleService.TRADE_STATES.DELIVERY_PENDING]: {
        icon: '📦',
        color: '#FF9500',
        title: 'Delivery Pending',
        description: 'Waiting for other party to confirm completion.',
        nextAction: 'Wait for Confirmation'
      },
      [TradeLifecycleService.TRADE_STATES.COMPLETED]: {
        icon: '🎉',
        color: '#4CAF50',
        title: 'Trade Completed',
        description: 'Trade completed successfully! Both parties confirmed.',
        nextAction: 'Leave Review'
      }
    };

    return states[state] || {
      icon: '❓',
      color: '#666',
      title: 'Unknown State',
      description: 'Trade state unknown',
      nextAction: 'Contact Support'
    };
  };

  const handleCommitToTrade = async () => {
    try {
      setLoading(true);
      
      if (tradeData.sellerId === user.uid) {
        // Seller committing to specific offer
        await TradeLifecycleService.commitToOffer(offerId, user.uid);
        Alert.alert('Success', 'You have committed to this offer!');
      } else {
        // Buyer committing to trade
        await TradeLifecycleService.buyerCommitToTrade(offerId, user.uid);
        Alert.alert('Success', 'You have committed to this trade!');
      }
      
      setShowCommitModal(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      setLoading(true);
      
      await TradeLifecycleService.markTradeCompleted(
        offerId,
        user.uid,
        completionNotes.trim() || null
      );
      
      Alert.alert('Success', 'Trade marked as completed!');
      setShowCompletionModal(false);
      setCompletionNotes('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrade = () => {
    Alert.alert(
      'Cancel Trade',
      'Are you sure you want to cancel this trade? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Implementation would go here
              Alert.alert('Trade Cancelled', 'The trade has been cancelled.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderTradeProgress = () => {
    if (!tradeData) return null;

    const steps = [
      { key: 'offer_accepted', label: 'Offer Accepted', completed: true },
      { 
        key: 'committed', 
        label: 'Both Committed', 
        completed: tradeData.tradeState === TradeLifecycleService.TRADE_STATES.BOTH_COMMITTED ||
                   tradeData.tradeState === TradeLifecycleService.TRADE_STATES.IN_PROGRESS ||
                   tradeData.tradeState === TradeLifecycleService.TRADE_STATES.COMPLETED
      },
      { 
        key: 'in_progress', 
        label: 'Exchange Started', 
        completed: tradeData.tradeState === TradeLifecycleService.TRADE_STATES.IN_PROGRESS ||
                   tradeData.tradeState === TradeLifecycleService.TRADE_STATES.COMPLETED
      },
      { 
        key: 'completed', 
        label: 'Trade Completed', 
        completed: tradeData.tradeState === TradeLifecycleService.TRADE_STATES.COMPLETED
      }
    ];

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Trade Progress</Text>
        <View style={styles.progressSteps}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                { backgroundColor: step.completed ? '#4CAF50' : '#E0E0E0' }
              ]}>
                {step.completed && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={[
                styles.progressLabel,
                { color: step.completed ? '#4CAF50' : '#999' }
              ]}>
                {step.label}
              </Text>
              {index < steps.length - 1 && (
                <View style={[
                  styles.progressLine,
                  { backgroundColor: step.completed ? '#4CAF50' : '#E0E0E0' }
                ]} />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderActionButton = () => {
    if (!tradeData) return null;

    const stateInfo = getTradeStateInfo(tradeData.tradeState);
    const isSellerView = tradeData.sellerId === user.uid;
    const isBuyerView = tradeData.buyerId === user.uid;

    if (tradeData.tradeState === TradeLifecycleService.TRADE_STATES.MULTIPLE_OFFERS_ACCEPTED && isSellerView) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => setShowCommitModal(true)}
        >
          <Text style={styles.actionButtonText}>Commit to This Offer</Text>
        </TouchableOpacity>
      );
    }

    if (tradeData.tradeState === TradeLifecycleService.TRADE_STATES.COMMITMENT_PENDING && isBuyerView) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
          onPress={() => setShowCommitModal(true)}
        >
          <Text style={styles.actionButtonText}>Commit to Trade</Text>
        </TouchableOpacity>
      );
    }

    if (tradeData.tradeState === TradeLifecycleService.TRADE_STATES.BOTH_COMMITTED ||
        tradeData.tradeState === TradeLifecycleService.TRADE_STATES.IN_PROGRESS) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
          onPress={() => setShowCompletionModal(true)}
        >
          <Text style={styles.actionButtonText}>Mark as Completed</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading trade details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tradeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Trade not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stateInfo = getTradeStateInfo(tradeData.tradeState);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Management</Text>
        <TouchableOpacity onPress={handleCancelTrade}>
          <Ionicons name="close-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Trade State Card */}
        <View style={styles.stateCard}>
          <View style={styles.stateHeader}>
            <Text style={styles.stateIcon}>{stateInfo.icon}</Text>
            <View style={styles.stateInfo}>
              <Text style={styles.stateTitle}>{stateInfo.title}</Text>
              <Text style={styles.stateDescription}>{stateInfo.description}</Text>
            </View>
          </View>
        </View>

        {/* Item Details Card */}
        <View style={styles.itemCard}>
          <Text style={styles.cardTitle}>Item Details</Text>
          <View style={styles.itemDetails}>
            <View style={styles.itemImageContainer}>
              {tradeData.itemImage ? (
                <Image source={{ uri: tradeData.itemImage }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#999" />
                </View>
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{tradeData.itemTitle}</Text>
              <Text style={styles.itemPrice}>${tradeData.offerAmount}</Text>
              <Text style={styles.itemOriginalPrice}>
                Original: ${tradeData.originalPrice || tradeData.offerAmount}
              </Text>
            </View>
          </View>
        </View>

        {/* Participants Card */}
        <View style={styles.participantsCard}>
          <Text style={styles.cardTitle}>Participants</Text>
          <View style={styles.participant}>
            <Ionicons name="person-circle" size={24} color="#4CAF50" />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{tradeData.sellerName}</Text>
              <Text style={styles.participantRole}>Seller</Text>
            </View>
            {tradeData.sellerCommitted && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </View>
          <View style={styles.participant}>
            <Ionicons name="person-circle" size={24} color="#2196F3" />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{tradeData.buyerName}</Text>
              <Text style={styles.participantRole}>Buyer</Text>
            </View>
            {tradeData.buyerCommitted && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </View>
        </View>

        {/* Trade Progress */}
        {renderTradeProgress()}

        {/* Timeline Card */}
        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Timeline</Text>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Offer Created</Text>
            <Text style={styles.timelineTime}>
              {tradeData.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
            </Text>
          </View>
          {tradeData.acceptedAt && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Offer Accepted</Text>
              <Text style={styles.timelineTime}>
                {tradeData.acceptedAt.toDate().toLocaleString()}
              </Text>
            </View>
          )}
          {tradeData.sellerCommittedAt && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Seller Committed</Text>
              <Text style={styles.timelineTime}>
                {tradeData.sellerCommittedAt.toDate().toLocaleString()}
              </Text>
            </View>
          )}
          {tradeData.buyerCommittedAt && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Buyer Committed</Text>
              <Text style={styles.timelineTime}>
                {tradeData.buyerCommittedAt.toDate().toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Button */}
      {renderActionButton()}

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => navigation.navigate('Chat', {
          conversationId: tradeData.conversationId,
          otherUserId: tradeData.sellerId === user.uid ? tradeData.buyerId : tradeData.sellerId,
          otherUserName: tradeData.sellerId === user.uid ? tradeData.buyerName : tradeData.sellerName,
          itemTitle: tradeData.itemTitle,
          tradeState: tradeData.tradeState
        })}
      >
        <Ionicons name="chatbubble" size={20} color="white" />
        <Text style={styles.chatButtonText}>Chat</Text>
      </TouchableOpacity>

      {/* Commit Modal */}
      <Modal
        visible={showCommitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCommitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Commit to Trade</Text>
            <Text style={styles.modalDescription}>
              By committing, you agree to complete this trade. Failure to deliver may result in penalties.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCommitModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCommitToTrade}
              >
                <Text style={styles.modalConfirmText}>Commit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Trade Completed</Text>
            <Text style={styles.modalDescription}>
              Have you successfully completed your part of the trade?
            </Text>
            
            <TextInput
              style={styles.notesInput}
              placeholder="Add completion notes (optional)"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline={true}
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCompletionModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleMarkCompleted}
              >
                <Text style={styles.modalConfirmText}>Mark Completed</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  stateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  stateInfo: {
    flex: 1,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImageContainer: {
    marginRight: 16,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
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
  itemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  itemOriginalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  participantsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  participantRole: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    right: '-50%',
    height: 2,
    zIndex: -1,
  },
  timelineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#333',
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
  actionButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
    lineHeight: 20,
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
    marginBottom: 24,
  },
  modalButtons: {
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
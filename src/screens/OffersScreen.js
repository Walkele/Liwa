import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useTrade } from '../context/TradeContext';
import { OfferManagementService } from '../services/OfferManagementService';
import { TestDataCreator } from '../utils/TestDataCreator';
import { RealUserDataSeeder } from '../services/RealUserDataSeeder';
import { DatabaseCleanupService } from '../services/DatabaseCleanupService';
import { ProductionCleanup } from '../utils/ProductionCleanup';
import { APP_CONFIG, isDevelopment } from '../config/appConfig';

export default function OffersScreen({ navigation }) {
  const { user } = useAuth();
  const { tradeProposals, acceptTradeProposal, rejectTradeProposal, loading: tradeLoading } = useTrade();
  const [offers, setOffers] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    console.log('🔍 Loading offers for user:', user.uid, 'activeTab:', activeTab);
    setLoading(true);

    if (activeTab === 'trades') {
      console.log('📋 Loading trade proposals:', tradeProposals.length);
      setOffers(tradeProposals);
      setLoading(false);
      return;
    }

    let offersQuery;
    
    if (activeTab === 'received') {
      console.log('📥 Loading received offers...');
      offersQuery = query(
        collection(db, 'offers'),
        where('sellerId', '==', user.uid)
      );
    } else if (activeTab === 'sent') {
      console.log('📤 Loading sent offers...');
      offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', user.uid)
      );
    }

    if (offersQuery) {
      const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
        console.log('📊 Offers snapshot received:', snapshot.docs.length, 'documents');
        
        const offersList = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📄 Offer document:', doc.id, data);
          return {
            id: doc.id,
            ...data
          };
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        
        console.log('✅ Final offers list:', offersList.length, 'offers');
        setOffers(offersList);
        setLoading(false);
      }, (error) => {
        console.error('❌ Error loading offers:', error);
        setLoading(false);
        // Don't show error for index issues, just log them
        if (!error.message.includes('index')) {
          Alert.alert('Error', 'Failed to load offers: ' + error.message);
        }
      });

      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, [user, activeTab, tradeProposals]);

  const handleAcceptTradeProposal = async (proposal) => {
    Alert.alert(
      'Accept Trade',
      `Accept trade: ${proposal.proposerItemTitle} ↔ ${proposal.targetItemTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptTradeProposal(proposal.id);
              Alert.alert('Success', 'Trade proposal accepted! You can now proceed with the trade.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to accept trade proposal');
            }
          }
        }
      ]
    );
  };

  const handleRejectTradeProposal = async (proposal) => {
    Alert.alert(
      'Reject Trade',
      `Reject trade proposal: ${proposal.proposerItemTitle} ↔ ${proposal.targetItemTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectTradeProposal(proposal.id);
              Alert.alert('Trade Rejected', 'Trade proposal has been rejected.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to reject trade proposal');
            }
          }
        }
      ]
    );
  };

  const handleAcceptOffer = async (offer) => {
    Alert.alert(
      'Accept Offer',
      `Accept offer of ${offer.offerAmount} for ${offer.itemTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await OfferManagementService.acceptCashOffer(offer.id, user.uid);
              Alert.alert('Offer Accepted!', 'The buyer will be notified and you can proceed with the trade.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to accept offer');
            }
          }
        }
      ]
    );
  };

  const handleRejectOffer = async (offer) => {
    Alert.alert(
      'Reject Offer',
      `Reject offer of ${offer.offerAmount} for ${offer.itemTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfferManagementService.rejectOffer(offer.id, user.uid);
              Alert.alert('Offer Rejected', 'The offer has been rejected.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to reject offer');
            }
          }
        }
      ]
    );
  };

  const handleCounterOffer = (offer) => {
    setSelectedOffer(offer);
    setCounterAmount(offer.offerAmount?.toString() || '');
    setCounterMessage('');
    setShowCounterModal(true);
  };

  const sendCounterOffer = async () => {
    if (!selectedOffer || !counterAmount.trim()) {
      Alert.alert('Error', 'Please enter a counter offer amount');
      return;
    }

    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setShowCounterModal(false);
    setLoading(true);

    try {
      await OfferManagementService.createCounterOffer(
        selectedOffer.id,
        amount,
        counterMessage.trim(),
        user.uid
      );

      Alert.alert('Counter Offer Sent', `Your counter offer of ${amount} has been sent!`);
      setSelectedOffer(null);
      setCounterAmount('');
      setCounterMessage('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  // Debug function to create test offers
  const createTestOffers = async () => {
    try {
      setLoading(true);
      await TestDataCreator.createTestOffers(user.uid);
      await TestDataCreator.createTestConversations(user.uid);
      Alert.alert('Success', 'Test offers and conversations created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create test data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create realistic data for better demos
  const createRealisticData = async () => {
    try {
      setLoading(true);
      const results = await RealUserDataSeeder.seedAllRealisticData(user.uid);
      Alert.alert(
        'Realistic Data Created!', 
        `Created ${results.items.length} items, ${results.users.length} users, and ${results.activity.length} conversations`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create realistic data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Clean up all test data
  const cleanupTestData = async () => {
    ProductionCleanup.showCleanupConfirmation(async () => {
      try {
        setLoading(true);
        const results = await ProductionCleanup.executeProductionCleanup();
        ProductionCleanup.showCleanupResults(results);
      } catch (error) {
        Alert.alert('Error', 'Failed to cleanup data: ' + error.message);
      } finally {
        setLoading(false);
      }
    });
  };

  // Production cleanup (removes ALL test/mock data)
  const productionCleanup = async () => {
    Alert.alert(
      '🚀 Production Cleanup',
      'This will remove ALL test and mock data to prepare for production deployment. This includes:\n\n' +
      '• All test items and listings\n' +
      '• All test conversations and messages\n' +
      '• All test offers and trades\n' +
      '• All mock user data\n\n' +
      'This action is IRREVERSIBLE. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean for Production',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const results = await ProductionCleanup.executeProductionCleanup();
              
              Alert.alert(
                '✅ Production Ready!',
                `Database cleaned successfully!\n\n` +
                `Removed:\n` +
                `• ${results.database.items} items\n` +
                `• ${results.database.conversations} conversations\n` +
                `• ${results.database.messages} messages\n` +
                `• ${results.database.offers} offers\n` +
                `• ${results.database.trades} trades\n\n` +
                'Your app is now ready for production deployment!',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to cleanup for production: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderOffer = ({ item }) => {
    const isTradeProposal = activeTab === 'trades';
    const statusColor = {
      pending: '#FF9500',
      accepted: '#4CAF50',
      rejected: '#F44336',
      counter_offered: '#2196F3',
      auto_rejected: '#999',
      expired: '#999'
    }[item.status] || '#999';

    const getUserInfo = () => {
      if (isTradeProposal) {
        return `From: ${item.proposerUserName || 'Unknown User'}`;
      } else {
        if (activeTab === 'received') {
          return `From: ${item.buyerName || 'Unknown Buyer'}`;
        } else {
          return `To: ${item.sellerName || 'Unknown Seller'}`;
        }
      }
    };

    const getOfferTitle = () => {
      if (isTradeProposal) {
        return `Trade: ${item.proposerItemTitle} ↔ ${item.targetItemTitle}`;
      } else {
        return item.itemTitle || 'Unknown Item';
      }
    };

    const getOfferAmount = () => {
      if (isTradeProposal) {
        return `Your Item: ${item.proposerItemPrice} → Their Item: ${item.targetItemPrice}`;
      } else {
        const currentAmount = item.status === 'counter_offered' ? item.counterOfferAmount : item.offerAmount;
        return `${currentAmount}`;
      }
    };

    return (
      <TouchableOpacity 
        style={styles.offerCard}
        onPress={() => {
          if (item.conversationId) {
            navigation.navigate('Chat', {
              conversationId: item.conversationId,
              otherUserId: isTradeProposal ? item.proposerUserId : (activeTab === 'received' ? item.buyerId : item.sellerId),
              otherUserName: isTradeProposal ? item.proposerUserName : (activeTab === 'received' ? item.buyerName : item.sellerName),
              itemTitle: item.itemTitle || item.targetItemTitle,
              offerContext: !isTradeProposal ? {
                offerId: item.id,
                offerAmount: item.offerAmount,
                status: item.status
              } : null
            });
          }
        }}
      >
        <View style={styles.offerHeader}>
          <View style={styles.offerInfo}>
            <Text style={styles.itemTitle}>{getOfferTitle()}</Text>
            <Text style={styles.offerAmount}>{getOfferAmount()}</Text>
            {!isTradeProposal && (
              <Text style={styles.originalPrice}>Original: ${item.originalPrice}</Text>
            )}
            {item.status === 'counter_offered' && (
              <Text style={styles.counterInfo}>
                Counter Offer: ${item.counterOfferAmount}
              </Text>
            )}
          </View>
          <View style={styles.offerStatus}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.offerDate}>
              {item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleDateString() : 'Recently'}
            </Text>
          </View>
        </View>

        <View style={styles.offerDetails}>
          <Text style={styles.userInfo}>{getUserInfo()}</Text>
          {item.message && (
            <Text style={styles.offerMessage}>{item.message}</Text>
          )}
          {item.counterOfferMessage && (
            <Text style={styles.counterMessage}>Counter: {item.counterOfferMessage}</Text>
          )}
          {item.status === 'auto_rejected' && (
            <Text style={styles.autoRejectedLabel}>⚠️ Auto-rejected (other offer accepted)</Text>
          )}
        </View>

        {/* Trade Proposal Actions */}
        {isTradeProposal && item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectTradeProposal(item)}
              disabled={tradeLoading}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptTradeProposal(item)}
              disabled={tradeLoading}
            >
              <Text style={styles.acceptButtonText}>Accept Trade</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Regular Offer Actions - Received */}
        {!isTradeProposal && activeTab === 'received' && item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectOffer(item)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => handleCounterOffer(item)}
            >
              <Text style={styles.counterButtonText}>Counter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptOffer(item)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SOP State Actions */}
        {!isTradeProposal && item.sopState && (
          <View style={styles.sopActions}>
            {item.sopState === 'multiple_offers' && item.sellerId === user.uid && (
              <TouchableOpacity
                style={styles.commitButton}
                onPress={() => navigation.navigate('TradeActions')}
              >
                <Text style={styles.commitButtonText}>Commit to Offer</Text>
              </TouchableOpacity>
            )}
            
            {item.sopState === 'seller_committed' && item.buyerId === user.uid && (
              <TouchableOpacity
                style={styles.commitButton}
                onPress={() => navigation.navigate('TradeActions')}
              >
                <Text style={styles.commitButtonText}>Commit to Trade</Text>
              </TouchableOpacity>
            )}
            
            {item.sopState === 'items_locked' && (
              <TouchableOpacity
                style={styles.exchangeButton}
                onPress={() => navigation.navigate('TradeActions')}
              >
                <Text style={styles.exchangeButtonText}>Proceed with Exchange</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Continue Trade Button */}
        {!isTradeProposal && item.status === 'accepted' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.tradeProcessButton}
              onPress={() => navigation.navigate('TradeLifecycle', {
                offerId: item.acceptedOfferId || item.id,
                tradeState: item.sopState,
                type: 'offer'
              })}
            >
              <Ionicons name="arrow-forward" size={20} color="white" />
              <Text style={styles.tradeProcessButtonText}>Manage Trade</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offers</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please login to view offers</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offers</Text>
        <TouchableOpacity onPress={createTestOffers}>
          <Ionicons name="add-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trades' && styles.activeTab]}
          onPress={() => setActiveTab('trades')}
        >
          <Text style={[styles.tabText, activeTab === 'trades' && styles.activeTabText]}>
            Trades
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => navigation.navigate('AllOffers')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Browse All
          </Text>
        </TouchableOpacity>
      </View>

      {offers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {loading ? 'Loading offers...' : `No ${activeTab} offers yet`}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'received' ? 'Offers for your items will appear here' : 
             activeTab === 'sent' ? 'Your offers to others will appear here' :
             'Trade proposals will appear here'}
          </Text>
          
          {/* Browse All Offers Button */}
          <TouchableOpacity
            style={styles.browseAllButton}
            onPress={() => navigation.navigate('AllOffers')}
          >
            <Ionicons name="search" size={20} color="white" />
            <Text style={styles.browseAllButtonText}>Browse All Available Offers</Text>
          </TouchableOpacity>
          
          {/* Development Tools - Only show in development environment */}
          {isDevelopment() && (
            <View style={styles.devToolsContainer}>
              <Text style={styles.devToolsTitle}>Development Tools</Text>
              
              <TouchableOpacity
                style={styles.testDataButton}
                onPress={createTestOffers}
                disabled={loading}
              >
                <Ionicons name="flask-outline" size={20} color="white" />
                <Text style={styles.testDataButtonText}>Create Test Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.realisticDataButton}
                onPress={createRealisticData}
                disabled={loading}
              >
                <Ionicons name="people-outline" size={20} color="white" />
                <Text style={styles.realisticDataButtonText}>Create Realistic Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cleanupButton}
                onPress={cleanupTestData}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
                <Text style={styles.cleanupButtonText}>Clean Test Data</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Production Cleanup - Always available for final cleanup */}
          <View style={styles.productionToolsContainer}>
            <Text style={styles.productionToolsTitle}>Production Tools</Text>
            
            <TouchableOpacity
              style={styles.productionCleanupButton}
              onPress={productionCleanup}
              disabled={loading}
            >
              <Ionicons name="rocket-outline" size={20} color="white" />
              <Text style={styles.productionCleanupButtonText}>Clean for Production</Text>
            </TouchableOpacity>
            
            <Text style={styles.productionWarning}>
              ⚠️ This removes ALL test data permanently
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          style={styles.offersList}
          contentContainerStyle={styles.offersContent}
        />
      )}

      {/* Counter Offer Modal */}
      <Modal
        visible={showCounterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCounterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <Text style={styles.modalSubtitle}>
              Current Offer: ${selectedOffer?.offerAmount}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Counter Offer:</Text>
              <TextInput
                style={styles.counterInput}
                value={counterAmount}
                onChangeText={setCounterAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message (Optional):</Text>
              <TextInput
                style={styles.messageInput}
                value={counterMessage}
                onChangeText={setCounterMessage}
                placeholder="Add a message to your counter offer..."
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCounterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.sendCounterButton}
                onPress={sendCounterOffer}
              >
                <Text style={styles.sendCounterButtonText}>Send Counter</Text>
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
    marginLeft: 16,
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
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  offersList: {
    flex: 1,
  },
  offersContent: {
    padding: 16,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  offerInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  offerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  counterInfo: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginTop: 4,
  },
  offerStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  offerDate: {
    fontSize: 12,
    color: '#999',
  },
  offerDetails: {
    marginBottom: 12,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  offerMessage: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  counterMessage: {
    fontSize: 14,
    color: '#2196F3',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  autoRejectedLabel: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  counterButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  counterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tradeProcessButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tradeProcessButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  sopActions: {
    marginTop: 8,
  },
  commitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  commitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  exchangeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exchangeButtonText: {
    color: 'white',
    fontWeight: '600',
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  browseAllButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  devToolsContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  devToolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
    marginBottom: 15,
  },
  testDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  testDataButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  realisticDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  realisticDataButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cleanupButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  productionToolsContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  productionToolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 15,
  },
  productionCleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
    justifyContent: 'center',
  },
  productionCleanupButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  productionWarning: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
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
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  counterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  sendCounterButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendCounterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Modal, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, addDoc, updateDoc, increment, query, where, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useTrade } from '../context/TradeContext';
import { ItemManagementService } from '../services/ItemManagementService';
import { OfferManagementService } from '../services/OfferManagementService';
import WaitlistButton from '../components/WaitlistButton';
import ReOfferButton from '../components/ReOfferButton';
import { BidirectionalOfferPrevention } from '../services/BidirectionalOfferPrevention';
import LoadingButton from '../components/LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';
import { ServiceOfferModal } from '../components/ServiceOfferModal';
import ElegantButton from '../components/ElegantButton';
import ElegantButtonGroup from '../components/ElegantButtonGroup';

export default function ItemDetailsScreen({ route, navigation }) {
  const { item } = route.params;
  const { user } = useAuth();
  const { createTradeProposal, createOrGetConversation, loading: tradeLoading, error: tradeError } = useTrade();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const { loading: tradeButtonLoading, withLoading: withTradeLoading } = useLoadingState();
  const { loading: offerButtonLoading, withLoading: withOfferLoading } = useLoadingState();
  const { showError, showSuccess, showNotification } = useNotification();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showServiceOfferModal, setShowServiceOfferModal] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [selectedTradeItem, setSelectedTradeItem] = useState(null);
  const [loadingUserItems, setLoadingUserItems] = useState(false);
  const [existingOffers, setExistingOffers] = useState([]);
  const [existingTradeProposals, setExistingTradeProposals] = useState([]);
  const [lastDeclinedOffer, setLastDeclinedOffer] = useState(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSellerInfo();
    incrementViews();
    checkIfLiked();
    loadUserItems();
    checkExistingOffers();
    checkExistingTradeProposals();
    checkDeclinedOffers();
  }, []);

  // Animated loading spinner
  useEffect(() => {
    if (loadingUserItems) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [loadingUserItems, spinValue]);

  const loadSellerInfo = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', item.userId));
      if (userDoc.exists()) {
        setSeller(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading seller info:', error);
    }
  };

  const incrementViews = async () => {
    try {
      // Check if item and item.id exist
      if (!item || !item.id) {
        console.warn('⚠️ Cannot increment views: item or item.id is missing');
        return;
      }
      
      await updateDoc(doc(db, 'items', item.id), {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
      // Don't crash the app, just log the error
      if (error.code === 'not-found') {
        console.warn(`⚠️ Item ${item?.id} not found in database`);
      }
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;
    
    try {
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', user.uid),
        where('itemId', '==', item.id)
      );
      const snapshot = await getDocs(favoritesQuery);
      setIsLiked(!snapshot.empty);
    } catch (error) {
      console.error('Error checking if liked:', error);
    }
  };

  const loadUserItems = async () => {
    if (!user) return;
    
    setLoadingUserItems(true);
    try {
      console.log('Loading user items for trade proposals, user ID:', user.uid);
      
      let userItemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', user.uid),
        where('status', '==', 'available')
      );
      
      let snapshot = await getDocs(userItemsQuery);
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (items.length === 0) {
        userItemsQuery = query(
          collection(db, 'items'),
          where('userId', '==', user.uid)
        );
        
        snapshot = await getDocs(userItemsQuery);
        items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      setUserItems(items);
      console.log(`✅ Loaded ${items.length} user items for trading`);
    } catch (error) {
      console.error('Error loading user items:', error);
      showError('Error', 'Failed to load your items for trading');
    } finally {
      setLoadingUserItems(false);
    }
  };

  const checkExistingOffers = async () => {
    if (!user) return;
    
    try {
      const offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', user.uid),
        where('itemId', '==', item.id),
        where('status', 'in', ['pending', 'accepted'])
      );
      const snapshot = await getDocs(offersQuery);
      setExistingOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error checking existing offers:', error);
    }
  };

  const checkExistingTradeProposals = async () => {
    if (!user) return;
    
    try {
      const proposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', user.uid),
        where('targetItemId', '==', item.id),
        where('status', 'in', ['pending', 'accepted'])
      );
      const snapshot = await getDocs(proposalsQuery);
      setExistingTradeProposals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error checking existing trade proposals:', error);
    }
  };

  const checkDeclinedOffers = async () => {
    if (!user) return;
    
    try {
      // Simplified query to avoid complex index requirements
      const offersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', user.uid),
        where('itemId', '==', item.id),
        where('status', '==', 'declined')
      );
      const snapshot = await getDocs(offersQuery);
      
      if (!snapshot.empty) {
        // Sort by declinedAt on the client side to avoid index requirements
        const declinedOffers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(offer => offer.declinedAt) // Only offers with declinedAt
          .sort((a, b) => {
            const aTime = a.declinedAt?.toDate?.()?.getTime() || a.declinedAt?.getTime() || 0;
            const bTime = b.declinedAt?.toDate?.()?.getTime() || b.declinedAt?.getTime() || 0;
            return bTime - aTime; // Descending order (most recent first)
          });
        
        if (declinedOffers.length > 0) {
          setLastDeclinedOffer(declinedOffers[0]);
        }
      }
    } catch (error) {
      console.error('Error checking declined offers:', error);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like items');
      return;
    }

    try {
      if (isLiked) {
        const favoritesQuery = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          where('itemId', '==', item.id)
        );
        const snapshot = await getDocs(favoritesQuery);
        if (!snapshot.empty) {
          await deleteDoc(doc(db, 'favorites', snapshot.docs[0].id));
        }
        setIsLiked(false);
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          itemId: item.id,
          createdAt: new Date()
        });
        setIsLiked(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites: ' + error.message);
    }
  };

  const handleMakeOffer = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to make an offer');
      return;
    }

    if (user.uid === item.userId) {
      Alert.alert('Error', 'You cannot make an offer on your own item');
      return;
    }

    if (existingOffers.length > 0) {
      const pendingOffer = existingOffers.find(offer => offer.status === 'pending');
      if (pendingOffer) {
        Alert.alert(
          'Existing Offer',
          `You already have a pending offer of $${pendingOffer.offerAmount} for this item. Please wait for the seller to respond or cancel your existing offer.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Check for bidirectional offer conflicts
    try {
      const validation = await BidirectionalOfferPrevention.validateNewOffer(
        user.uid,
        item.userId,
        item.id,
        'cash'
      );

      if (!validation.canMakeOffer) {
        const explanation = BidirectionalOfferPrevention.getOfferRestrictionExplanation(
          validation.conflictDetails?.conflictType,
          validation.conflictDetails?.existingOffers || [],
          validation.conflictDetails?.existingTradeProposals || []
        );

        Alert.alert(
          explanation.title,
          `${validation.message}\n\n${explanation.subtitle}\n\nNext steps:\n${explanation.nextSteps.join('\n')}`,
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking bidirectional conflicts:', error);
      // Continue with offer if validation fails (don't block user)
    }

    setOfferAmount(item.price.toString());
    setShowOfferModal(true);
  };

  const handleProposeTrade = async () => {
    if (!user) {
      showError('Login Required', 'Please login to propose a trade');
      return;
    }

    if (user.uid === item.userId) {
      showError('Error', 'You cannot trade with yourself');
      return;
    }

    if (existingTradeProposals.length > 0) {
      const pendingProposal = existingTradeProposals.find(proposal => proposal.status === 'pending');
      if (pendingProposal) {
        showNotification({
          type: 'info',
          title: 'Existing Trade Proposal',
          message: `You already have a pending trade proposal for this item (${pendingProposal.proposerItemTitle} ↔ ${pendingProposal.targetItemTitle}). Please wait for the seller to respond.`,
          autoHide: true,
          duration: 5000
        });
        return;
      }
    }

    // Check for bidirectional offer conflicts
    try {
      const validation = await BidirectionalOfferPrevention.validateNewOffer(
        user.uid,
        item.userId,
        item.id,
        'trade'
      );

      if (!validation.canMakeOffer) {
        const explanation = BidirectionalOfferPrevention.getOfferRestrictionExplanation(
          validation.conflictDetails?.conflictType,
          validation.conflictDetails?.existingOffers || [],
          validation.conflictDetails?.existingTradeProposals || []
        );

        showNotification({
          type: 'warning',
          title: explanation.title,
          message: `${validation.message}\n\n${explanation.subtitle}\n\nNext steps:\n${explanation.nextSteps.join('\n')}`,
          autoHide: false
        });
        return;
      }
    } catch (error) {
      console.error('Error checking bidirectional conflicts:', error);
      // Continue with trade proposal if validation fails (don't block user)
    }

    // Show loading and load user items
    await withTradeLoading(
      async () => {
        // Load user items if not already loaded or if we need fresh data
        if (userItems.length === 0 || !loadingUserItems) {
          await loadUserItems();
        }
        
        // Check if user has items after loading
        if (userItems.length === 0) {
          showNotification({
            type: 'warning',
            title: 'No Items to Trade',
            message: 'You need to post items before you can propose trades. Would you like to post an item now?',
            autoHide: false,
            actions: [
              { title: 'Cancel', onPress: () => {}, style: 'secondary' },
              { title: 'Post Item', onPress: () => navigation.navigate('Post'), style: 'primary' }
            ]
          });
          return;
        }

        // Show the trade modal with loaded items
        setShowTradeModal(true);
      },
      {
        errorMessage: 'Failed to load your items for trading',
        showErrorNotification: true
      }
    );
  };

  const handleSendTradeProposal = async () => {
    if (!selectedTradeItem) {
      showError('Select Item', 'Please select an item to trade');
      return;
    }

    setShowTradeModal(false);

    await withTradeLoading(
      async () => {
        const result = await createTradeProposal(item, selectedTradeItem);
        console.log('✅ Trade proposal created:', result);

        showNotification({
          type: 'success',
          title: 'Trade Proposed! 🔄',
          message: `Your trade proposal has been sent! You're offering your "${selectedTradeItem.title}" for their "${item.title}". You can chat about it in Messages.`,
          autoHide: false,
          actions: [
            { 
              title: 'View Messages', 
              onPress: () => {
                setSelectedTradeItem(null);
                checkExistingTradeProposals();
                navigation.navigate('Messages');
              },
              style: 'primary'
            },
            { 
              title: 'OK', 
              onPress: () => {
                setSelectedTradeItem(null);
                checkExistingTradeProposals();
              },
              style: 'secondary'
            }
          ]
        });
      },
      {
        errorMessage: 'Failed to send trade proposal',
        showErrorNotification: true
      }
    );
  };

  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount);
    
    if (!offerAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid offer amount');
      return;
    }

    setShowOfferModal(false);
    await sendOffer(amount);
  };

  const sendOffer = async (amount) => {
    setLoading(true);
    try {
      console.log('💰 Sending cash offer using OfferManagementService...');
      
      // Use OfferManagementService to create comprehensive offer with conversation
      const result = await OfferManagementService.createCashOffer(
        item.id,
        item.userId,
        user.uid,
        amount,
        `I'd like to offer $${amount} for your ${item.title}`
      );

      console.log('✅ Cash offer created:', result);

      Alert.alert(
        'Offer Sent! 🎉', 
        `Your offer of $${amount} has been sent to the seller. They will be notified and can accept, reject, or counter your offer. You can chat about it in Messages.`,
        [
          { 
            text: 'View Messages', 
            onPress: () => {
              setOfferAmount('');
              checkExistingOffers();
              navigation.navigate('Messages');
            }
          },
          { 
            text: 'OK', 
            onPress: () => {
              setOfferAmount('');
              checkExistingOffers();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error sending offer:', error);
      showError('Error', error.message || 'Failed to send offer. Please try again.');
    }
  };

  const handleMessage = async () => {
    if (!user) {
      showError('Login Required', 'Please login to message the seller');
      return;
    }

    if (user.uid === item.userId) {
      showError('Error', 'This is your own item');
      return;
    }

    try {
      const conversationId = await createOrGetConversation(
        item.userId,
        item.id,
        item.title
      );
      
      navigation.navigate('Chat', {
        conversationId,
        otherUserId: item.userId,
        otherUserName: seller?.name || 'Seller',
        itemTitle: item.title,
        itemId: item.id
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <TouchableOpacity onPress={handleToggleLike}>
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? "#FF6B6B" : "white"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <>
              <Image
                source={{ uri: item.images[currentImageIndex] }}
                style={styles.mainImage}
              />
              {item.images.length > 1 && (
                <ScrollView
                  horizontal
                  style={styles.imageGallery}
                  showsHorizontalScrollIndicator={false}
                >
                  {item.images.map((uri, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setCurrentImageIndex(index)}
                    >
                      <Image
                        source={{ uri }}
                        style={[
                          styles.thumbnailImage,
                          currentImageIndex === index && styles.activeThumbnail
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={64} color="#ccc" />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}
        </View>

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemPrice}>${item.price}</Text>
          <Text style={styles.itemCategory}>{item.category} • {item.condition}</Text>
          <Text style={styles.itemLocation}>{item.location}</Text>
          
          <View style={styles.stats}>
            <Text style={styles.statText}>{item.views || 0} views</Text>
            <Text style={styles.statText}>{item.likes || 0} likes</Text>
          </View>

          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>

          {/* Seller Info */}
          {seller && (
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerTitle}>Seller</Text>
              <View style={styles.sellerCard}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerInitial}>
                    {seller.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerName}>{seller.name}</Text>
                  <Text style={styles.sellerRating}>⭐ {seller.rating || 5.0} ({seller.totalTrades || 0} trades)</Text>
                  <Text style={styles.sellerLocation}>{seller.location}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Elegant Action Buttons */}
      {user && user.uid !== item.userId && (
        <View style={styles.elegantButtonContainer}>
          <ElegantButtonGroup
            layout="grid"
            spacing={12}
            buttons={[
              {
                title: 'Message',
                icon: 'chatbubble-outline',
                variant: 'outline',
                onPress: handleMessage,
                size: 'medium',
              },
              {
                title: `Trade (${userItems.length})`,
                icon: 'swap-horizontal',
                variant: 'primary',
                gradient: true,
                onPress: handleProposeTrade,
                loading: tradeButtonLoading,
                disabled: existingTradeProposals.length > 0 || userItems.length === 0,
                size: 'medium',
              },
              {
                title: 'Make Offer',
                icon: 'pricetag-outline',
                variant: 'secondary',
                gradient: true,
                onPress: handleMakeOffer,
                loading: offerButtonLoading,
                disabled: existingOffers.length > 0,
                size: 'medium',
              },
              {
                title: 'Offer Service',
                icon: 'construct-outline',
                variant: 'success',
                gradient: true,
                onPress: () => setShowServiceOfferModal(true),
                size: 'medium',
                fullWidth: true,
              },
            ]}
            style={styles.buttonGroup}
          />
        </View>
      )}

      {/* Waitlist Button - Show when item is unavailable/locked */}
      {(item.status === 'locked' || item.status === 'unavailable') && user?.uid !== item.userId && (
        <View style={styles.waitlistSection}>
          <WaitlistButton
            item={item}
            userId={user.uid}
            onWaitlistAdded={(result) => {
              console.log('Added to waitlist:', result);
            }}
            style={styles.waitlistButtonStyle}
          />
        </View>
      )}

      {/* Re-offer Button - Show when user has declined offers */}
      {lastDeclinedOffer && user?.uid !== item.userId && (
        <View style={styles.reOfferSection}>
          <Text style={styles.reOfferPromptText}>
            Your offer was declined. You can make an improved offer:
          </Text>
          <ReOfferButton
            item={item}
            userId={user.uid}
            lastOfferAmount={lastDeclinedOffer.offerAmount || lastDeclinedOffer.cashAmount || 0}
            onReOfferSent={(result) => {
              console.log('Re-offer sent:', result);
              // Refresh declined offers and existing offers
              checkDeclinedOffers();
              checkExistingOffers();
            }}
            style={styles.reOfferButtonStyle}
          />
        </View>
      )}

      {/* Offer Modal */}
      <Modal
        visible={showOfferModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make an Offer</Text>
            <Text style={styles.modalSubtitle}>
              Original Price: ${item.price}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Offer Amount:</Text>
              <TextInput
                style={styles.offerInput}
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowOfferModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <LoadingButton
                title="Send Offer"
                onPress={handleSendOffer}
                loading={offerButtonLoading}
                variant="primary"
                style={styles.sendOfferButton}
                textStyle={styles.sendOfferButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Trade Proposal Modal */}
      <Modal
        visible={showTradeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Propose a Trade</Text>
            <Text style={styles.modalSubtitle}>
              Select one of your items to trade for "{item.title}"
            </Text>
            
            {loadingUserItems ? (
              <View style={styles.loadingContainer}>
                <Animated.View
                  style={{
                    transform: [{
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}
                >
                  <Ionicons name="refresh" size={32} color="#FF6B6B" />
                </Animated.View>
                <Text style={styles.loadingText}>Loading your items...</Text>
              </View>
            ) : userItems.length === 0 ? (
              <View style={styles.emptyItemsContainer}>
                <Ionicons name="cube-outline" size={48} color="#ccc" />
                <Text style={styles.emptyItemsText}>No items available for trading</Text>
                <Text style={styles.emptyItemsSubtext}>Post some items first to propose trades</Text>
              </View>
            ) : (
              <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
                {userItems.map((userItem) => (
                  <TouchableOpacity
                    key={userItem.id}
                    style={[
                      styles.tradeItemCard,
                      selectedTradeItem?.id === userItem.id && styles.selectedTradeItem
                    ]}
                    onPress={() => setSelectedTradeItem(userItem)}
                  >
                    <View style={styles.tradeItemInfo}>
                      {userItem.images && userItem.images.length > 0 ? (
                        <Image source={{ uri: userItem.images[0] }} style={styles.tradeItemImage} />
                      ) : (
                        <View style={styles.noTradeImage}>
                          <Ionicons name="image-outline" size={24} color="#ccc" />
                        </View>
                      )}
                      <View style={styles.tradeItemDetails}>
                        <Text style={styles.tradeItemTitle}>{userItem.title}</Text>
                        <Text style={styles.tradeItemPrice}>${userItem.price}</Text>
                        <Text style={styles.tradeItemCategory}>{userItem.category}</Text>
                      </View>
                    </View>
                    {selectedTradeItem?.id === userItem.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowTradeModal(false);
                  setSelectedTradeItem(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <LoadingButton
                title="Propose Trade"
                onPress={handleSendTradeProposal}
                loading={tradeButtonLoading}
                disabled={!selectedTradeItem || loadingUserItems}
                variant="primary"
                style={styles.sendOfferButton}
                textStyle={styles.sendOfferButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Offer Modal */}
      <ServiceOfferModal
        visible={showServiceOfferModal}
        onClose={() => setShowServiceOfferModal(false)}
        item={item}
        user={user}
        navigation={navigation}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: 'white',
  },
  mainImage: {
    width: '100%',
    height: 300,
  },
  imageGallery: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    opacity: 0.6,
  },
  activeThumbnail: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  noImageContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noImageText: {
    color: '#999',
    marginTop: 8,
  },
  itemInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginTop: 8,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 8,
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginRight: 16,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  sellerInfo: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  sellerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sellerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sellerRating: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sellerLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
  },
  messageButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  tradeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
  },
  tradeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  offerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPending: {
    backgroundColor: '#FF9500',
  },
  offerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  serviceButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  serviceButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  waitlistSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  waitlistButtonStyle: {
    width: '100%',
  },
  elegantButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGroup: {
    width: '100%',
  },
  reOfferSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  reOfferPromptText: {
    fontSize: 14,
    color: '#F57F17',
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  reOfferButtonStyle: {
    width: '100%',
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
    paddingHorizontal: 24,
    paddingVertical: 20,
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  offerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  sendOfferButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  sendOfferButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyItemsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyItemsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  tradeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedTradeItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  tradeItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tradeItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  noTradeImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tradeItemDetails: {
    flex: 1,
  },
  tradeItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tradeItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 2,
  },
  tradeItemCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
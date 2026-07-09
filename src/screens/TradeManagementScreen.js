import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, addDoc, collection, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const TRADE_STEPS = [
  { id: 1, title: 'Offer Accepted', description: 'Both parties agreed to the deal', icon: 'checkmark-circle' },
  { id: 2, title: 'Contact Exchange', description: 'Share contact information', icon: 'call' },
  { id: 3, title: 'Arrange Meeting', description: 'Set time and location', icon: 'location' },
  { id: 4, title: 'Meet & Inspect', description: 'Meet in person and inspect item', icon: 'eye' },
  { id: 5, title: 'Complete Trade', description: 'Exchange item and payment', icon: 'swap-horizontal' },
  { id: 6, title: 'Rate Experience', description: 'Rate your trading partner', icon: 'star' }
];

export default function TradeManagementScreen({ route, navigation }) {
  const { tradeId, offerId, type } = route.params; // type: 'offer' or 'trade'
  const { user } = useAuth();
  const [tradeData, setTradeData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 TradeManagement loading with params:', { tradeId, offerId, type });
    
    if (!tradeId && !offerId) {
      console.log('❌ No tradeId or offerId provided');
      Alert.alert('Error', 'No trade information provided');
      navigation.goBack();
      return;
    }

    const docId = tradeId || offerId;
    const collectionName = type === 'trade' ? 'trades' : 'acceptedOffers';
    
    console.log('📱 Loading from collection:', collectionName, 'docId:', docId);
    
    const unsubscribe = onSnapshot(doc(db, collectionName, docId), async (docSnapshot) => {
      console.log('📄 Document snapshot received, exists:', docSnapshot.exists());
      setInitialLoading(false);
      
      if (docSnapshot.exists()) {
        const data = { id: docSnapshot.id, ...docSnapshot.data() };
        console.log('✅ Trade data loaded:', data);
        setTradeData(data);
        setCurrentStep(data.currentStep || 1);
      } else {
        console.log('❌ Document does not exist');
        
        // If it's an offer type and document doesn't exist, try to create a basic one
        if (type === 'offer' && offerId) {
          console.log('🔧 Attempting to create missing acceptedOffer document');
          try {
            // Create a basic accepted offer document
            const basicOfferData = {
              id: offerId,
              originalOfferId: offerId,
              status: 'accepted',
              currentStep: 2, // Start at step 2 so user can proceed to contact exchange
              createdAt: new Date(),
              // Add minimal required fields
              itemTitle: 'Trade Item',
              buyerName: 'Buyer',
              sellerName: 'Seller',
              step1CompletedAt: new Date(), // Mark step 1 as completed
              step1CompletedBy: 'system'
            };
            
            await setDoc(doc(db, 'acceptedOffers', offerId), basicOfferData);
            console.log('✅ Created basic acceptedOffer document');
            
            // The onSnapshot will trigger again with the new document
            return;
          } catch (createError) {
            console.error('❌ Failed to create acceptedOffer document:', createError);
          }
        }
        
        setTradeData(null);
      }
    }, (error) => {
      console.error('❌ Error loading trade data:', error);
      setInitialLoading(false);
      setTradeData(null);
    });

    return unsubscribe;
  }, [tradeId, offerId, type]);

  const updateTradeStep = async (stepId, stepData = {}) => {
    setLoading(true);
    try {
      const docId = tradeData.id;
      const collectionName = type === 'trade' ? 'trades' : 'acceptedOffers';
      
      await updateDoc(doc(db, collectionName, docId), {
        currentStep: stepId,
        [`step${stepId}CompletedAt`]: new Date(),
        [`step${stepId}CompletedBy`]: user.uid,
        ...stepData
      });

      // Add activity log
      await addDoc(collection(db, 'tradeActivities'), {
        tradeId: docId,
        userId: user.uid,
        userName: user.name,
        action: `completed_step_${stepId}`,
        stepTitle: TRADE_STEPS[stepId - 1].title,
        timestamp: new Date(),
        ...stepData
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to update trade step: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStepAction = async (step) => {
    switch (step.id) {
      case 1:
        // Already completed (offer accepted)
        break;
      case 2:
        await handleContactExchange();
        break;
      case 3:
        await handleArrangeMeeting();
        break;
      case 4:
        await handleMeetingConfirmation();
        break;
      case 5:
        await handleTradeCompletion();
        break;
      case 6:
        await handleRating();
        break;
    }
  };

  const handleContactExchange = async () => {
    Alert.alert(
      'Exchange Contact Information',
      'Share your contact details with the other party to arrange the meeting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contacts Shared',
          onPress: () => updateTradeStep(2, { contactsShared: true })
        }
      ]
    );
  };

  const handleArrangeMeeting = async () => {
    Alert.prompt(
      'Arrange Meeting',
      'Enter meeting location and time:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Meeting',
          onPress: (meetingDetails) => {
            if (meetingDetails) {
              updateTradeStep(3, { 
                meetingLocation: meetingDetails,
                meetingArrangedBy: user.uid
              });
            }
          }
        }
      ],
      'plain-text',
      'Location and time...'
    );
  };

  const handleMeetingConfirmation = async () => {
    Alert.alert(
      'Confirm Meeting',
      'Have you met in person and inspected the item?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Met & Inspected',
          onPress: () => updateTradeStep(4, { 
            metInPerson: true,
            itemInspected: true
          })
        }
      ]
    );
  };

  const handleTradeCompletion = async () => {
    Alert.alert(
      'Complete Trade',
      'Confirm that you have completed the exchange (item + payment)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trade Completed',
          onPress: async () => {
            await updateTradeStep(5, { 
              tradeCompleted: true,
              completedAt: new Date()
            });

            // Update item status to sold
            if (tradeData.itemId) {
              await updateDoc(doc(db, 'items', tradeData.itemId), {
                status: 'sold',
                soldAt: new Date(),
                soldTo: tradeData.buyerId,
                soldPrice: tradeData.finalPrice || tradeData.offerAmount
              });
            }
          }
        }
      ]
    );
  };

  const handleRating = async () => {
    Alert.prompt(
      'Rate Your Experience',
      'Rate this trade (1-5 stars):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Rating',
          onPress: async (rating) => {
            const ratingNum = parseInt(rating);
            if (ratingNum >= 1 && ratingNum <= 5) {
              await updateTradeStep(6, { 
                userRating: ratingNum,
                ratedAt: new Date()
              });

              // Add rating to ratings collection
              await addDoc(collection(db, 'ratings'), {
                fromUserId: user.uid,
                toUserId: tradeData.sellerId === user.uid ? tradeData.buyerId : tradeData.sellerId,
                tradeId: tradeData.id,
                rating: ratingNum,
                createdAt: new Date()
              });

              Alert.alert('Thank You!', 'Your rating has been submitted. Trade completed!');
              navigation.goBack();
            } else {
              Alert.alert('Invalid Rating', 'Please enter a number between 1 and 5.');
            }
          }
        }
      ],
      'numeric'
    );
  };

  const renderStep = (step) => {
    const isCompleted = step.id < currentStep;
    const isActive = step.id === currentStep;
    const canProceed = isActive && step.id <= currentStep;

    return (
      <TouchableOpacity 
        key={step.id} 
        style={[
          styles.stepContainer,
          canProceed && styles.stepContainerActive
        ]}
        onPress={() => canProceed && step.id > 1 ? handleStepAction(step) : null}
        disabled={!canProceed || step.id === 1}
      >
        <View style={styles.stepHeader}>
          <View style={[
            styles.stepIcon,
            isCompleted && styles.stepCompleted,
            isActive && styles.stepActive
          ]}>
            <Ionicons 
              name={isCompleted ? "checkmark" : step.icon} 
              size={24} 
              color={isCompleted || isActive ? "white" : "#666"} 
            />
          </View>
          
          <View style={styles.stepContent}>
            <Text style={[
              styles.stepTitle,
              isActive && styles.stepActiveTitle,
              isCompleted && styles.stepCompletedTitle
            ]}>
              {step.title}
            </Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
            
            {step.id === 3 && tradeData?.meetingLocation && (
              <Text style={styles.meetingInfo}>📍 {tradeData.meetingLocation}</Text>
            )}
            
            {canProceed && step.id > 1 && (
              <Text style={styles.tapHint}>👆 Tap to proceed</Text>
            )}
          </View>
        </View>

        {canProceed && step.id > 1 && (
          <View style={styles.stepButtonContainer}>
            <TouchableOpacity
              style={[styles.stepButton, loading && styles.buttonDisabled]}
              onPress={() => handleStepAction(step)}
              disabled={loading}
            >
              <Text style={styles.stepButtonText}>
                {getStepButtonText(step.id)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getStepButtonText = (stepId) => {
    switch (stepId) {
      case 2: return 'Confirm Contact Exchange';
      case 3: return 'Set Meeting Details';
      case 4: return 'Confirm Meeting';
      case 5: return 'Complete Trade';
      case 6: return 'Rate Experience';
      default: return 'Continue';
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading Trade...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading trade information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tradeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trade Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Trade Information Not Found</Text>
          <Text style={styles.errorText}>
            The trade information could not be loaded. This might happen if:
          </Text>
          <Text style={styles.errorBullet}>• The trade was cancelled or completed</Text>
          <Text style={styles.errorBullet}>• There was a connection issue</Text>
          <Text style={styles.errorBullet}>• The trade data is still being processed</Text>
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Trade Progress</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Chat', {
          conversationId: tradeData.conversationId,
          otherUserId: tradeData.sellerId === user.uid ? tradeData.buyerId : tradeData.sellerId,
          otherUserName: tradeData.sellerId === user.uid ? tradeData.buyerName : tradeData.sellerName,
          itemTitle: tradeData.itemTitle
        })}>
          <Ionicons name="chatbubble" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Trade Summary */}
        <View style={styles.tradeSummary}>
          <Text style={styles.summaryTitle}>Trade Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item:</Text>
            <Text style={styles.summaryValue}>{tradeData.itemTitle}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price:</Text>
            <Text style={styles.summaryValue}>${tradeData.offerAmount || tradeData.finalPrice}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {tradeData.sellerId === user.uid ? 'Buyer:' : 'Seller:'}
            </Text>
            <Text style={styles.summaryValue}>
              {tradeData.sellerId === user.uid ? tradeData.buyerName : tradeData.sellerName}
            </Text>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Trade Process</Text>
          {TRADE_STEPS.map(renderStep)}
        </View>
      </ScrollView>
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
  },
  tradeSummary: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stepsContainer: {
    backgroundColor: 'white',
    padding: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stepContainer: {
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepContainerActive: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepActive: {
    backgroundColor: '#FF6B6B',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepActiveTitle: {
    color: '#FF6B6B',
  },
  stepCompletedTitle: {
    color: '#4CAF50',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
  },
  meetingInfo: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  stepButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  stepButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stepButtonContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  tapHint: {
    fontSize: 12,
    color: '#FF6B6B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorBullet: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
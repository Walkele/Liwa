import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const TRADE_STEPS = [
  { id: 1, title: 'Agree to Trade', description: 'Both parties confirm the trade' },
  { id: 2, title: 'Arrange Meetup', description: 'Set time and location' },
  { id: 3, title: 'Meet & Inspect', description: 'Inspect items in person' },
  { id: 4, title: 'Complete Trade', description: 'Exchange items and confirm' },
  { id: 5, title: 'Rate Experience', description: 'Rate your trading partner' }
];

export default function TradeScreen({ route, navigation }) {
  const { matchId, conversationId, otherUserId, buyerItem, sellerItem } = route.params;
  const { user } = useAuth();
  const [tradeStatus, setTradeStatus] = useState('trading');
  const [currentStep, setCurrentStep] = useState(1);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [otherConfirmed, setOtherConfirmed] = useState(false);
  const [meetupDetails, setMeetupDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for trade updates
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTradeStatus(data.status || 'trading');
        setCurrentStep(data.currentStep || 1);
        setUserConfirmed(data.confirmations?.[user.uid] || false);
        setOtherConfirmed(data.confirmations?.[otherUserId] || false);
        setMeetupDetails(data.meetupDetails || null);
      }
    });

    return unsubscribe;
  }, [matchId, user.uid, otherUserId]);

  const handleStepAction = async (stepId) => {
    setLoading(true);
    try {
      switch (stepId) {
        case 1:
          await confirmTrade();
          break;
        case 2:
          await arrangeMeetup();
          break;
        case 3:
          await confirmMeetup();
          break;
        case 4:
          await completeTrade();
          break;
        case 5:
          await rateTrade();
          break;
      }
    } catch (error) {
      console.error('Error handling step action:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmTrade = async () => {
    const newConfirmations = {
      [`confirmations.${user.uid}`]: true
    };

    await updateDoc(doc(db, 'matches', matchId), newConfirmations);

    // Check if both confirmed
    if (otherConfirmed) {
      await updateDoc(doc(db, 'matches', matchId), {
        currentStep: 2,
        status: 'arranging_meetup'
      });
    }
  };

  const arrangeMeetup = async () => {
    Alert.prompt(
      'Arrange Meetup',
      'Suggest a meeting location:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suggest',
          onPress: async (location) => {
            if (location) {
              await updateDoc(doc(db, 'matches', matchId), {
                meetupDetails: {
                  location,
                  suggestedBy: user.uid,
                  status: 'pending'
                }
              });
              
              // Add message to conversation
              await addDoc(collection(db, 'messages'), {
                conversationId,
                senderId: user.uid,
                text: `I suggest we meet at: ${location}`,
                timestamp: new Date(),
                type: 'meetup_suggestion'
              });
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const confirmMeetup = async () => {
    Alert.alert(
      'Confirm Meetup',
      'Have you met and inspected the items?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Confirmed',
          onPress: async () => {
            await updateDoc(doc(db, 'matches', matchId), {
              currentStep: 4,
              status: 'meeting_confirmed',
              [`meetupConfirmations.${user.uid}`]: true
            });
          }
        }
      ]
    );
  };

  const completeTrade = async () => {
    Alert.alert(
      'Complete Trade',
      'Confirm that you have exchanged items and the trade is complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Trade',
          onPress: async () => {
            await updateDoc(doc(db, 'matches', matchId), {
              [`tradeCompletions.${user.uid}`]: true,
              status: 'completing'
            });

            // If both completed, mark as completed
            if (otherConfirmed) {
              await updateDoc(doc(db, 'matches', matchId), {
                currentStep: 5,
                status: 'completed',
                completedAt: new Date()
              });

              // Update item statuses
              await updateDoc(doc(db, 'items', buyerItem.id), { status: 'traded' });
              await updateDoc(doc(db, 'items', sellerItem.id), { status: 'traded' });
            }
          }
        }
      ]
    );
  };

  const rateTrade = async () => {
    Alert.prompt(
      'Rate Your Experience',
      'Rate this trade (1-5 stars):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (rating) => {
            const ratingNum = parseInt(rating);
            if (ratingNum >= 1 && ratingNum <= 5) {
              await addDoc(collection(db, 'ratings'), {
                fromUserId: user.uid,
                toUserId: otherUserId,
                matchId,
                rating: ratingNum,
                createdAt: new Date()
              });

              Alert.alert('Thank you!', 'Your rating has been submitted.');
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
    const isActive = step.id === currentStep;
    const isCompleted = step.id < currentStep;
    const canProceed = step.id === currentStep;

    return (
      <View key={step.id} style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={[
            styles.stepNumber,
            isCompleted && styles.stepCompleted,
            isActive && styles.stepActive
          ]}>
            {isCompleted ? (
              <Ionicons name="checkmark" size={20} color="white" />
            ) : (
              <Text style={[
                styles.stepNumberText,
                isActive && styles.stepActiveText
              ]}>
                {step.id}
              </Text>
            )}
          </View>
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, isActive && styles.stepActiveTitle]}>
              {step.title}
            </Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        </View>

        {canProceed && (
          <TouchableOpacity
            style={[styles.stepButton, loading && styles.buttonDisabled]}
            onPress={() => handleStepAction(step.id)}
            disabled={loading}
          >
            <Text style={styles.stepButtonText}>
              {getStepButtonText(step.id)}
            </Text>
          </TouchableOpacity>
        )}

        {step.id === 1 && (
          <View style={styles.confirmationStatus}>
            <Text style={styles.confirmationText}>
              You: {userConfirmed ? '✅ Confirmed' : '⏳ Pending'}
            </Text>
            <Text style={styles.confirmationText}>
              Them: {otherConfirmed ? '✅ Confirmed' : '⏳ Pending'}
            </Text>
          </View>
        )}

        {step.id === 2 && meetupDetails && (
          <View style={styles.meetupInfo}>
            <Text style={styles.meetupTitle}>Suggested Location:</Text>
            <Text style={styles.meetupLocation}>{meetupDetails.location}</Text>
          </View>
        )}
      </View>
    );
  };

  const getStepButtonText = (stepId) => {
    switch (stepId) {
      case 1: return userConfirmed ? 'Waiting for them...' : 'Confirm Trade';
      case 2: return 'Suggest Meetup Location';
      case 3: return 'Confirm Meetup';
      case 4: return 'Complete Trade';
      case 5: return 'Rate Experience';
      default: return 'Continue';
    }
  };

  const isUserBuyer = buyerItem.userId === user.uid;
  const userItem = isUserBuyer ? buyerItem : sellerItem;
  const otherItem = isUserBuyer ? sellerItem : buyerItem;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Progress</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
          <Ionicons name="chatbubble" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Trade Items */}
        <View style={styles.tradeItems}>
          <View style={styles.itemContainer}>
            <Text style={styles.itemLabel}>Your Item</Text>
            <View style={styles.itemCard}>
              {userItem.images && userItem.images.length > 0 ? (
                <Image source={{ uri: userItem.images[0] }} style={styles.itemImage} />
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                </View>
              )}
              <Text style={styles.itemTitle}>{userItem.title}</Text>
              <Text style={styles.itemPrice}>${userItem.price}</Text>
            </View>
          </View>

          <View style={styles.swapIcon}>
            <Ionicons name="swap-horizontal" size={32} color="#FF6B6B" />
          </View>

          <View style={styles.itemContainer}>
            <Text style={styles.itemLabel}>Their Item</Text>
            <View style={styles.itemCard}>
              {otherItem.images && otherItem.images.length > 0 ? (
                <Image source={{ uri: otherItem.images[0] }} style={styles.itemImage} />
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                </View>
              )}
              <Text style={styles.itemTitle}>{otherItem.title}</Text>
              <Text style={styles.itemPrice}>${otherItem.price}</Text>
            </View>
          </View>
        </View>

        {/* Trade Steps */}
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
  tradeItems: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  itemCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    width: '100%',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  swapIcon: {
    marginHorizontal: 16,
    padding: 8,
  },
  stepsContainer: {
    backgroundColor: 'white',
    padding: 20,
  },
  stepsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  stepActiveText: {
    color: 'white',
  },
  stepInfo: {
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
  stepDescription: {
    fontSize: 14,
    color: '#666',
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
  confirmationStatus: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  meetupInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  meetupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  meetupLocation: {
    fontSize: 14,
    color: '#4CAF50',
  },
});
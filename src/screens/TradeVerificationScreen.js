import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TradeStateEngine } from '../services/TradeStateEngine';
import { useAuth } from '../context/AuthContext';

export default function TradeVerificationScreen({ route, navigation }) {
  const { tradeId, userRole, partnerName, itemTitle, verificationCode } = route.params;
  const { user } = useAuth();
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [tradeData, setTradeData] = useState(null);

  useEffect(() => {
    loadTradeData();
    const timer = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const loadTradeData = async () => {
    try {
      // Load trade data to get deadline
      // This would typically come from Firebase
      setTradeData({
        exchangeDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });
    } catch (error) {
      console.error('Error loading trade data:', error);
    }
  };

  const updateTimer = () => {
    if (tradeData?.exchangeDeadline) {
      const remaining = TradeStateEngine.getTimeRemaining(tradeData.exchangeDeadline);
      setTimeRemaining(remaining.display);
    }
  };

  const handleVerifyCode = async () => {
    if (!enteredCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await TradeStateEngine.verifyExchangeCode(tradeId, user.uid, enteredCode);
      
      if (result.verified) {
        Alert.alert(
          'Success!', 
          result.nextStep,
          [
            {
              text: 'OK',
              onPress: () => {
                if (result.bothVerified) {
                  navigation.navigate('TradeCompletion', { tradeId });
                } else {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTrade = async () => {
    Alert.alert(
      'Complete Trade',
      'Are you sure both parties have exchanged items and you want to mark this trade as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Trade',
          onPress: async () => {
            setLoading(true);
            try {
              await TradeStateEngine.completeTrade(tradeId, user.uid);
              Alert.alert(
                'Trade Completed!',
                'The trade has been successfully completed. You can now start new trades with this user.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Messages')
                  }
                ]
              );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Verification</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Ionicons name="time" size={24} color="#FF6B6B" />
          <Text style={styles.timerText}>Time remaining: {timeRemaining}</Text>
        </View>

        {/* Trade Info */}
        <View style={styles.tradeInfoCard}>
          <Text style={styles.tradeInfoTitle}>Trade with {partnerName}</Text>
          <Text style={styles.tradeInfoSubtitle}>Item: {itemTitle}</Text>
        </View>

        {/* Your Verification Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>Your Verification Code</Text>
          <Text style={styles.codeSubtitle}>Share this code with {partnerName} during the exchange</Text>
          <View style={styles.codeDisplay}>
            <Text style={styles.codeText}>{verificationCode}</Text>
          </View>
          <Text style={styles.codeNote}>Keep this code private until you meet in person</Text>
        </View>

        {/* Partner's Code Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputTitle}>Enter {partnerName}'s Code</Text>
          <Text style={styles.inputSubtitle}>Enter the code they share with you during the exchange</Text>
          
          <TextInput
            style={styles.codeInput}
            value={enteredCode}
            onChangeText={setEnteredCode}
            placeholder="Enter verification code"
            autoCapitalize="characters"
            maxLength={6}
          />
          
          <TouchableOpacity
            style={[styles.verifyButton, { opacity: enteredCode.length === 6 ? 1 : 0.5 }]}
            onPress={handleVerifyCode}
            disabled={loading || enteredCode.length !== 6}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Verify Exchange'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Complete Trade Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteTrade}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.completeButtonText}>Mark Trade as Completed</Text>
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Exchange Instructions</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1.</Text>
              <Text style={styles.instructionText}>Meet in a safe, public location</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2.</Text>
              <Text style={styles.instructionText}>Inspect both items carefully</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3.</Text>
              <Text style={styles.instructionText}>Exchange verification codes</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4.</Text>
              <Text style={styles.instructionText}>Complete the physical exchange</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>5.</Text>
              <Text style={styles.instructionText}>Mark the trade as completed in the app</Text>
            </View>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  tradeInfoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tradeInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tradeInfoSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  codeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  codeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  codeSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeDisplay: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 4,
  },
  codeNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  verifyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginRight: 12,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
});
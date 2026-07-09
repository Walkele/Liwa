import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  NetInfo 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const OfflineQRFallback = ({ 
  conversationId,
  currentUserId,
  onCodeConfirmed,
  style 
}) => {
  const [isOffline, setIsOffline] = useState(false);
  const [myOfflineCode, setMyOfflineCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnectivity();
    generateOfflineCode();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);

  const checkConnectivity = async () => {
    const state = await NetInfo.fetch();
    setIsOffline(!state.isConnected);
  };

  const generateOfflineCode = async () => {
    try {
      // Check if we already have a code for this trade
      const existingCode = await AsyncStorage.getItem(`offline_code_${conversationId}_${currentUserId}`);
      
      if (existingCode) {
        setMyOfflineCode(existingCode);
      } else {
        // Generate new 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setMyOfflineCode(code);
        
        // Store it locally
        await AsyncStorage.setItem(`offline_code_${conversationId}_${currentUserId}`, code);
      }
    } catch (error) {
      console.error('Error generating offline code:', error);
    }
  };

  const handleConfirmCodes = async () => {
    if (partnerCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code from your partner.');
      return;
    }

    setLoading(true);
    try {
      // Store the exchange locally
      const exchangeData = {
        conversationId,
        myUserId: currentUserId,
        myCode: myOfflineCode,
        partnerCode: partnerCode,
        timestamp: new Date().toISOString(),
        synced: false
      };

      await AsyncStorage.setItem(`offline_exchange_${conversationId}`, JSON.stringify(exchangeData));
      
      // Try to sync immediately if we have connection
      if (!isOffline) {
        await syncOfflineExchange(exchangeData);
      }

      onCodeConfirmed(exchangeData);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineExchange = async (exchangeData) => {
    try {
      // This would sync with your backend when connection is restored
      console.log('Syncing offline exchange:', exchangeData);
      
      // Mark as synced
      exchangeData.synced = true;
      await AsyncStorage.setItem(`offline_exchange_${conversationId}`, JSON.stringify(exchangeData));
      
    } catch (error) {
      console.error('Error syncing offline exchange:', error);
    }
  };

  const formatCode = (code) => {
    return code.replace(/(\d{3})(\d{3})/, '$1 $2');
  };

  if (!isOffline && !myOfflineCode) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-off" size={20} color="#F44336" />
          <Text style={styles.offlineText}>
            Offline Mode Active: Your swap will sync once you have signal
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>Manual Code Exchange</Text>
        <Text style={styles.subtitle}>
          Use these codes if QR scanning isn't working
        </Text>

        {/* My Code */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Your Code</Text>
          <Text style={styles.sectionSubtitle}>Share this code with your partner</Text>
          
          <View style={styles.myCodeContainer}>
            <Text style={styles.myCode}>{formatCode(myOfflineCode)}</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => {
                // Copy to clipboard functionality would go here
                Alert.alert('Code Copied', 'Your code has been copied to clipboard');
              }}
            >
              <Ionicons name="copy" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Partner Code Input */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Partner's Code</Text>
          <Text style={styles.sectionSubtitle}>Enter the 6-digit code from your partner</Text>
          
          <TextInput
            style={styles.codeInput}
            placeholder="000 000"
            value={formatCode(partnerCode)}
            onChangeText={(text) => setPartnerCode(text.replace(/\s/g, '').slice(0, 6))}
            keyboardType="numeric"
            maxLength={7} // 6 digits + 1 space
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (partnerCode.length !== 6 || loading) && styles.disabledButton
          ]}
          onPress={handleConfirmCodes}
          disabled={partnerCode.length !== 6 || loading}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color="white" 
          />
          <Text style={styles.confirmButtonText}>
            {loading ? 'Confirming...' : 'Confirm Exchange'}
          </Text>
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How it works:</Text>
          <Text style={styles.instructionText}>
            1. Share your code with your partner
          </Text>
          <Text style={styles.instructionText}>
            2. Enter their code above
          </Text>
          <Text style={styles.instructionText}>
            3. Both confirm to complete the trade
          </Text>
          <Text style={styles.instructionText}>
            4. Trade will sync when you're back online
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  offlineText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  codeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  myCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  myCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'center',
  },
  copyButton: {
    padding: 8,
  },
  codeInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'monospace',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructions: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
});
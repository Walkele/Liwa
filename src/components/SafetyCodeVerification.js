import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafetyHandshakeService } from '../services/SafetyHandshakeService';

const SafetyCodeVerification = ({ 
  visible, 
  onClose, 
  tradeId, 
  userId,
  onVerificationComplete 
}) => {
  const [enteredCode, setEnteredCode] = useState('');
  const [handshakeStatus, setHandshakeStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (visible && tradeId) {
      loadHandshakeStatus();
      getCurrentLocation();
    }
  }, [visible, tradeId]);

  const loadHandshakeStatus = async () => {
    try {
      const status = await SafetyHandshakeService.getHandshakeStatus(tradeId, userId);
      setHandshakeStatus(status);
    } catch (error) {
      console.error('Error loading handshake status:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      // Request location permission and get current location
      // This would integrate with expo-location
      // For now, we'll use a placeholder
      setLocation({
        latitude: 37.7749,
        longitude: -122.4194
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setLoading(true);

      if (!enteredCode.trim()) {
        Alert.alert('Missing Code', 'Please enter your 4-digit safety code.');
        return;
      }

      if (enteredCode.length !== 4) {
        Alert.alert('Invalid Code', 'Safety code must be 4 digits.');
        return;
      }

      const result = await SafetyHandshakeService.verifySafetyHandshake(
        handshakeStatus.handshakeId,
        userId,
        enteredCode,
        location
      );

      if (result.success) {
        Alert.alert(
          'Code Verified!',
          result.allParticipantsVerified 
            ? 'Both parties have verified their codes. You can now proceed with the exchange.'
            : 'Your code has been verified. Waiting for the other party to verify their code.',
          [{ 
            text: 'OK', 
            onPress: () => {
              onVerificationComplete?.(result);
              onClose();
            }
          }]
        );
      }

    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Verification Failed', error.message || 'Invalid safety code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Safety Concern',
      'Are you experiencing a safety issue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report Issue', 
          style: 'destructive',
          onPress: () => sendEmergencyAlert()
        }
      ]
    );
  };

  const sendEmergencyAlert = async () => {
    try {
      await SafetyHandshakeService.sendEmergencyAlert(
        handshakeStatus.handshakeId,
        userId,
        'safety_concern',
        { location: location }
      );
      
      Alert.alert(
        'Alert Sent',
        'Safety alert has been sent. The other party has been notified.',
        [{ text: 'OK', onPress: onClose }]
      );
      
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert('Error', 'Failed to send safety alert.');
    }
  };

  const formatCode = (code) => {
    // Format as XXXX for display
    return code.replace(/\D/g, '').slice(0, 4);
  };

  if (!handshakeStatus?.exists) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Safety Verification</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.content}>
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={48} color="#F44336" />
              <Text style={styles.errorTitle}>No Safety Codes Found</Text>
              <Text style={styles.errorText}>
                Safety codes haven't been generated for this trade yet.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Safety Verification</Text>
          <TouchableOpacity onPress={handleEmergencyAlert} style={styles.emergencyButton}>
            <Ionicons name="warning" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={handshakeStatus.isVerified ? "checkmark-circle" : "shield"} 
                size={24} 
                color={handshakeStatus.isVerified ? "#4CAF50" : "#FF6B6B"} 
              />
              <Text style={styles.statusTitle}>
                {handshakeStatus.isVerified ? 'Verified' : 'Verification Required'}
              </Text>
            </View>
            
            <Text style={styles.statusText}>
              {handshakeStatus.isVerified 
                ? 'Your safety code has been verified.'
                : 'Enter your 4-digit safety code to verify your identity.'
              }
            </Text>
            
            {handshakeStatus.allVerified && (
              <View style={styles.allVerifiedBanner}>
                <Ionicons name="people" size={16} color="#4CAF50" />
                <Text style={styles.allVerifiedText}>
                  Both parties verified - Exchange can proceed
                </Text>
              </View>
            )}
          </View>

          {/* Your Code Display */}
          <View style={styles.codeDisplayCard}>
            <Text style={styles.codeDisplayTitle}>Your Safety Code</Text>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeDisplayText}>{handshakeStatus.userCode}</Text>
            </View>
            <Text style={styles.codeDisplayHint}>
              Share this code verbally when you meet
            </Text>
          </View>

          {/* Code Input */}
          {!handshakeStatus.isVerified && (
            <View style={styles.inputSection}>
              <Text style={styles.inputTitle}>Enter Other Party's Code</Text>
              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  value={enteredCode}
                  onChangeText={(text) => setEnteredCode(formatCode(text))}
                  placeholder="0000"
                  keyboardType="numeric"
                  maxLength={4}
                  placeholderTextColor="#999"
                />
              </View>
              
              <Text style={styles.inputHint}>
                Ask the other party for their 4-digit code
              </Text>
              
              {handshakeStatus.attemptsRemaining < 3 && (
                <View style={styles.warningCard}>
                  <Ionicons name="warning" size={16} color="#FF9800" />
                  <Text style={styles.warningText}>
                    {handshakeStatus.attemptsRemaining} attempts remaining
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Safety Tips */}
          <View style={styles.safetyTips}>
            <Text style={styles.safetyTipsTitle}>Safety Tips</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Meet in a public, well-lit location</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Verify codes before exchanging items</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Trust your instincts - report any concerns</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {!handshakeStatus.isVerified && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading || !enteredCode || enteredCode.length !== 4}
            >
              <Text style={styles.verifyButtonText}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emergencyButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  allVerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  allVerifiedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  codeDisplayCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  codeDisplayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  codeDisplay: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    marginBottom: 8,
  },
  codeDisplayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    letterSpacing: 8,
  },
  codeDisplayHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  codeInputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 16,
    textAlign: 'center',
    letterSpacing: 4,
    width: '100%',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  safetyTips: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  safetyTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  errorCard: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  verifyButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#CCC',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default SafetyCodeVerification;
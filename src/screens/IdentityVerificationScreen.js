import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function IdentityVerificationScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [idDocumentType, setIdDocumentType] = useState(null);

  const documentTypes = [
    { id: 'passport', name: 'Passport', icon: 'book-outline', description: 'Government-issued passport' },
    { id: 'drivers_license', name: "Driver's License", icon: 'card-outline', description: 'Valid driver license' },
    { id: 'national_id', name: 'National ID', icon: 'id-card-outline', description: 'National identity card' },
  ];

  const verificationSteps = [
    { id: 1, title: 'Phone Verification', description: 'Verify your phone number' },
    { id: 2, title: 'Identity Document', description: 'Upload government ID' },
    { id: 3, title: 'Selfie Verification', description: 'Take a selfie for verification' },
    { id: 4, title: 'Complete', description: 'Verification submitted' },
  ];

  const handleSendCode = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      Alert.alert('Code Sent', `Verification code sent to ${phoneNumber}`);
    }, 1500);
  };

  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the verification code');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  const handleDocumentSelect = (type) => {
    setIdDocumentType(type);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(4);
    }, 2000);
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="call-outline" size={48} color="#FF6B6B" />
      </View>
      <Text style={styles.stepTitle}>Verify Your Phone</Text>
      <Text style={styles.stepDescription}>
        We'll send a verification code to your phone number to confirm your identity
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 000-0000"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.actionButton, (!phoneNumber || phoneNumber.length < 10) && styles.disabledButton]}
        onPress={handleSendCode}
        disabled={!phoneNumber || phoneNumber.length < 10 || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.actionButtonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad-outline" size={48} color="#FF6B6B" />
      </View>
      <Text style={styles.stepTitle}>Enter Verification Code</Text>
      <Text style={styles.stepDescription}>
        Enter the 6-digit code sent to {phoneNumber}
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Verification Code</Text>
        <TextInput
          style={styles.input}
          placeholder="000000"
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      <TouchableOpacity
        style={[styles.actionButton, (!verificationCode || verificationCode.length < 4) && styles.disabledButton]}
        onPress={handleVerifyCode}
        disabled={!verificationCode || verificationCode.length < 4 || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.actionButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton}>
        <Text style={styles.resendButtonText}>Resend Code</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="document-text-outline" size={48} color="#FF6B6B" />
      </View>
      <Text style={styles.stepTitle}>Upload Identity Document</Text>
      <Text style={styles.stepDescription}>
        Select the type of government ID you'd like to use for verification
      </Text>
      
      <View style={styles.documentTypes}>
        {documentTypes.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.documentType,
              idDocumentType === type.id && styles.selectedDocumentType
            ]}
            onPress={() => handleDocumentSelect(type.id)}
          >
            <View style={styles.documentIcon}>
              <Ionicons name={type.icon} size={32} color={idDocumentType === type.id ? '#FF6B6B' : '#666'} />
            </View>
            <Text style={styles.documentName}>{type.name}</Text>
            <Text style={styles.documentDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Uploading and verifying document...</Text>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
      </View>
      <Text style={styles.stepTitle}>Verification Submitted!</Text>
      <Text style={styles.stepDescription}>
        Your identity verification has been submitted for review. This typically takes 1-2 business days.
      </Text>
      
      <View style={styles.successInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={20} color="#FF6B6B" />
          <Text style={styles.infoText}>Review time: 1-2 business days</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={20} color="#FF6B6B" />
          <Text style={styles.infoText}>You'll receive email notification</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#FF6B6B" />
          <Text style={styles.infoText}>Verified badge upon approval</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.actionButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {verificationSteps.map((s, index) => (
          <View key={s.id} style={styles.progressStep}>
            <View style={[
              styles.progressCircle,
              step >= s.id && styles.progressCircleActive,
              step > s.id && styles.progressCircleComplete
            ]}>
              {step > s.id ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text style={[
                  styles.progressNumber,
                  step >= s.id && styles.progressNumberActive
                ]}>{s.id}</Text>
              )}
            </View>
            <Text style={[
              styles.progressLabel,
              step >= s.id && styles.progressLabelActive
            ]}>{s.title}</Text>
            {index < verificationSteps.length - 1 && (
              <View style={[
                styles.progressLine,
                step > s.id && styles.progressLineActive
              ]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#4CAF50" />
        <Text style={styles.securityText}>Secure verification powered by Stripe Identity</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCircleActive: {
    backgroundColor: '#FF6B6B',
  },
  progressCircleComplete: {
    backgroundColor: '#4CAF50',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  progressNumberActive: {
    color: 'white',
  },
  progressLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  progressLine: {
    position: 'absolute',
    top: 16,
    right: -50,
    width: 100,
    height: 2,
    backgroundColor: '#E8E8E8',
  },
  progressLineActive: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  actionButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    marginTop: 16,
  },
  resendButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  documentTypes: {
    width: '100%',
    marginBottom: 20,
  },
  documentType: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDocumentType: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  documentDescription: {
    fontSize: 12,
    color: '#888',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  successInfo: {
    width: '100%',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 12,
    fontWeight: '500',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
});
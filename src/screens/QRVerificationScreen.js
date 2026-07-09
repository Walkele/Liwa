import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QRVerificationService } from '../services/QRVerificationService';
import { useAuth } from '../context/AuthContext';

// Conditional imports for Expo Go compatibility
let BarCodeScanner, QRCode;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
  QRCode = require('react-native-qrcode-svg').default;
} catch (error) {
  console.warn('QR dependencies not available in this environment');
}

const { width } = Dimensions.get('window');

export default function QRVerificationScreen({ route, navigation }) {
  const { tradeId, otherUserName, tradeValue } = route.params;
  const { user } = useAuth();
  
  const [qrData, setQrData] = useState(null);
  const [verificationCode, setVerificationCode] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeQRVerification();
    requestCameraPermission();
  }, []);

  const initializeQRVerification = async () => {
    try {
      setLoading(true);
      
      // Generate QR codes for this trade
      const participants = [user.uid]; // Add other participant ID here
      const qrResult = await QRVerificationService.generateTradeQRCodes(tradeId, participants);
      
      setQrData(qrResult.qrData[user.uid]);
      setVerificationCode(qrResult.verificationCodes[user.uid]);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to generate QR codes');
      console.error('QR initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    if (!BarCodeScanner) {
      Alert.alert('Scanner Not Available', 'QR code scanner is not available in this environment');
      return;
    }
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    
    try {
      const location = await QRVerificationService.getCurrentLocation();
      const result = await QRVerificationService.verifyQRScan(data, user.uid, location);
      
      if (result.success) {
        setVerificationStatus(result.bothVerified ? 'complete' : 'partial');
        Alert.alert(
          'Success!', 
          result.message,
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowScanner(false);
                if (result.bothVerified) {
                  navigation.navigate('TradeComplete', { tradeId });
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Verification Failed', error.message);
      setScanned(false);
    }
  };

  const openScanner = () => {
    if (!BarCodeScanner) {
      Alert.alert(
        'Scanner Not Available', 
        'QR code scanner is not available in this environment. You can enter the code manually.',
        [
          {
            text: 'Enter Manually',
            onPress: () => {
              Alert.prompt(
                'Manual Code Entry',
                'Enter the verification code:',
                (text) => {
                  if (text) {
                    handleBarCodeScanned({ data: text });
                  }
                }
              );
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }
    
    if (hasPermission === null) {
      Alert.alert('Permission Required', 'Camera permission is required to scan QR codes');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('No Access', 'No access to camera');
      return;
    }
    setScanned(false);
    setShowScanner(true);
  };

  const getVerificationRequirements = () => {
    return QRVerificationService.getVerificationRequirements(tradeValue);
  };

  const requirements = getVerificationRequirements();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="qr-code" size={64} color="#FF6B6B" />
          <Text style={styles.loadingText}>Generating QR codes...</Text>
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
        <Text style={styles.headerTitle}>Trade Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Trade Info */}
        <View style={styles.tradeInfoCard}>
          <View style={styles.tradeInfoHeader}>
            <Ionicons name="swap-horizontal" size={24} color="#FF6B6B" />
            <Text style={styles.tradeInfoTitle}>Trade with {otherUserName}</Text>
          </View>
          <Text style={styles.tradeValue}>Value: ${tradeValue}</Text>
          <Text style={styles.requirementLevel}>
            {requirements.description}
          </Text>
        </View>

        {/* Verification Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={verificationStatus === 'complete' ? 'checkmark-circle' : 
                   verificationStatus === 'partial' ? 'time' : 'qr-code'} 
              size={24} 
              color={verificationStatus === 'complete' ? '#4CAF50' : 
                    verificationStatus === 'partial' ? '#FF9800' : '#666'} 
            />
            <Text style={styles.statusTitle}>
              {verificationStatus === 'complete' ? 'Verification Complete' :
               verificationStatus === 'partial' ? 'Partially Verified' :
               'Verification Pending'}
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {verificationStatus === 'complete' ? 
              'Both participants have verified each other. Trade can proceed!' :
             verificationStatus === 'partial' ?
              'You have scanned their QR code. Waiting for them to scan yours.' :
              'Both participants need to scan each other\'s QR codes to proceed.'}
          </Text>
        </View>

        {/* Your QR Code */}
        <View style={styles.qrCard}>
          <Text style={styles.qrCardTitle}>Your QR Code</Text>
          <Text style={styles.qrCardSubtitle}>
            Show this to {otherUserName} to scan
          </Text>
          
          <View style={styles.qrCodeContainer}>
            {qrData && QRCode ? (
              <QRCode
                value={qrData}
                size={width * 0.6}
                backgroundColor="white"
                color="black"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={width * 0.3} color="#CCC" />
                <Text style={styles.qrPlaceholderText}>
                  {QRCode ? 'Generating QR Code...' : 'QR Code not available in this environment'}
                </Text>
                {qrData && (
                  <Text style={styles.qrDataText} selectable>
                    Code: {qrData}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.verificationCodeContainer}>
            <Text style={styles.verificationCodeLabel}>Verification Code:</Text>
            <Text style={styles.verificationCode}>{verificationCode}</Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={openScanner}
        >
          <Ionicons name="scan" size={24} color="white" />
          <Text style={styles.scanButtonText}>
            Scan {otherUserName}'s QR Code
          </Text>
        </TouchableOpacity>

        {/* Safety Instructions */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.safetyTitle}>Safety Instructions</Text>
          </View>
          <View style={styles.safetyInstructions}>
            <Text style={styles.safetyInstruction}>
              • Meet in a public, well-lit location
            </Text>
            <Text style={styles.safetyInstruction}>
              • Verify the item condition before scanning
            </Text>
            <Text style={styles.safetyInstruction}>
              • Both parties must scan each other's QR codes
            </Text>
            <Text style={styles.safetyInstruction}>
              • Keep your verification code private
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {BarCodeScanner ? (
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={styles.scanner}
            />
          ) : (
            <View style={styles.scannerPlaceholder}>
              <Ionicons name="camera-outline" size={80} color="#CCC" />
              <Text style={styles.scannerPlaceholderText}>
                Camera scanner not available in this environment
              </Text>
              <TouchableOpacity 
                style={styles.manualInputButton}
                onPress={() => {
                  Alert.prompt(
                    'Manual Code Entry',
                    'Enter the verification code manually:',
                    (text) => {
                      if (text) {
                        handleBarCodeScanned({ data: text });
                      }
                    }
                  );
                }}
              >
                <Text style={styles.manualInputButtonText}>Enter Code Manually</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerInstructions}>
              Point your camera at {otherUserName}'s QR code
            </Text>
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
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  tradeInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  tradeValue: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 4,
  },
  requirementLevel: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  qrCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  qrCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  verificationCodeContainer: {
    alignItems: 'center',
  },
  verificationCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  verificationCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    letterSpacing: 2,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  safetyCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  safetyInstructions: {
    marginLeft: 8,
  },
  safetyInstruction: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
    lineHeight: 20,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  qrPlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  qrDataText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    textAlign: 'center',
  },
  scannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 40,
  },
  scannerPlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  manualInputButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  manualInputButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
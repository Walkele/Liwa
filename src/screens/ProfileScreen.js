import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { TrustScoreService } from '../services/TrustScoreService';
import { TrustScoreDisplay, VerificationBadges, TrustSignals, TrustScoreBreakdown } from '../components/TrustScoreDisplay';
import SafeTrustScoreDisplay from '../components/SafeTrustScoreDisplay';
import EmergencyFixButton from '../components/EmergencyFixButton';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function ProfileScreen({ navigation }) {
  // Safe AuthContext access with error handling
  let user = null;
  let logout = () => {};
  
  try {
    const authContext = useAuth();
    user = authContext?.user;
    logout = authContext?.logout || (() => {});
  } catch (error) {
    console.error('Error accessing AuthContext:', error);
    // Return early with error message if context fails
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Authentication Error</Text>
          <Text style={styles.errorSubtext}>Please try logging out and back in</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => {
              // Try to navigate to login or reload
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }}
          >
            <Text style={styles.errorButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const [userStats, setUserStats] = useState({
    totalItems: 0,
    activeItems: 0,
    completedTrades: 0
  });
  const [trustData, setTrustData] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadProfilePhoto();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      await loadUserStats();
      await loadTrustScore();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', user.uid)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map(doc => doc.data());
      
      const tradesQuery = query(
        collection(db, 'trades'),
        where('participants', 'array-contains', user.uid),
        where('status', '==', 'completed')
      );
      const tradesSnapshot = await getDocs(tradesQuery);
      
      setUserStats({
        totalItems: items.length,
        activeItems: items.filter(item => item.status === 'available').length,
        completedTrades: tradesSnapshot.docs.length
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadTrustScore = async () => {
    try {
      const trustScore = await TrustScoreService.calculateTrustScore(user.uid);
      const verifications = await TrustScoreService.getUserVerifications(user.uid);
      
      const totalTradesQuery = query(
        collection(db, 'trades'),
        where('participants', 'array-contains', user.uid)
      );
      const totalTradesSnapshot = await getDocs(totalTradesQuery);
      const totalTrades = totalTradesSnapshot.docs.length;
      const completionRate = totalTrades > 0 ? Math.round((userStats.completedTrades / totalTrades) * 100) : 100;
      
      setTrustData({
        ...trustScore,
        verifications,
        completionRate,
        totalTrades,
        responseTime: user.avgResponseHours || 24
      });
    } catch (error) {
      console.error('Error loading trust score:', error);
      // Set default trust data when user document doesn't exist
      setTrustData({
        score: 0,
        level: 'New User',
        verifications: [],
        completionRate: 100,
        totalTrades: 0,
        responseTime: 24,
        breakdown: {
          baseScore: 0,
          completionBonus: 0,
          verificationBonus: 0,
          responseTimeBonus: 0,
          penaltyDeduction: 0
        }
      });
    }
  };

  const handleVerification = (type) => {
    Alert.alert(
      'Verification',
      `Start ${type.toLowerCase()} verification process?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: () => simulateVerification(type)
        }
      ]
    );
  };

  const simulateVerification = async (type) => {
    try {
      await TrustScoreService.addVerification(user.uid, type.toLowerCase(), {
        method: 'demo',
        verifiedBy: 'system'
      });
      
      await loadTrustScore();
      Alert.alert('Success', `${type} verification completed!`);
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const loadProfilePhoto = async () => {
    try {
      if (user?.profilePhoto) {
        setProfilePhoto(user.profilePhoto);
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const takeProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadProfilePhoto = async (photo) => {
    setUploadingPhoto(true);
    try {
      // Convert URI to base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Create a blob from base64
      const response = await fetch(`data:image/jpeg;base64,${base64}`);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const filename = `profile_${user.uid}_${Date.now()}.jpg`;
      const path = `profile_photos/${filename}`;
      const storageRef = ref(storage, path);
      
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: Date.now().toString()
        }
      };
      
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        profilePhoto: downloadURL,
        profilePhotoUpdatedAt: new Date().toISOString()
      });
      
      setProfilePhoto(downloadURL);
      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Error', 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>Please log in to view your profile</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <TouchableOpacity onPress={() => setShowPhotoMenu(true)} style={styles.userAvatarContainer}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.userAvatarImage} />
              ) : (
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitial}>
                    {user.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.avatarEditButton}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.userInfo}>
              <View style={styles.userNameContainer}>
                <Text style={styles.userName}>{user.name}</Text>
                <VerificationBadges 
                  verifications={trustData?.verifications} 
                  size="medium" 
                  maxVisible={3} 
                />
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userLocation}>{user.location}</Text>
              
              {uploadingPhoto && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#FF6B6B" />
                  <Text style={styles.uploadingText}>Uploading photo...</Text>
                </View>
              )}
            </View>
            
            {/* Use SafeTrustScoreDisplay to handle missing data gracefully */}
            <SafeTrustScoreDisplay
              user={user}
              trustScore={trustData?.score}
              style={{ marginTop: 8 }}
            />
            
            {/* Only show detailed trust display if data exists */}
            {trustData && trustData.score > 0 && (
              <TrustScoreDisplay
                score={trustData.score}
                level={trustData.level}
                size="large"
                showDetails={false}
                onPress={() => setShowBreakdown(true)}
              />
            )}
          </View>
          
          {trustData && trustData.score > 0 && (
            <TrustSignals
              responseTime={trustData.responseTime}
              completionRate={trustData.completionRate}
              totalTrades={trustData.totalTrades}
              size="medium"
            />
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Trading Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.totalItems}</Text>
              <Text style={styles.statLabel}>Items Posted</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.activeItems}</Text>
              <Text style={styles.statLabel}>Active Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.completedTrades}</Text>
              <Text style={styles.statLabel}>Completed Trades</Text>
            </View>
          </View>
        </View>

        {/* Verification Section */}
        <View style={styles.verificationCard}>
          <Text style={styles.sectionTitle}>Account Verification</Text>
          <Text style={styles.sectionSubtitle}>
            Increase your trust score by completing verifications
          </Text>
          
          {Object.entries(TrustScoreService.VERIFICATION_TYPES).map(([key, verification]) => {
            const isVerified = trustData?.verifications?.[key.toLowerCase()]?.status === 'verified';
            
            return (
              <TouchableOpacity
                key={key}
                style={[styles.verificationItem, isVerified && styles.verificationItemVerified]}
                onPress={() => !isVerified && handleVerification(key)}
                disabled={isVerified}
              >
                <View style={styles.verificationLeft}>
                  <Text style={styles.verificationIcon}>{verification.icon}</Text>
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationName}>{verification.name}</Text>
                    <Text style={styles.verificationDescription}>{verification.description}</Text>
                  </View>
                </View>
                
                <View style={styles.verificationRight}>
                  <Text style={styles.verificationPoints}>+{verification.points} pts</Text>
                  {isVerified ? (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Menu Options */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SellerDashboard')}>
            <Ionicons name="bar-chart-outline" size={24} color="#FF6B6B" />
            <Text style={styles.menuItemText}>Seller Dashboard</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyItems')}>
            <Ionicons name="list-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>My Items</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Favorites')}>
            <Ionicons name="heart-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Favorites</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TradeHistory')}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Trade History</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ArchivedItems')}>
            <Ionicons name="archive-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Archived & Completed</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DataConsistencyFix')}>
            <Ionicons name="construct-outline" size={24} color="#FF9800" />
            <Text style={[styles.menuText, { color: '#FF9800' }]}>Fix Data Issues</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DatabaseCleanup')}>
            <Ionicons name="trash-outline" size={24} color="#F44336" />
            <Text style={[styles.menuText, { color: '#F44336' }]}>Data Cleanup Tool</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DatabaseStandardization')}>
            <Ionicons name="server-outline" size={24} color="#2196F3" />
            <Text style={[styles.menuText, { color: '#2196F3' }]}>Database Standardization</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ProductionReadiness')}>
            <Ionicons name="rocket-outline" size={24} color="#4CAF50" />
            <Text style={[styles.menuText, { color: '#4CAF50' }]}>Production Readiness</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          {/* Emergency Fix Button - Direct access */}
          <View style={styles.menuItem}>
            <Ionicons name="medical-outline" size={24} color="#F44336" />
            <View style={styles.emergencyFixContainer}>
              <Text style={[styles.menuText, { color: '#F44336', flex: 1 }]}>Emergency Fix</Text>
              <EmergencyFixButton style={styles.emergencyFixButton} />
            </View>
          </View>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={24} color="#666" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Trust Score Breakdown Modal */}
      <Modal
        visible={showBreakdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBreakdown(false)}
      >
        <View style={styles.modalOverlay}>
          {trustData && trustData.breakdown ? (
            <TrustScoreBreakdown
              breakdown={trustData.breakdown}
              onClose={() => setShowBreakdown(false)}
            />
          ) : (
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Trust Score Breakdown</Text>
              <Text style={styles.modalText}>Trust score data is not available yet.</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowBreakdown(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Photo Upload Menu Modal */}
      <Modal
        visible={showPhotoMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoMenu(false)}
      >
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Change Profile Photo</Text>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => {
              setShowPhotoMenu(false);
              pickProfilePhoto();
            }}>
              <Ionicons name="images" size={24} color="#666" />
              <Text style={styles.menuOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => {
              setShowPhotoMenu(false);
              takeProfilePhoto();
            }}>
              <Ionicons name="camera" size={24} color="#666" />
              <Text style={styles.menuOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuOption, styles.cancelOption]} 
              onPress={() => setShowPhotoMenu(false)}
            >
              <Ionicons name="close" size={24} color="#999" />
              <Text style={[styles.menuOptionText, styles.cancelOptionText]}>Cancel</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  userCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 14,
    color: '#666',
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  verificationCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  verificationItemVerified: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verificationDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  verificationRight: {
    alignItems: 'flex-end',
  },
  verificationPoints: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 4,
  },
  menuCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emergencyFixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emergencyFixButton: {
    marginVertical: 0,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userAvatarContainer: {
    position: 'relative',
  },
  userAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 6,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  cancelOption: {
    borderBottomWidth: 0,
  },
  cancelOptionText: {
    color: '#999',
  },
});
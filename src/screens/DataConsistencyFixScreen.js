import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { DataConsistencyFixService } from '../services/DataConsistencyFixService';
import { DataCleanupService } from '../services/DataCleanupService';
import { OfferStateSyncService } from '../services/OfferStateSyncService';
import { TestUserSeeder } from '../services/TestUserSeeder';

export default function DataConsistencyFixScreen({ navigation }) {
  // Safe context usage with error handling
  let user = null;
  try {
    const authContext = useContext(AuthContext);
    user = authContext?.user;
  } catch (error) {
    console.error('Error accessing AuthContext:', error);
  }
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dataStats, setDataStats] = useState(null);

  const handleQuickFix = async () => {
    if (!user || !user.uid) {
      Alert.alert('Error', 'User information not available. Please try logging out and back in.');
      return;
    }
    
    try {
      setLoading(true);
      setResults(null);
      
      Alert.alert(
        'Quick Fix',
        'This will fix data consistency issues for your account. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fix Now',
            onPress: async () => {
              try {
                const result = await DataConsistencyFixService.quickFixCurrentUser(
                  user.uid,
                  user.email,
                  user.displayName
                );
                
                setResults({
                  type: 'quick',
                  success: result.success,
                  message: 'Quick fix completed successfully!'
                });
                
                Alert.alert('Success', 'Your account data has been fixed!');
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFixOrphanedOffers = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      const result = await DataConsistencyFixService.fixOrphanedOffers();
      
      setResults({
        type: 'orphaned',
        success: result.success,
        fixedCount: result.fixedCount,
        message: `Fixed ${result.fixedCount} orphaned offers`
      });
      
      Alert.alert('Success', `Fixed ${result.fixedCount} orphaned offers`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFixOfferStates = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      // Use the new comprehensive offer state sync
      const result = await OfferStateSyncService.fixAllOfferStates();
      
      setResults({
        type: 'states',
        success: result.success,
        fixedCount: result.fixedCount,
        message: `Fixed ${result.fixedCount} inconsistent offer states`
      });
      
      Alert.alert('Success', `Fixed ${result.fixedCount} inconsistent offer states`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanAllMyData = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      // Get stats before cleanup
      const statsBefore = await DataCleanupService.getDataStatistics(user.uid);
      
      Alert.alert(
        '⚠️ Clean All My Data',
        `This will permanently delete ALL your data:\n\n` +
        `• ${statsBefore.items || 0} Items\n` +
        `• ${statsBefore.offers || 0} Offers\n` +
        `• ${statsBefore.conversations || 0} Conversations\n` +
        `• ${statsBefore.messages || 0} Messages\n` +
        `• ${statsBefore.trades || 0} Trades\n` +
        `• ${statsBefore.favorites || 0} Favorites\n` +
        `• ${statsBefore.swipes || 0} Swipes\n` +
        `• Your user profile\n\n` +
        `This action CANNOT be undone!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'DELETE ALL',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await DataCleanupService.cleanAllUserData(user.uid);
                
                setResults({
                  type: 'cleanup',
                  success: true,
                  ...result,
                  message: `Deleted ${result.total} items total`
                });
                
                Alert.alert(
                  'Data Cleaned! 🧹',
                  `Successfully deleted ${result.total} items:\n\n` +
                  `• Items: ${result.items}\n` +
                  `• Offers: ${result.offers}\n` +
                  `• Conversations: ${result.conversations}\n` +
                  `• Messages: ${result.messages}\n` +
                  `• Trades: ${result.trades}\n` +
                  `• Favorites: ${result.favorites}\n` +
                  `• Swipes: ${result.swipes}\n` +
                  `• Notifications: ${result.notifications}\n` +
                  `• User Document: ${result.userDocument}`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate back to login since user data is deleted
                        Alert.alert(
                          'Account Reset',
                          'Your account data has been completely reset. You\'ll need to sign up again.',
                          [
                            {
                              text: 'Go to Login',
                              onPress: () => navigation.navigate('Login')
                            }
                          ]
                        );
                      }
                    }
                  ]
                );
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanTestData = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      Alert.alert(
        'Clean Test Data',
        'This will delete test items, test users, and test offers. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clean Test Data',
            onPress: async () => {
              try {
                const result = await DataCleanupService.cleanTestDataOnly();
                
                setResults({
                  type: 'testCleanup',
                  success: true,
                  ...result,
                  message: `Cleaned ${result.total} test items`
                });
                
                Alert.alert('Success', `Cleaned ${result.total} test data items`);
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetDataStats = async () => {
    try {
      setLoading(true);
      
      const stats = await DataCleanupService.getDataStatistics(user.uid);
      setDataStats(stats);
      
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      
      Alert.alert(
        'Your Data Statistics',
        `Total items: ${total}\n\n` +
        `• Items: ${stats.items || 0}\n` +
        `• Offers: ${stats.offers || 0}\n` +
        `• Conversations: ${stats.conversations || 0}\n` +
        `• Messages: ${stats.messages || 0}\n` +
        `• Trades: ${stats.trades || 0}\n` +
        `• Favorites: ${stats.favorites || 0}\n` +
        `• Swipes: ${stats.swipes || 0}\n` +
        `• Notifications: ${stats.notifications || 0}`
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTestUsers = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      Alert.alert(
        'Seed Test Users',
        'This will create comprehensive test users (test1-test7) with realistic data for thorough testing. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Seed Users',
            onPress: async () => {
              try {
                const result = await TestUserSeeder.seedAllTestUsers();
                
                setResults({
                  type: 'seeding',
                  success: true,
                  ...result,
                  message: `Created ${result.users} users and ${result.items} items`
                });
                
                Alert.alert(
                  'Test Users Created! 🎉',
                  `Successfully created:\n\n` +
                  `• ${result.users} test users\n` +
                  `• ${result.items} test items\n` +
                  `• Total: ${result.total} documents\n\n` +
                  `Users: test1-test7 with different trust levels, subscriptions, and items for comprehensive testing.`
                );
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedExistingUsers = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      Alert.alert(
        'Seed Existing Users',
        'This will add proper data to your existing test1, test2, test3 users. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Seed Data',
            onPress: async () => {
              try {
                const result = await TestUserSeeder.seedExistingUsers();
                
                setResults({
                  type: 'existingSeeding',
                  success: true,
                  ...result,
                  message: `Enhanced ${result.users} existing users with ${result.items} items`
                });
                
                Alert.alert(
                  'Existing Users Enhanced! ✨',
                  `Successfully enhanced:\n\n` +
                  `• ${result.users} existing users\n` +
                  `• ${result.items} new items\n` +
                  `• Total: ${result.total} documents\n\n` +
                  `Your test1, test2, test3 users now have proper trust scores, items, and realistic data.`
                );
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFullConsistencyCheck = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      Alert.alert(
        'Full Consistency Check',
        'This will check and fix all data consistency issues. This may take a few minutes. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Check',
            onPress: async () => {
              try {
                const result = await DataConsistencyFixService.performFullConsistencyCheck();
                
                setResults({
                  type: 'full',
                  success: true,
                  ...result,
                  message: `Fixed ${result.totalIssues} total issues`
                });
                
                Alert.alert(
                  'Consistency Check Complete',
                  `Fixed ${result.totalIssues} total issues:\n` +
                  `• Users: ${result.usersFixed}\n` +
                  `• Offers: ${result.offersFixed}\n` +
                  `• States: ${result.statesFixed}`
                );
              } catch (error) {
                Alert.alert('Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Ionicons 
            name={results.success ? "checkmark-circle" : "alert-circle"} 
            size={24} 
            color={results.success ? "#4CAF50" : "#F44336"} 
          />
          <Text style={styles.resultsTitle}>
            {results.success ? 'Success' : 'Error'}
          </Text>
        </View>
        
        <Text style={styles.resultsMessage}>{results.message}</Text>
        
        {results.type === 'full' && (
          <View style={styles.detailedResults}>
            <Text style={styles.detailTitle}>Detailed Results:</Text>
            <Text style={styles.detailItem}>Users Fixed: {results.usersFixed}</Text>
            <Text style={styles.detailItem}>Offers Fixed: {results.offersFixed}</Text>
            <Text style={styles.detailItem}>States Fixed: {results.statesFixed}</Text>
            <Text style={styles.detailItem}>Total Issues: {results.totalIssues}</Text>
          </View>
        )}

        {results.type === 'cleanup' && (
          <View style={styles.detailedResults}>
            <Text style={styles.detailTitle}>Cleanup Results:</Text>
            <Text style={styles.detailItem}>Items: {results.items}</Text>
            <Text style={styles.detailItem}>Offers: {results.offers}</Text>
            <Text style={styles.detailItem}>Conversations: {results.conversations}</Text>
            <Text style={styles.detailItem}>Messages: {results.messages}</Text>
            <Text style={styles.detailItem}>Trades: {results.trades}</Text>
            <Text style={styles.detailItem}>Favorites: {results.favorites}</Text>
            <Text style={styles.detailItem}>Swipes: {results.swipes}</Text>
            <Text style={styles.detailItem}>Notifications: {results.notifications}</Text>
            <Text style={styles.detailItem}>User Document: {results.userDocument}</Text>
          </View>
        )}

        {results.type === 'testCleanup' && (
          <View style={styles.detailedResults}>
            <Text style={styles.detailTitle}>Test Data Cleanup:</Text>
            <Text style={styles.detailItem}>Test Items: {results.testItems}</Text>
            <Text style={styles.detailItem}>Test Users: {results.testUsers}</Text>
            <Text style={styles.detailItem}>Test Offers: {results.testOffers}</Text>
          </View>
        )}

        {(results.type === 'seeding' || results.type === 'existingSeeding') && (
          <View style={styles.detailedResults}>
            <Text style={styles.detailTitle}>Test Data Creation:</Text>
            <Text style={styles.detailItem}>Users Created: {results.users}</Text>
            <Text style={styles.detailItem}>Items Created: {results.items}</Text>
            <Text style={styles.detailItem}>Total Documents: {results.total}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!user ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Authentication Error</Text>
          <Text style={styles.errorText}>
            User information is not available. Please try logging out and back in.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Data Consistency Fix</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content}>
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={24} color="#FF9800" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Debug Tool</Text>
            <Text style={styles.warningText}>
              This tool fixes data consistency issues like missing user documents, 
              orphaned offers, and inconsistent states.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Fixes</Text>
          
          <TouchableOpacity
            style={[styles.fixButton, styles.primaryButton]}
            onPress={handleQuickFix}
            disabled={loading}
          >
            <Ionicons name="flash" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Quick Fix My Account</Text>
            <Text style={styles.buttonSubtext}>Fix issues with your account data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Data Creation</Text>
          
          <TouchableOpacity
            style={[styles.fixButton, styles.successButton]}
            onPress={handleSeedExistingUsers}
            disabled={loading}
          >
            <Ionicons name="people" size={20} color="#4CAF50" />
            <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Enhance Existing Users</Text>
            <Text style={styles.buttonSubtext}>Add data to test1, test2, test3</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fixButton, styles.successButton]}
            onPress={handleSeedTestUsers}
            disabled={loading}
          >
            <Ionicons name="person-add" size={20} color="#4CAF50" />
            <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Create All Test Users</Text>
            <Text style={styles.buttonSubtext}>Create test1-test7 with full data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.fixButton, styles.infoButton]}
            onPress={handleGetDataStats}
            disabled={loading}
          >
            <Ionicons name="analytics" size={20} color="#2196F3" />
            <Text style={[styles.buttonText, { color: '#2196F3' }]}>View My Data Stats</Text>
            <Text style={styles.buttonSubtext}>See how much data you have</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fixButton, styles.warningButton]}
            onPress={handleCleanTestData}
            disabled={loading}
          >
            <Ionicons name="flask" size={20} color="#FF9800" />
            <Text style={[styles.buttonText, { color: '#FF9800' }]}>Clean Test Data</Text>
            <Text style={styles.buttonSubtext}>Remove test items and users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fixButton, styles.dangerButton]}
            onPress={handleCleanAllMyData}
            disabled={loading}
          >
            <Ionicons name="trash" size={20} color="#F44336" />
            <Text style={[styles.buttonText, { color: '#F44336' }]}>Clean ALL My Data</Text>
            <Text style={styles.buttonSubtext}>⚠️ Permanently delete everything</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Fixes</Text>
          
          <TouchableOpacity
            style={[styles.fixButton, styles.secondaryButton]}
            onPress={handleFixOrphanedOffers}
            disabled={loading}
          >
            <Ionicons name="people" size={20} color="#FF6B6B" />
            <Text style={[styles.buttonText, { color: '#FF6B6B' }]}>Fix Orphaned Offers</Text>
            <Text style={styles.buttonSubtext}>Fix offers with missing users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fixButton, styles.secondaryButton]}
            onPress={handleFixOfferStates}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color="#FF6B6B" />
            <Text style={[styles.buttonText, { color: '#FF6B6B' }]}>Fix Offer States</Text>
            <Text style={styles.buttonSubtext}>Fix inconsistent offer statuses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fixButton, styles.warningButton]}
            onPress={handleFullConsistencyCheck}
            disabled={loading}
          >
            <Ionicons name="construct" size={20} color="#FF9800" />
            <Text style={[styles.buttonText, { color: '#FF9800' }]}>Full Consistency Check</Text>
            <Text style={styles.buttonSubtext}>Check and fix all data issues</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Fixing data consistency issues...</Text>
          </View>
        )}

        {renderResults()}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Common Issues Fixed:</Text>
          <Text style={styles.infoItem}>• Missing user documents ("User not found" errors)</Text>
          <Text style={styles.infoItem}>• Orphaned offers without valid users</Text>
          <Text style={styles.infoItem}>• Inconsistent offer states (pending vs rejected)</Text>
          <Text style={styles.infoItem}>• Missing timestamps and metadata</Text>
          <Text style={styles.infoItem}>• Broken conversation participants</Text>
        </View>
      </ScrollView>
      </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    flex: 1,
    padding: 16
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'flex-start'
  },
  warningContent: {
    flex: 1,
    marginLeft: 12
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    lineHeight: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  fixButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#FF6B6B'
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF6B6B'
  },
  warningButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF9800'
  },
  infoButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  dangerButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F44336'
  },
  successButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 4,
    marginBottom: 2
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#CCC',
    textAlign: 'center'
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  resultsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
  },
  resultsMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  detailedResults: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  detailItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  errorButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  errorButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
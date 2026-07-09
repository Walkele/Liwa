import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cleanupDatabase, cleanupSpecificCollections } from '../utils/DatabaseCleanup';
import TestItemCleanupButton from '../components/TestItemCleanupButton';

export default function DatabaseCleanupScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState(null);

  const handleFullCleanup = async () => {
    Alert.alert(
      'Full Database Cleanup',
      'This will delete ALL data except users and items. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Database',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cleanupDatabase();
              if (result.success) {
                setLastCleanup(`Deleted ${result.deletedCount} documents`);
                Alert.alert('Success', `Database cleaned! Deleted ${result.deletedCount} documents.`);
              } else {
                Alert.alert('Error', result.error);
              }
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

  const handleTradeCleanup = async () => {
    Alert.alert(
      'Trade Data Cleanup',
      'This will delete trade proposals, accepted offers, and trade activities. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Trade Data',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cleanupSpecificCollections([
                'acceptedOffers',
                'tradeProposals',
                'tradeActivities'
              ]);
              if (result.success) {
                setLastCleanup(`Deleted ${result.deletedCount} trade documents`);
                Alert.alert('Success', `Trade data cleaned! Deleted ${result.deletedCount} documents.`);
              } else {
                Alert.alert('Error', result.error);
              }
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

  const handleMessageCleanup = async () => {
    Alert.alert(
      'Message Data Cleanup',
      'This will delete all conversations and messages. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Messages',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cleanupSpecificCollections([
                'conversations',
                'messages'
              ]);
              if (result.success) {
                setLastCleanup(`Deleted ${result.deletedCount} message documents`);
                Alert.alert('Success', `Messages cleaned! Deleted ${result.deletedCount} documents.`);
              } else {
                Alert.alert('Error', result.error);
              }
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

  const handleOfferCleanup = async () => {
    Alert.alert(
      'Offer Data Cleanup',
      'This will delete all cash offers and related data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Offers',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await cleanupSpecificCollections([
                'offers',
                'ratings'
              ]);
              if (result.success) {
                setLastCleanup(`Deleted ${result.deletedCount} offer documents`);
                Alert.alert('Success', `Offers cleaned! Deleted ${result.deletedCount} documents.`);
              } else {
                Alert.alert('Error', result.error);
              }
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
        <Text style={styles.headerTitle}>Database Cleanup</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={32} color="#FF6B6B" />
          <Text style={styles.warningTitle}>⚠️ Development Tool Only</Text>
          <Text style={styles.warningText}>
            This screen is for testing purposes only. Use carefully as deleted data cannot be recovered.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selective Cleanup</Text>
          
          {/* Test Item Cleanup */}
          <TestItemCleanupButton 
            onCleanupComplete={(stats) => {
              setLastCleanup(`Archived ${stats.archivedCount} test items`);
            }}
          />
          
          <TouchableOpacity
            style={[styles.cleanupButton, styles.tradeButton]}
            onPress={handleTradeCleanup}
            disabled={loading}
          >
            <Ionicons name="swap-horizontal" size={24} color="white" />
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Clean Trade Data</Text>
              <Text style={styles.buttonSubtitle}>
                Removes: trade proposals, accepted offers, activities
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cleanupButton, styles.messageButton]}
            onPress={handleMessageCleanup}
            disabled={loading}
          >
            <Ionicons name="chatbubbles" size={24} color="white" />
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Clean Messages</Text>
              <Text style={styles.buttonSubtitle}>
                Removes: conversations, messages
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cleanupButton, styles.offerButton]}
            onPress={handleOfferCleanup}
            disabled={loading}
          >
            <Ionicons name="cash" size={24} color="white" />
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Clean Offers</Text>
              <Text style={styles.buttonSubtitle}>
                Removes: cash offers, ratings
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Cleanup</Text>
          
          <TouchableOpacity
            style={[styles.cleanupButton, styles.dangerButton]}
            onPress={handleFullCleanup}
            disabled={loading}
          >
            <Ionicons name="trash" size={24} color="white" />
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Clean All Data</Text>
              <Text style={styles.buttonSubtitle}>
                Removes: everything except users and items
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {lastCleanup && (
          <View style={styles.statusCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statusText}>Last cleanup: {lastCleanup}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What gets preserved:</Text>
          <Text style={styles.infoItem}>✅ User accounts</Text>
          <Text style={styles.infoItem}>✅ Posted items</Text>
          <Text style={styles.infoItem}>✅ User profiles</Text>
          
          <Text style={styles.infoTitle}>What gets cleaned:</Text>
          <Text style={styles.infoItem}>🗑️ Trade proposals</Text>
          <Text style={styles.infoItem}>🗑️ Accepted offers</Text>
          <Text style={styles.infoItem}>🗑️ Messages & conversations</Text>
          <Text style={styles.infoItem}>🗑️ Cash offers</Text>
          <Text style={styles.infoItem}>🗑️ Ratings & reviews</Text>
          <Text style={styles.infoItem}>🗑️ Swipes & matches</Text>
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
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    alignItems: 'center',
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  tradeButton: {
    backgroundColor: '#2196F3',
  },
  messageButton: {
    backgroundColor: '#9C27B0',
  },
  offerButton: {
    backgroundColor: '#FF9800',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonContent: {
    marginLeft: 12,
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  buttonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { seedDatabase } from '../utils/seedDatabase';

export default function DevToolsScreen({ navigation }) {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const handleSeedDatabase = async () => {
    Alert.alert(
      'Seed Database',
      'This will add test data to your database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            setSeeding(true);
            setSeedResult(null);
            try {
              const result = await seedDatabase();
              setSeedResult(result);
              Alert.alert(
                'Success',
                `Database seeded successfully!\n\nUsers: ${result.users}\nItems: ${result.items}\nServices: ${result.services}\nMatches: ${result.matches}\nConversations: ${result.conversations}`
              );
            } catch (error) {
              Alert.alert('Error', `Failed to seed database: ${error.message}`);
            } finally {
              setSeeding(false);
            }
          }
        }
      ]
    );
  };

  const devActions = [
    {
      title: 'Seed Database',
      description: 'Populate database with test data (users, items, matches, conversations)',
      icon: 'cloud-upload-outline',
      color: '#4CAF50',
      action: handleSeedDatabase,
      loading: seeding
    },
    {
      title: 'Clear Test Data',
      description: 'Remove all test data from database',
      icon: 'trash-outline',
      color: '#F44336',
      action: () => Alert.alert('Not Implemented', 'This feature is not yet implemented')
    },
    {
      title: 'Reset Matches',
      description: 'Clear all matches and conversations',
      icon: 'refresh-outline',
      color: '#FF9800',
      action: () => Alert.alert('Not Implemented', 'This feature is not yet implemented')
    },
    {
      title: 'Test Notifications',
      description: 'Send a test notification',
      icon: 'notifications-outline',
      color: '#2196F3',
      action: () => Alert.alert('Not Implemented', 'This feature is not yet implemented')
    },
    {
      title: 'Debug Auth',
      description: 'View authentication state and user data',
      icon: 'person-outline',
      color: '#9C27B0',
      action: () => navigation.navigate('Profile')
    },
    {
      title: 'View Logs',
      description: 'View application logs',
      icon: 'document-text-outline',
      color: '#607D8B',
      action: () => Alert.alert('Not Implemented', 'This feature is not yet implemented')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Tools</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={32} color="#FF9800" />
          <Text style={styles.warningTitle}>Development Tools</Text>
          <Text style={styles.warningText}>
            These tools are for development and testing purposes only. Do not use in production.
          </Text>
        </View>

        {seedResult && (
          <View style={styles.resultCard}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.resultTitle}>Database Seeded Successfully</Text>
            <View style={styles.resultStats}>
              <Text style={styles.resultStat}>Users: {seedResult.users}</Text>
              <Text style={styles.resultStat}>Items: {seedResult.items}</Text>
              <Text style={styles.resultStat}>Services: {seedResult.services}</Text>
              <Text style={styles.resultStat}>Matches: {seedResult.matches}</Text>
              <Text style={styles.resultStat}>Conversations: {seedResult.conversations}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Database Tools</Text>
        
        {devActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.action}
            disabled={action.loading}
          >
            <View style={styles.actionHeader}>
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                {action.loading ? (
                  <ActivityIndicator size={24} color={action.color} />
                ) : (
                  <Ionicons name={action.icon} size={24} color={action.color} />
                )}
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Test Accounts</Text>
        
        <View style={styles.accountsCard}>
          <Text style={styles.accountEmail}>alice@test.com</Text>
          <Text style={styles.accountPassword}>Password: test123</Text>
        </View>
        <View style={styles.accountsCard}>
          <Text style={styles.accountEmail}>bob@test.com</Text>
          <Text style={styles.accountPassword}>Password: test123</Text>
        </View>
        <View style={styles.accountsCard}>
          <Text style={styles.accountEmail}>carol@test.com</Text>
          <Text style={styles.accountPassword}>Password: test123</Text>
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
    padding: 20,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
    marginBottom: 12,
  },
  resultStats: {
    width: '100%',
  },
  resultStat: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  accountsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  accountPassword: {
    fontSize: 14,
    color: '#666',
  },
});

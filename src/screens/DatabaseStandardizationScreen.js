import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseMigrationService } from '../services/DatabaseMigrationService';
import { useAuth } from '../context/AuthContext';

export default function DatabaseStandardizationScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);
  const [validationResults, setValidationResults] = useState(null);

  const runCompleteMigration = async () => {
    try {
      setLoading(true);
      
      Alert.alert(
        'Database Migration',
        'This will standardize all database records to ensure consistency. This process may take a few minutes. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              try {
                const results = await DatabaseMigrationService.runCompleteMigration();
                setMigrationResults(results.results);
                
                Alert.alert(
                  'Migration Complete!',
                  `Successfully migrated:\n• ${results.results.messagesMigrated} messages\n• ${results.results.conversationsStandardized} conversations\n• ${results.results.tradesUnified} trades\n• ${results.results.duplicatesCleaned} duplicates cleaned`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Migration error:', error);
                Alert.alert('Migration Error', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error starting migration:', error);
      Alert.alert('Error', 'Failed to start migration process');
    } finally {
      setLoading(false);
    }
  };

  const validateMigration = async () => {
    try {
      setLoading(true);
      const validation = await DatabaseMigrationService.validateMigration();
      setValidationResults(validation);
      
      Alert.alert(
        'Validation Complete',
        `Database validation results:\n• Messages with status: ${validation.messagesWithStatus}\n• Standardized conversations: ${validation.standardizedConversations}\n• Unified trades: ${validation.unifiedTrades}\n• Total records: ${validation.totalRecords}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Validation Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runIndividualMigration = async (migrationType) => {
    try {
      setLoading(true);
      let result;
      
      switch (migrationType) {
        case 'messages':
          result = await DatabaseMigrationService.migrateMessageStatusFields();
          Alert.alert('Success', `Migrated ${result.migratedCount} messages`);
          break;
        case 'conversations':
          result = await DatabaseMigrationService.standardizeConversationIds();
          Alert.alert('Success', `Standardized ${result.standardizedCount} conversations`);
          break;
        case 'trades':
          result = await DatabaseMigrationService.migrateToUnifiedTradeStructure();
          Alert.alert('Success', `Unified ${result.migratedCount} trades`);
          break;
        case 'cleanup':
          result = await DatabaseMigrationService.cleanupDuplicateRecords();
          Alert.alert('Success', `Cleaned ${result.cleanedCount} duplicates`);
          break;
      }
    } catch (error) {
      console.error(`${migrationType} migration error:`, error);
      Alert.alert('Migration Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Standardization</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Phase 3: Database Schema Standardization</Text>
          <Text style={styles.sectionDescription}>
            Standardize all database records to ensure consistency across the SwipeIt trading app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Complete Migration</Text>
          <Text style={styles.sectionDescription}>
            Run the complete database migration process to standardize all records.
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={runCompleteMigration}
            disabled={loading}
          >
            <Ionicons name="rocket" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Run Complete Migration</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Validation</Text>
          <Text style={styles.sectionDescription}>
            Validate migration results and check database consistency.
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={validateMigration}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
            <Text style={styles.secondaryButtonText}>Validate Migration</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Individual Migrations</Text>
          <Text style={styles.sectionDescription}>
            Run specific migration steps individually for testing or troubleshooting.
          </Text>
          
          <View style={styles.individualMigrations}>
            <TouchableOpacity
              style={[styles.actionButton, styles.tertiaryButton]}
              onPress={() => runIndividualMigration('messages')}
              disabled={loading}
            >
              <Ionicons name="chatbubbles" size={16} color="#666" />
              <Text style={styles.tertiaryButtonText}>Migrate Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.tertiaryButton]}
              onPress={() => runIndividualMigration('conversations')}
              disabled={loading}
            >
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.tertiaryButtonText}>Standardize Conversations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.tertiaryButton]}
              onPress={() => runIndividualMigration('trades')}
              disabled={loading}
            >
              <Ionicons name="swap-horizontal" size={16} color="#666" />
              <Text style={styles.tertiaryButtonText}>Unify Trades</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.tertiaryButton]}
              onPress={() => runIndividualMigration('cleanup')}
              disabled={loading}
            >
              <Ionicons name="trash" size={16} color="#666" />
              <Text style={styles.tertiaryButtonText}>Clean Duplicates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {migrationResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Migration Results</Text>
            <View style={styles.resultsContainer}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Messages Migrated:</Text>
                <Text style={styles.resultValue}>{migrationResults.messagesMigrated}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Conversations Standardized:</Text>
                <Text style={styles.resultValue}>{migrationResults.conversationsStandardized}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Trades Unified:</Text>
                <Text style={styles.resultValue}>{migrationResults.tradesUnified}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Duplicates Cleaned:</Text>
                <Text style={styles.resultValue}>{migrationResults.duplicatesCleaned}</Text>
              </View>
            </View>
          </View>
        )}

        {validationResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Validation Results</Text>
            <View style={styles.resultsContainer}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Messages with Status:</Text>
                <Text style={styles.resultValue}>{validationResults.messagesWithStatus}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Standardized Conversations:</Text>
                <Text style={styles.resultValue}>{validationResults.standardizedConversations}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Unified Trades:</Text>
                <Text style={styles.resultValue}>{validationResults.unifiedTrades}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Total Records:</Text>
                <Text style={styles.resultValue}>{validationResults.totalRecords}</Text>
              </View>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Processing migration...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tertiaryButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  individualMigrations: {
    marginTop: 10,
  },
  resultsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});
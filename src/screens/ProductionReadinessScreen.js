import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProductionReadinessService } from '../services/ProductionReadinessService';
import { DatabaseMigrationService } from '../services/DatabaseMigrationService';

export default function ProductionReadinessScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [checklist, setChecklist] = useState(null);

  useEffect(() => {
    runProductionReadinessCheck();
  }, []);

  const runProductionReadinessCheck = async () => {
    try {
      setLoading(true);
      const result = await ProductionReadinessService.checkProductionReadiness();
      setAssessment(result);
      
      const deploymentChecklist = ProductionReadinessService.generateDeploymentChecklist(result);
      setChecklist(deploymentChecklist);
      
    } catch (error) {
      console.error('Error checking production readiness:', error);
      Alert.alert('Error', 'Failed to assess production readiness');
    } finally {
      setLoading(false);
    }
  };

  const runDatabaseMigration = async () => {
    try {
      Alert.alert(
        'Database Migration',
        'This will standardize all database records. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              setLoading(true);
              try {
                await DatabaseMigrationService.runCompleteMigration();
                Alert.alert('Success', 'Database migration completed successfully!');
                // Re-run assessment
                await runProductionReadinessCheck();
              } catch (error) {
                Alert.alert('Error', error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error starting migration:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'EXCELLENT': return '#4CAF50';
      case 'GOOD': return '#2196F3';
      case 'NEEDS_IMPROVEMENT': return '#FF9500';
      case 'ERROR': return '#F44336';
      default: return '#666';
    }
  };

  const getReadinessColor = (level) => {
    switch (level) {
      case 'PRODUCTION_READY': return '#4CAF50';
      case 'NEAR_PRODUCTION_READY': return '#8BC34A';
      case 'DEVELOPMENT_COMPLETE': return '#2196F3';
      case 'BETA_READY': return '#FF9500';
      default: return '#F44336';
    }
  };

  const renderCheckCategory = (title, check) => (
    <View key={title} style={styles.checkCategory}>
      <View style={styles.checkHeader}>
        <Text style={styles.checkTitle}>{title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(check.status) }]}>
          <Text style={styles.statusText}>{check.status}</Text>
        </View>
      </View>
      <Text style={styles.checkScore}>Score: {Math.round(check.score)}%</Text>
      <Text style={styles.checkDetails}>{check.details}</Text>
      {check.error && (
        <Text style={styles.errorText}>Error: {check.error}</Text>
      )}
    </View>
  );

  const renderChecklistSection = (title, items) => (
    <View key={title} style={styles.checklistSection}>
      <Text style={styles.checklistTitle}>{title}</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.checklistItem}>
          <Ionicons 
            name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
            size={20} 
            color={item.completed ? "#4CAF50" : "#666"} 
          />
          <Text style={[styles.checklistText, item.completed && styles.completedTask]}>
            {item.task}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading && !assessment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Assessing production readiness...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Production Readiness</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={runProductionReadinessCheck}
          disabled={loading}
        >
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {assessment && (
          <>
            <View style={styles.overallSection}>
              <Text style={styles.overallTitle}>🎯 Overall Assessment</Text>
              <View style={styles.scoreContainer}>
                <Text style={styles.overallScore}>{assessment.overallScore}%</Text>
                <View style={[styles.readinessBadge, { backgroundColor: getReadinessColor(assessment.readinessLevel) }]}>
                  <Text style={styles.readinessText}>{assessment.readinessLevel.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <Text style={styles.assessmentTime}>
                Last assessed: {new Date(assessment.timestamp).toLocaleString()}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Detailed Assessment</Text>
              {Object.entries(assessment.checks).map(([key, check]) => 
                renderCheckCategory(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), check)
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Recommendations</Text>
              {assessment.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendation}>
                  <Ionicons name="bulb" size={16} color="#FF9500" />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>

            {assessment.overallScore < 95 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔧 Quick Actions</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={runDatabaseMigration}
                  disabled={loading}
                >
                  <Ionicons name="server" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Run Database Migration</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={() => navigation.navigate('DatabaseStandardization')}
                >
                  <Ionicons name="settings" size={20} color="#2196F3" />
                  <Text style={styles.secondaryActionText}>Database Standardization</Text>
                </TouchableOpacity>
              </View>
            )}

            {checklist && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✅ Deployment Checklist</Text>
                {Object.entries(checklist).map(([section, items]) => 
                  renderChecklistSection(section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), items)
                )}
              </View>
            )}

            {assessment.readinessLevel === 'PRODUCTION_READY' && (
              <View style={styles.successSection}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.successTitle}>🎉 Production Ready!</Text>
                <Text style={styles.successText}>
                  Your SwipeIt trading app is ready for production deployment!
                </Text>
              </View>
            )}
          </>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Processing...</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  overallSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  readinessBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readinessText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  assessmentTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
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
    marginBottom: 15,
  },
  checkCategory: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  checkScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  checkDetails: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 5,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryAction: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryActionText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  checklistSection: {
    marginBottom: 20,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  successSection: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginVertical: 10,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 10,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});
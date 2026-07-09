import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DisputeResolutionService } from '../services/DisputeResolutionService';
import * as ImagePicker from 'expo-image-picker';

export default function DisputeResolutionScreen({ navigation, route }) {
  const { user } = useAuth();
  const { tradeId } = route.params || {};
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDisputeForm, setShowNewDisputeForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadDisputes();
    }
  }, [user]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const userDisputes = await DisputeResolutionService.getUserDisputes(user.uid);
      setDisputes(userDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
      Alert.alert('Error', 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDispute = async () => {
    if (!selectedCategory || !description.trim()) {
      Alert.alert('Missing Information', 'Please select a category and provide a description');
      return;
    }

    if (!tradeId) {
      Alert.alert('Missing Trade', 'No trade ID provided');
      return;
    }

    setSubmitting(true);
    try {
      // In a real implementation, you'd get the other user's ID from the trade
      const reportedUserId = 'other_user_id'; // This should come from trade data

      await DisputeResolutionService.createDispute({
        tradeId,
        reporterId: user.uid,
        reportedUserId,
        category: selectedCategory,
        description: description.trim(),
        evidence
      });

      Alert.alert('Success', 'Dispute filed successfully', [
        { text: 'OK', onPress: () => {
          setShowNewDisputeForm(false);
          setSelectedCategory(null);
          setDescription('');
          setEvidence([]);
          loadDisputes();
        }}
      ]);
    } catch (error) {
      console.error('Error filing dispute:', error);
      Alert.alert('Error', error.message || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvidence = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const newEvidence = {
          type: 'photo',
          submittedBy: user.uid,
          data: result.assets[0].uri,
          description: 'User uploaded photo'
        };
        setEvidence([...evidence, newEvidence]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to add evidence');
    }
  };

  const renderDisputeCard = (dispute) => (
    <TouchableOpacity
      key={dispute.id}
      style={styles.disputeCard}
      onPress={() => navigation.navigate('DisputeDetails', { disputeId: dispute.id })}
    >
      <View style={styles.disputeHeader}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(dispute.status) }
        ]}>
          <Text style={styles.statusText}>{formatStatus(dispute.status)}</Text>
        </View>
        <Text style={styles.disputeDate}>
          {dispute.createdAt?.toDate?.().toLocaleDateString() || 'Unknown'}
        </Text>
      </View>

      <Text style={styles.disputeCategory}>{dispute.categoryName}</Text>
      <Text style={styles.disputeDescription} numberOfLines={2}>
        {dispute.description}
      </Text>

      <View style={styles.disputeFooter}>
        <View style={styles.disputeMeta}>
          <Ionicons name="document-text-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{dispute.evidence?.length || 0} evidence items</Text>
        </View>
        {dispute.resolutionType && (
          <View style={styles.resolutionBadge}>
            <Text style={styles.resolutionText}>Resolved: {formatResolution(dispute.resolutionType)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderNewDisputeForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>File New Dispute</Text>

      <Text style={styles.formLabel}>Dispute Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {Object.entries(DisputeResolutionService.DISPUTE_CATEGORIES).map(([key, category]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryButton,
              selectedCategory === key && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(key)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === key && styles.categoryButtonTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedCategory && (
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryDescription}>
            {DisputeResolutionService.DISPUTE_CATEGORIES[selectedCategory].description}
          </Text>
          <View style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(DisputeResolutionService.DISPUTE_CATEGORIES[selectedCategory].severity) }
          ]}>
            <Text style={styles.severityText}>
              {DisputeResolutionService.DISPUTE_CATEGORIES[selectedCategory].severity.toUpperCase()} SEVERITY
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.formLabel}>Description</Text>
      <TextInput
        style={styles.descriptionInput}
        placeholder="Please describe the issue in detail..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.formLabel}>Evidence (Optional)</Text>
      <View style={styles.evidenceContainer}>
        {evidence.map((ev, index) => (
          <View key={index} style={styles.evidenceItem}>
            <Ionicons name="image" size={20} color="#4CAF50" />
            <Text style={styles.evidenceText}>Photo {index + 1}</Text>
            <TouchableOpacity onPress={() => setEvidence(evidence.filter((_, i) => i !== index))}>
              <Ionicons name="close-circle" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addEvidenceButton} onPress={handleAddEvidence}>
          <Ionicons name="add-circle-outline" size={20} color="#FF6B6B" />
          <Text style={styles.addEvidenceText}>Add Photo Evidence</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.formButton, styles.cancelButton]}
          onPress={() => {
            setShowNewDisputeForm(false);
            setSelectedCategory(null);
            setDescription('');
            setEvidence([]);
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formButton, styles.submitButton]}
          onPress={handleFileDispute}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Dispute</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="shield-checkmark-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Disputes</Text>
      <Text style={styles.emptyText}>
        You haven't filed any disputes yet. If you have an issue with a trade, you can file a dispute here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dispute Resolution</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading disputes...</Text>
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
        <Text style={styles.headerTitle}>Dispute Resolution</Text>
        <TouchableOpacity onPress={() => setShowNewDisputeForm(!showNewDisputeForm)}>
          <Ionicons name={showNewDisputeForm ? "close" : "add"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showNewDisputeForm ? renderNewDisputeForm() : (
          <>
            {disputes.length === 0 ? renderEmptyState() : (
              <View style={styles.disputesList}>
                <Text style={styles.sectionTitle}>Your Disputes</Text>
                {disputes.map(renderDisputeCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
const formatStatus = (status) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatResolution = (resolution) => {
  return resolution.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getStatusColor = (status) => {
  const colors = {
    'filed': '#FF9500',
    'under_review': '#2196F3',
    'evidence_requested': '#9C27B0',
    'mediation': '#FF6B6B',
    'resolved': '#4CAF50',
    'closed': '#999',
    'escalated': '#F44336'
  };
  return colors[status] || '#999';
};

const getSeverityColor = (severity) => {
  const colors = {
    'critical': '#F44336',
    'high': '#FF9500',
    'medium': '#2196F3',
    'low': '#4CAF50'
  };
  return colors[severity] || '#999';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  disputesList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  disputeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  disputeDate: {
    fontSize: 12,
    color: '#999',
  },
  disputeCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  disputeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disputeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  resolutionBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resolutionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  categoryInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  descriptionInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  evidenceContainer: {
    marginBottom: 16,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  evidenceText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  addEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  addEvidenceText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
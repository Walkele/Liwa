import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { EnhancedReportingService } from '../services/EnhancedReportingService';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const EnhancedReportModal = ({ 
  visible, 
  onClose, 
  reportedType, // 'user', 'item', 'trade'
  reportedId,
  reportedData = {} // Additional context about what's being reported
}) => {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1); // 1: Category, 2: Details, 3: Evidence, 4: Review
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get categories based on reported type
  const getCategories = () => {
    const categories = EnhancedReportingService.REPORT_CATEGORIES[reportedType.toUpperCase()];
    return Object.keys(categories || {});
  };

  const getCategoryInfo = (category) => {
    const categories = EnhancedReportingService.REPORT_CATEGORIES[reportedType.toUpperCase()];
    return categories?.[category] || {};
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(category);
    setStep(2);
  };

  const handleAddEvidence = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const newEvidence = {
          type: 'image',
          url: result.assets[0].uri,
          description: '',
          timestamp: new Date()
        };
        setEvidence(prev => [...prev, newEvidence]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add evidence');
    }
  };

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of the issue');
      return;
    }

    try {
      setLoading(true);
      
      const result = await EnhancedReportingService.submitReport({
        reporterId: user.uid,
        reportedType,
        reportedId,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        description,
        evidence,
        anonymous,
        location: null // Could be added if needed
      });

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          `Your report has been submitted successfully. Report ID: ${result.reportId}\n\nEstimated review time: ${result.estimatedReviewTime}`,
          [{ text: 'OK', onPress: onClose }]
        );
        resetForm();
      } else {
        Alert.alert('Notice', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCategory('');
    setSelectedSubcategory('');
    setDescription('');
    setEvidence([]);
    setAnonymous(false);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((stepNum) => (
        <View key={stepNum} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step >= stepNum && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepText,
              step >= stepNum && styles.stepTextActive
            ]}>
              {stepNum}
            </Text>
          </View>
          {stepNum < 4 && <View style={styles.stepLine} />}
        </View>
      ))}
    </View>
  );

  const renderCategorySelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of issue are you reporting?</Text>
      <Text style={styles.stepSubtitle}>Select the category that best describes the problem</Text>
      
      <ScrollView style={styles.categoryList}>
        {getCategories().map((category) => {
          const categoryInfo = getCategoryInfo(category);
          return (
            <TouchableOpacity
              key={category}
              style={styles.categoryItem}
              onPress={() => handleCategorySelect(category)}
            >
              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>
                  {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.categorySeverity}>
                  Severity: {categoryInfo.severity || 'medium'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Provide Details</Text>
      <Text style={styles.stepSubtitle}>
        Help us understand the issue by providing specific details
      </Text>
      
      <View style={styles.selectedCategoryBadge}>
        <Text style={styles.selectedCategoryText}>
          {selectedCategory.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </View>

      <TextInput
        style={styles.descriptionInput}
        placeholder="Describe the issue in detail..."
        multiline
        numberOfLines={6}
        value={description}
        onChangeText={setDescription}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={styles.anonymousToggle}
        onPress={() => setAnonymous(!anonymous)}
      >
        <Ionicons 
          name={anonymous ? "checkbox" : "checkbox-outline"} 
          size={24} 
          color="#FF6B6B" 
        />
        <Text style={styles.anonymousText}>Submit anonymously</Text>
      </TouchableOpacity>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setStep(3)}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEvidenceStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Evidence (Optional)</Text>
      <Text style={styles.stepSubtitle}>
        Screenshots or images can help us investigate the issue
      </Text>

      <TouchableOpacity
        style={styles.addEvidenceButton}
        onPress={handleAddEvidence}
      >
        <Ionicons name="camera" size={24} color="#FF6B6B" />
        <Text style={styles.addEvidenceText}>Add Screenshot</Text>
      </TouchableOpacity>

      {evidence.length > 0 && (
        <ScrollView horizontal style={styles.evidenceList}>
          {evidence.map((item, index) => (
            <View key={index} style={styles.evidenceItem}>
              <Image source={{ uri: item.url }} style={styles.evidenceImage} />
              <TouchableOpacity
                style={styles.removeEvidenceButton}
                onPress={() => setEvidence(prev => prev.filter((_, i) => i !== index))}
              >
                <Ionicons name="close-circle" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setStep(4)}
        >
          <Text style={styles.nextButtonText}>Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Report</Text>
      <Text style={styles.stepSubtitle}>
        Please review your report before submitting
      </Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Category:</Text>
        <Text style={styles.reviewValue}>
          {selectedCategory.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Description:</Text>
        <Text style={styles.reviewValue}>{description}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Evidence:</Text>
        <Text style={styles.reviewValue}>
          {evidence.length} item{evidence.length !== 1 ? 's' : ''} attached
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Anonymous:</Text>
        <Text style={styles.reviewValue}>{anonymous ? 'Yes' : 'No'}</Text>
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(3)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Issue</Text>
          <View style={styles.placeholder} />
        </View>

        {renderStepIndicator()}

        <ScrollView style={styles.content}>
          {step === 1 && renderCategorySelection()}
          {step === 2 && renderDetailsStep()}
          {step === 3 && renderEvidenceStep()}
          {step === 4 && renderReviewStep()}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#FF6B6B',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#eee',
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  categoryList: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categorySeverity: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  selectedCategoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  anonymousText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  addEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addEvidenceText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 8,
  },
  evidenceList: {
    marginBottom: 24,
  },
  evidenceItem: {
    position: 'relative',
    marginRight: 12,
  },
  evidenceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeEvidenceButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  reviewSection: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#333',
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default EnhancedReportModal;
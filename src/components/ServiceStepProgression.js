// Service Step Progression Component
// Displays and manages the step-by-step service transaction workflow

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceConfirmationService } from '../services/ServiceConfirmationService';
import LoadingButton from './LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function ServiceStepProgression({
  conversationId,
  currentUserId,
  onStepAction,
  loading: parentLoading = false,
  serviceData = null
}) {
  const [stepStatuses, setStepStatuses] = useState({});
  const [currentStep, setCurrentStep] = useState(null);
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  // Service steps configuration
  const serviceSteps = [
    {
      id: ServiceConfirmationService.SERVICE_STEPS.SERVICE_ACCEPTED,
      title: 'Step 1: Confirm Service Details',
      description: 'Both parties confirm the service agreement',
      icon: 'checkmark-circle',
      color: '#4CAF50'
    },
    {
      id: ServiceConfirmationService.SERVICE_STEPS.CONTACT_EXCHANGE,
      title: 'Step 2: Exchange Contact Info',
      description: 'Share contact details to coordinate the service',
      icon: 'call',
      color: '#2196F3'
    },
    {
      id: ServiceConfirmationService.SERVICE_STEPS.SERVICE_SCHEDULED,
      title: 'Step 3: Schedule Service',
      description: 'Set date, time, and location for the service',
      icon: 'calendar',
      color: '#FF9800'
    },
    {
      id: ServiceConfirmationService.SERVICE_STEPS.SERVICE_STARTED,
      title: 'Step 4: Start Service',
      description: 'Confirm that the service has begun',
      icon: 'play-circle',
      color: '#9C27B0'
    },
    {
      id: ServiceConfirmationService.SERVICE_STEPS.SERVICE_COMPLETED,
      title: 'Step 5: Complete Service',
      description: 'Confirm that the service has been finished',
      icon: 'checkmark-done-circle',
      color: '#4CAF50'
    },
    {
      id: ServiceConfirmationService.SERVICE_STEPS.PAYMENT_COMPLETED,
      title: 'Step 6: Confirm Payment',
      description: 'Confirm payment and finalize the transaction',
      icon: 'card',
      color: '#FF6B6B'
    }
  ];

  useEffect(() => {
    if (conversationId && currentUserId) {
      loadStepStatuses();
      
      // Set up polling for real-time updates
      const interval = setInterval(loadStepStatuses, 5000);
      return () => clearInterval(interval);
    }
  }, [conversationId, currentUserId]);

  const loadStepStatuses = async () => {
    try {
      const statuses = {};
      let activeStep = null;
      
      for (const step of serviceSteps) {
        const status = await ServiceConfirmationService.getStepConfirmationStatus(
          conversationId,
          step.id,
          currentUserId
        );
        
        statuses[step.id] = status;
        
        // Determine the current active step
        if (!status.bothConfirmed && !activeStep) {
          activeStep = step.id;
        }
      }
      
      setStepStatuses(statuses);
      setCurrentStep(activeStep);
      
    } catch (error) {
      console.error('Error loading service step statuses:', error);
    }
  };

  const handleStepAction = async (stepId, actionType = 'confirm') => {
    try {
      await withLoading(async () => {
        let confirmationData = {};
        
        // Handle different step types with specific data collection
        if (stepId === ServiceConfirmationService.SERVICE_STEPS.CONTACT_EXCHANGE) {
          confirmationData = await collectContactInformation();
        } else if (stepId === ServiceConfirmationService.SERVICE_STEPS.SERVICE_SCHEDULED) {
          confirmationData = await collectSchedulingInformation();
        } else if (stepId === ServiceConfirmationService.SERVICE_STEPS.PAYMENT_COMPLETED) {
          confirmationData = await collectPaymentInformation();
        }
        
        const result = await ServiceConfirmationService.confirmServiceStep(
          conversationId,
          stepId,
          currentUserId,
          confirmationData
        );
        
        if (result.success) {
          showNotification({
            type: 'success',
            title: 'Step Confirmed!',
            message: result.message,
            autoHide: true,
            duration: 3000
          });
          
          // Reload step statuses
          await loadStepStatuses();
          
          // Call parent callback if provided
          if (onStepAction) {
            onStepAction(stepId, actionType, result);
          }
        }
      });
    } catch (error) {
      console.error('Error handling step action:', error);
      showNotification({
        type: 'error',
        title: 'Action Failed',
        message: error.message || 'Failed to confirm step',
        autoHide: true,
        duration: 4000
      });
    }
  };

  const collectContactInformation = () => {
    return new Promise((resolve) => {
      Alert.prompt(
        'Share Contact Information',
        'Enter your phone number or preferred contact method:',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({}) },
          {
            text: 'Share',
            onPress: (phoneNumber) => {
              resolve({
                phoneNumber: phoneNumber || '',
                preferredContact: 'phone',
                availability: 'Weekdays 9AM-5PM',
                additionalNotes: ''
              });
            }
          }
        ],
        'plain-text',
        '',
        'phone-pad'
      );
    });
  };

  const collectSchedulingInformation = () => {
    return new Promise((resolve) => {
      Alert.prompt(
        'Schedule Service',
        'Enter preferred date and time (e.g., "Tomorrow 2PM"):',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({}) },
          {
            text: 'Schedule',
            onPress: (dateTime) => {
              resolve({
                scheduledDate: dateTime || 'To be arranged',
                scheduledTime: '',
                location: serviceData?.serviceLocation || 'To be confirmed',
                duration: serviceData?.estimatedTime || '1-2 hours',
                specialInstructions: ''
              });
            }
          }
        ],
        'plain-text'
      );
    });
  };

  const collectPaymentInformation = () => {
    return new Promise((resolve) => {
      Alert.alert(
        'Confirm Payment',
        `Confirm that payment of ${serviceData?.servicePrice || '$0'} has been completed?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({}) },
          {
            text: 'Confirm Payment',
            onPress: () => {
              resolve({
                paymentAmount: serviceData?.servicePrice || 0,
                paymentMethod: 'cash',
                paymentConfirmed: true,
                paymentDate: new Date().toISOString()
              });
            }
          }
        ]
      );
    });
  };

  const getStepStatus = (stepId) => {
    const status = stepStatuses[stepId];
    if (!status) return 'locked';
    
    if (status.bothConfirmed) return 'completed';
    if (status.expired) return 'expired';
    if (status.userNeedsAction) return 'action_needed';
    if (status.clientConfirmed || status.providerConfirmed) return 'waiting';
    
    return 'available';
  };

  const getStepStatusText = (stepId) => {
    const stepStatus = getStepStatus(stepId);
    const status = stepStatuses[stepId];
    
    switch (stepStatus) {
      case 'completed':
        return 'Completed ✅';
      case 'expired':
        return 'Expired ⚠️';
      case 'action_needed':
        return 'Action Required 🔔';
      case 'waiting':
        return status?.timeRemaining ? `Waiting (${status.timeRemaining})` : 'Waiting for other party ⏳';
      case 'available':
        return 'Ready to proceed 🚀';
      case 'locked':
      default:
        return 'Locked 🔒';
    }
  };

  const getStepStatusColor = (stepId) => {
    const stepStatus = getStepStatus(stepId);
    
    switch (stepStatus) {
      case 'completed':
        return '#4CAF50';
      case 'expired':
        return '#F44336';
      case 'action_needed':
        return '#FF6B6B';
      case 'waiting':
        return '#FF9800';
      case 'available':
        return '#2196F3';
      case 'locked':
      default:
        return '#9E9E9E';
    }
  };

  const canInteractWithStep = (stepId) => {
    const stepStatus = getStepStatus(stepId);
    return stepStatus === 'action_needed' || stepStatus === 'available';
  };

  const renderStep = (step, index) => {
    const stepStatus = getStepStatus(step.id);
    const statusColor = getStepStatusColor(step.id);
    const canInteract = canInteractWithStep(step.id);
    const isCurrentStep = currentStep === step.id;
    
    return (
      <View key={step.id} style={styles.stepContainer}>
        {/* Step Header */}
        <View style={[styles.stepHeader, { borderLeftColor: statusColor }]}>
          <View style={styles.stepIconContainer}>
            <Ionicons
              name={step.icon}
              size={24}
              color={statusColor}
            />
          </View>
          
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, isCurrentStep && styles.currentStepTitle]}>
              {step.title}
            </Text>
            <Text style={styles.stepDescription}>
              {step.description}
            </Text>
            <Text style={[styles.stepStatus, { color: statusColor }]}>
              {getStepStatusText(step.id)}
            </Text>
          </View>
        </View>
        
        {/* Step Action Button */}
        {canInteract && (
          <View style={styles.stepActionContainer}>
            <LoadingButton
              title={stepStatus === 'action_needed' ? 'Confirm Step' : 'Proceed'}
              onPress={() => handleStepAction(step.id)}
              loading={loading || parentLoading}
              variant="primary"
              icon="checkmark"
              style={[styles.stepActionButton, { backgroundColor: statusColor }]}
              textStyle={styles.stepActionButtonText}
            />
          </View>
        )}
        
        {/* Step Connector Line */}
        {index < serviceSteps.length - 1 && (
          <View style={[styles.stepConnector, { backgroundColor: statusColor }]} />
        )}
      </View>
    );
  };

  if (!conversationId || !currentUserId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Progress</Text>
        <Text style={styles.headerSubtitle}>
          Follow these steps to complete your service transaction
        </Text>
      </View>
      
      <View style={styles.stepsContainer}>
        {serviceSteps.map((step, index) => renderStep(step, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stepsContainer: {
    position: 'relative',
  },
  stepContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 12,
    borderLeftWidth: 3,
    paddingVertical: 8,
  },
  stepIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentStepTitle: {
    color: '#FF6B6B',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepActionContainer: {
    marginTop: 8,
    marginLeft: 48,
  },
  stepActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  stepActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  stepConnector: {
    position: 'absolute',
    left: 24,
    top: 60,
    width: 2,
    height: 20,
    opacity: 0.3,
  },
});

export { ServiceStepProgression };
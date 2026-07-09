// Service Progress Tracker Component
// Tracks real-time service execution progress with provider updates

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ElegantButton from './ElegantButton';
import { ServiceConfirmationService } from '../services/ServiceConfirmationService';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function ServiceProgressTracker({
  conversationId,
  currentUserId,
  serviceData,
  isProvider,
  onProgressUpdate
}) {
  const [serviceStarted, setServiceStarted] = useState(false);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [progressSteps, setProgressSteps] = useState([
    { id: 1, title: 'Assessment', icon: 'search', completed: false },
    { id: 2, title: 'Work in Progress', icon: 'construct', completed: false },
    { id: 3, title: 'Testing/Quality Check', icon: 'checkmark-done', completed: false },
    { id: 4, title: 'Final Completion', icon: 'trophy', completed: false }
  ]);
  
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  useEffect(() => {
    // Load existing service progress if any
    loadServiceProgress();
  }, [conversationId]);

  const loadServiceProgress = async () => {
    try {
      const status = await ServiceConfirmationService.getStepConfirmationStatus(
        conversationId,
        ServiceConfirmationService.SERVICE_STEPS.SERVICE_STARTED,
        currentUserId
      );
      
      if (status.bothConfirmed) {
        setServiceStarted(true);
        // Load progress steps from service data if available
      }
      
      const completionStatus = await ServiceConfirmationService.getStepConfirmationStatus(
        conversationId,
        ServiceConfirmationService.SERVICE_STEPS.SERVICE_COMPLETED,
        currentUserId
      );
      
      if (completionStatus.bothConfirmed) {
        setServiceCompleted(true);
      }
    } catch (error) {
      console.error('Error loading service progress:', error);
    }
  };

  const handleStartService = async () => {
    Alert.alert(
      'Start Service',
      `Ready to start "${serviceData.serviceTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Service',
          onPress: async () => {
            await withLoading(async () => {
              try {
                const now = new Date();
                setStartTime(now);
                
                await ServiceConfirmationService.confirmServiceStep(
                  conversationId,
                  ServiceConfirmationService.SERVICE_STEPS.SERVICE_STARTED,
                  currentUserId,
                  {
                    startedAt: now.toISOString(),
                    location: serviceData.serviceLocation || 'On-site',
                    estimatedCompletion: calculateEstimatedCompletion(now, serviceData.estimatedTime)
                  }
                );
                
                setServiceStarted(true);
                
                showNotification({
                  type: 'success',
                  title: 'Service Started!',
                  message: `"${serviceData.serviceTitle}" is now in progress`,
                  autoHide: true,
                  duration: 3000
                });
                
                if (onProgressUpdate) {
                  onProgressUpdate('started', { startTime: now });
                }
              } catch (error) {
                console.error('Error starting service:', error);
                showNotification({
                  type: 'error',
                  title: 'Failed to Start',
                  message: error.message || 'Could not start service',
                  autoHide: true,
                  duration: 4000
                });
              }
            });
          }
        }
      ]
    );
  };

  const handleCompleteService = async () => {
    // Check if all steps are completed
    const allStepsCompleted = progressSteps.every(step => step.completed);
    
    if (!allStepsCompleted) {
      Alert.alert(
        'Incomplete Steps',
        'Please complete all progress steps before marking the service as complete.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Complete Service',
      `Mark "${serviceData.serviceTitle}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            await withLoading(async () => {
              try {
                const completionTime = new Date();
                const duration = startTime 
                  ? Math.round((completionTime - startTime) / 60000) // minutes
                  : null;
                
                await ServiceConfirmationService.confirmServiceStep(
                  conversationId,
                  ServiceConfirmationService.SERVICE_STEPS.SERVICE_COMPLETED,
                  currentUserId,
                  {
                    completedAt: completionTime.toISOString(),
                    duration: duration ? `${duration} minutes` : serviceData.estimatedTime,
                    progressSteps: progressSteps,
                    allStepsCompleted: true
                  }
                );
                
                setServiceCompleted(true);
                
                showNotification({
                  type: 'success',
                  title: 'Service Completed!',
                  message: `"${serviceData.serviceTitle}" has been marked as complete`,
                  autoHide: true,
                  duration: 3000
                });
                
                if (onProgressUpdate) {
                  onProgressUpdate('completed', { 
                    completionTime,
                    duration,
                    progressSteps 
                  });
                }
              } catch (error) {
                console.error('Error completing service:', error);
                showNotification({
                  type: 'error',
                  title: 'Failed to Complete',
                  message: error.message || 'Could not complete service',
                  autoHide: true,
                  duration: 4000
                });
              }
            });
          }
        }
      ]
    );
  };

  const toggleProgressStep = (stepId) => {
    if (!isProvider) return; // Only provider can update progress
    
    setProgressSteps(prev => {
      const newSteps = prev.map(step => {
        if (step.id === stepId) {
          const newCompleted = !step.completed;
          
          // Show notification for step completion
          if (newCompleted) {
            showNotification({
              type: 'info',
              title: 'Progress Updated',
              message: `${step.title} completed`,
              autoHide: true,
              duration: 2000
            });
          }
          
          return { ...step, completed: newCompleted };
        }
        return step;
      });
      
      if (onProgressUpdate) {
        onProgressUpdate('step_update', { progressSteps: newSteps });
      }
      
      return newSteps;
    });
  };

  const calculateEstimatedCompletion = (startTime, estimatedDuration) => {
    // Parse estimated duration (e.g., "2 hours", "30 minutes")
    const match = estimatedDuration?.match(/(\d+)\s*(hour|minute)/i);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    const completionTime = new Date(startTime);
    if (unit.includes('hour')) {
      completionTime.setHours(completionTime.getHours() + value);
    } else {
      completionTime.setMinutes(completionTime.getMinutes() + value);
    }
    
    return completionTime.toISOString();
  };

  const getElapsedTime = () => {
    if (!startTime) return '0 min';
    
    const now = new Date();
    const elapsed = Math.round((now - startTime) / 60000); // minutes
    
    if (elapsed < 60) {
      return `${elapsed} min`;
    } else {
      const hours = Math.floor(elapsed / 60);
      const minutes = elapsed % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  const getCompletionPercentage = () => {
    const completed = progressSteps.filter(step => step.completed).length;
    return Math.round((completed / progressSteps.length) * 100);
  };

  // Not started yet - show start button
  if (!serviceStarted && isProvider) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="play-circle" size={32} color="#4CAF50" />
          <Text style={styles.title}>Ready to Start Service?</Text>
        </View>
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceData.serviceTitle}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Estimated: {serviceData.estimatedTime || '1-2 hours'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {serviceData.serviceLocation || 'On-site'}
            </Text>
          </View>
        </View>
        
        <ElegantButton
          title="Start Service"
          icon="play-circle"
          variant="success"
          gradient={true}
          onPress={handleStartService}
          loading={loading}
        />
      </View>
    );
  }

  // Service not started - waiting message for owner
  if (!serviceStarted && !isProvider) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingContainer}>
          <Ionicons name="time-outline" size={48} color="#FF9800" />
          <Text style={styles.waitingTitle}>Waiting for Service to Start</Text>
          <Text style={styles.waitingText}>
            The service provider will start the service soon.
          </Text>
        </View>
      </View>
    );
  }

  // Service completed
  if (serviceCompleted) {
    return (
      <View style={styles.container}>
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.completedTitle}>Service Completed! ✅</Text>
          <Text style={styles.completedText}>
            "{serviceData.serviceTitle}" has been finished
          </Text>
          {startTime && (
            <Text style={styles.completedTime}>
              Duration: {getElapsedTime()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Service in progress
  return (
    <View style={styles.container}>
      {/* Header with progress */}
      <View style={styles.progressHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="construct" size={24} color="#4CAF50" />
          <Text style={styles.title}>Service In Progress</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.percentage}>{getCompletionPercentage()}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${getCompletionPercentage()}%` }
          ]} 
        />
      </View>

      {/* Service Info */}
      <View style={styles.serviceInfoCompact}>
        <Text style={styles.serviceName}>{serviceData.serviceTitle}</Text>
        {startTime && (
          <Text style={styles.elapsedTime}>
            ⏱️ Elapsed: {getElapsedTime()}
          </Text>
        )}
      </View>

      {/* Progress Steps */}
      <ScrollView style={styles.stepsContainer}>
        {progressSteps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={styles.progressStep}
            onPress={() => toggleProgressStep(step.id)}
            disabled={!isProvider}
            activeOpacity={isProvider ? 0.7 : 1}
          >
            <View style={styles.stepLeft}>
              <View style={[
                styles.stepNumber,
                step.completed && styles.stepNumberCompleted
              ]}>
                {step.completed ? (
                  <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text style={[
                  styles.stepTitle,
                  step.completed && styles.stepTitleCompleted
                ]}>
                  {step.title}
                </Text>
                {isProvider && (
                  <Text style={styles.stepHint}>
                    {step.completed ? 'Completed' : 'Tap to mark complete'}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons
              name={step.icon}
              size={24}
              color={step.completed ? '#4CAF50' : '#999'}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Complete Service Button (Provider Only) */}
      {isProvider && (
        <View style={styles.actionContainer}>
          <ElegantButton
            title="Mark Service Complete"
            icon="checkmark-done-circle"
            variant="success"
            gradient={true}
            onPress={handleCompleteService}
            loading={loading}
            disabled={!progressSteps.every(step => step.completed)}
          />
          {!progressSteps.every(step => step.completed) && (
            <Text style={styles.actionHint}>
              Complete all steps above first
            </Text>
          )}
        </View>
      )}

      {/* Waiting message for owner */}
      {!isProvider && (
        <View style={styles.ownerWaitingContainer}>
          <Text style={styles.ownerWaitingText}>
            ⏳ Service provider is working on your item
          </Text>
          <Text style={styles.ownerWaitingSubtext}>
            You'll be notified when the service is complete
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  serviceInfo: {
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  completedTime: {
    fontSize: 14,
    color: '#999',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  serviceInfoCompact: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  elapsedTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stepsContainer: {
    maxHeight: 300,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  stepTitleCompleted: {
    color: '#4CAF50',
  },
  stepHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionContainer: {
    marginTop: 16,
  },
  actionHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  ownerWaitingContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  ownerWaitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  ownerWaitingSubtext: {
    fontSize: 12,
    color: '#856404',
  },
});

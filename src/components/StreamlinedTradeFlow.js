import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';

const StreamlinedTradeFlow = ({ 
  conversationId, 
  currentUserId, 
  tradeData, 
  onStepComplete,
  onContactShare 
}) => {
  const [currentStep, setCurrentStep] = useState('seller_commit');
  const [stepStatuses, setStepStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  const tradeSteps = [
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT,
      title: 'Commit to Trade',
      icon: '🤝',
      description: 'Both parties confirm they want to proceed',
      color: '#4CAF50'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE,
      title: 'Share Contact Info',
      icon: '📞',
      description: 'Exchange phone numbers or email',
      color: '#2196F3'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED,
      title: 'Arrange Meeting',
      icon: '📍',
      description: 'Set time and location for exchange',
      color: '#FF9800'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED,
      title: 'Start Exchange',
      icon: '🔄',
      description: 'Confirm you\'ve met and started the trade',
      color: '#9C27B0'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED,
      title: 'Complete Trade',
      icon: '✅',
      description: 'Confirm successful exchange',
      color: '#4CAF50'
    }
  ];

  useEffect(() => {
    loadStepStatuses();
  }, [conversationId]);

  const loadStepStatuses = async () => {
    try {
      const statuses = {};
      for (const step of tradeSteps) {
        const status = await BilateralTradeConfirmationService.getStepConfirmationStatus(
          conversationId, 
          step.id, 
          currentUserId
        );
        statuses[step.id] = status;
      }
      setStepStatuses(statuses);
      
      // Find current active step
      const activeStep = tradeSteps.find(step => {
        const status = statuses[step.id];
        return !status.bothConfirmed && !status.expired;
      });
      
      if (activeStep) {
        setCurrentStep(activeStep.id);
      }
    } catch (error) {
      console.error('Error loading step statuses:', error);
    }
  };

  const handleStepAction = async (stepId) => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (stepId === BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE) {
        // Special handling for contact exchange
        if (onContactShare) {
          onContactShare();
        }
      } else {
        // Regular bilateral confirmation
        const result = await BilateralTradeConfirmationService.confirmTradeStep(
          conversationId,
          stepId,
          currentUserId,
          { confirmedAt: new Date() }
        );
        
        if (result.bothConfirmed) {
          Alert.alert(
            'Step Complete!', 
            result.message,
            [{ text: 'OK', onPress: () => loadStepStatuses() }]
          );
        } else {
          Alert.alert('Confirmed!', result.message);
        }
        
        if (onStepComplete) {
          onStepComplete(stepId, result);
        }
        
        await loadStepStatuses();
      }
    } catch (error) {
      console.error('Error handling step action:', error);
      Alert.alert('Error', 'Failed to complete step. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepId) => {
    const status = stepStatuses[stepId];
    if (!status) return 'pending';
    
    if (status.bothConfirmed) return 'completed';
    if (status.expired) return 'expired';
    if (status.userNeedsAction) return 'action_required';
    if (status.userAConfirmed || status.userBConfirmed) return 'waiting';
    return 'pending';
  };

  const canPerformStep = (stepId) => {
    const stepIndex = tradeSteps.findIndex(step => step.id === stepId);
    
    // First step is always available
    if (stepIndex === 0) return true;
    
    // Check if previous step is completed
    const previousStep = tradeSteps[stepIndex - 1];
    const previousStatus = stepStatuses[previousStep.id];
    
    return previousStatus && previousStatus.bothConfirmed;
  };

  const renderStepCard = (step, index) => {
    const status = getStepStatus(step.id);
    const canPerform = canPerformStep(step.id);
    const stepStatus = stepStatuses[step.id];
    
    let statusColor = '#ccc';
    let statusText = 'Pending';
    let actionText = 'Start';
    let showAction = false;
    
    switch (status) {
      case 'completed':
        statusColor = '#4CAF50';
        statusText = 'Completed ✅';
        break;
      case 'expired':
        statusColor = '#f44336';
        statusText = 'Expired ⏰';
        break;
      case 'action_required':
        statusColor = '#FF9800';
        statusText = 'Your Turn 👆';
        actionText = 'Confirm';
        showAction = canPerform;
        break;
      case 'waiting':
        statusColor = '#2196F3';
        statusText = 'Waiting for Other Party ⏳';
        break;
      default:
        if (canPerform) {
          statusColor = step.color;
          statusText = 'Ready';
          actionText = step.id === BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE ? 'Share Contact' : 'Confirm';
          showAction = true;
        } else {
          statusText = 'Locked 🔒';
        }
    }

    return (
      <View key={step.id} style={[styles.stepCard, { borderLeftColor: statusColor }]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepInfo}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
          <View style={styles.stepStatus}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        {showAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: statusColor }]}
            onPress={() => handleStepAction(step.id)}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? 'Processing...' : actionText}
            </Text>
          </TouchableOpacity>
        )}
        
        {stepStatus && stepStatus.timeRemaining && status !== 'completed' && (
          <Text style={styles.timeRemaining}>
            ⏰ {stepStatus.timeRemaining}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trade Progress</Text>
        <Text style={styles.headerSubtitle}>Complete each step to finish your trade</Text>
      </View>
      
      <ScrollView style={styles.stepsContainer} showsVerticalScrollIndicator={false}>
        {tradeSteps.map((step, index) => renderStepCard(step, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 10,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  stepsContainer: {
    maxHeight: 400,
    padding: 10,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  stepStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StreamlinedTradeFlow;
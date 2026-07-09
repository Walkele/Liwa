import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';

export default function TradeStepProgression({ 
  conversationId, 
  onStepAction, 
  loading = false,
  messages = [] 
}) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentTradeStep, setCurrentTradeStep] = useState('accepted');

  // Check and update step completion status
  useEffect(() => {
    const checkStepCompletion = async () => {
      if (!conversationId) return;

      try {
        // Check completion status for all trade steps
        const steps = [
          BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT,
          BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE,
          BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED,
          BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED,
          BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED
        ];

        const completedStepsSet = new Set();
        let currentStep = 'accepted'; // Default starting step

        for (const step of steps) {
          const status = await BilateralTradeConfirmationService.getStepConfirmationStatus(conversationId, step);
          
          if (status.bothConfirmed) {
            completedStepsSet.add(step);
          } else if (status.userAConfirmed || status.userBConfirmed) {
            // This is the current step (partially confirmed)
            currentStep = step;
            break;
          } else {
            // This is the next step to be completed
            currentStep = step;
            break;
          }
        }

        setCompletedSteps(completedStepsSet);
        setCurrentTradeStep(currentStep);

      } catch (error) {
        console.error('❌ Error checking step completion:', error);
      }
    };

    checkStepCompletion();
    
    // Check step completion every 5 seconds to stay updated
    const interval = setInterval(checkStepCompletion, 5000);
    
    return () => clearInterval(interval);
  }, [conversationId, messages]); // Re-check when messages update

  // Helper function to check if a step is accessible
  const isStepAccessible = (step) => {
    // If step is already completed, it's not accessible
    if (completedSteps.has(step)) {
      return false;
    }

    // Define step order
    const stepOrder = [
      'accepted', // Initial state after trade acceptance
      BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT,
      BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE,
      BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED,
      BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED,
      BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED
    ];

    const currentStepIndex = stepOrder.indexOf(currentTradeStep);
    const requestedStepIndex = stepOrder.indexOf(step);

    // Only allow current step or if it's the commit step (always available until contact exchange starts)
    if (step === 'seller_commit' || step === BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT) {
      return !completedSteps.has(BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE);
    }

    // Allow access only to the current step
    return requestedStepIndex === currentStepIndex;
  };

  // Helper function to get step status display
  const getStepStatus = (step) => {
    if (completedSteps.has(step)) {
      return { status: 'completed', icon: 'checkmark-circle', color: '#4CAF50' };
    }
    
    if (step === currentTradeStep) {
      return { status: 'current', icon: 'radio-button-on', color: '#2196F3' };
    }
    
    return { status: 'pending', icon: 'radio-button-off', color: '#9E9E9E' };
  };

  const allSteps = [
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT,
      title: 'Step 1: Commit to Trade',
      description: 'Confirm your commitment to proceed with this trade',
      action: 'seller_commit',
      icon: 'people',
      color: '#4CAF50'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE,
      title: 'Step 2: Share Contact Info',
      description: 'Exchange contact details to coordinate the meeting',
      action: 'exchange_contact',
      icon: 'call',
      color: '#2196F3'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED,
      title: 'Step 3: Set Meeting Location',
      description: 'Choose a safe, public location for the exchange',
      action: 'arrange_meeting',
      icon: 'location',
      color: '#FF9500'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED,
      title: 'Step 4: Begin Exchange',
      description: 'Start the physical exchange process',
      action: 'start_exchange',
      icon: 'swap-horizontal',
      color: '#9C27B0'
    },
    {
      id: BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED,
      title: 'Step 5: Complete Trade',
      description: 'Confirm that the exchange has been completed successfully',
      action: 'complete_trade',
      icon: 'checkmark-done',
      color: '#4CAF50'
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trade Progress</Text>
      {allSteps.map((step, index) => {
        const stepStatus = getStepStatus(step.id);
        const isAccessible = isStepAccessible(step.id);
        const isCompleted = completedSteps.has(step.id);
        
        return (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Ionicons 
                  name={stepStatus.icon} 
                  size={20} 
                  color={stepStatus.color} 
                />
              </View>
              <View style={styles.stepInfo}>
                <Text style={[
                  styles.stepTitle,
                  { color: isCompleted ? '#4CAF50' : '#333' }
                ]}>
                  {step.title}
                  {isCompleted && ' ✓'}
                </Text>
                <Text style={styles.stepDescription}>
                  {step.description}
                </Text>
              </View>
            </View>
            
            {/* Active Step Button */}
            {isAccessible && !isCompleted && (
              <TouchableOpacity
                style={[
                  styles.stepActionButton,
                  { backgroundColor: step.color }
                ]}
                onPress={() => onStepAction(step.action)}
                disabled={loading}
              >
                <Ionicons name={step.icon} size={16} color="white" />
                <Text style={styles.stepActionText}>
                  {step.action === 'seller_commit' ? 'Commit Now' :
                   step.action === 'exchange_contact' ? 'Share Contact' :
                   step.action === 'arrange_meeting' ? 'Arrange Meeting' :
                   step.action === 'start_exchange' ? 'Start Exchange' :
                   'Complete Trade'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Completed Step Indicator */}
            {isCompleted && (
              <View style={[
                styles.stepCompletedIndicator,
                { backgroundColor: '#4CAF50' }
              ]}>
                <Ionicons name="checkmark-done" size={16} color="white" />
                <Text style={styles.stepCompletedText}>Completed ✓</Text>
              </View>
            )}
            
            {/* Locked Step Indicator */}
            {!isAccessible && !isCompleted && (
              <View style={[
                styles.stepLockedIndicator,
                { backgroundColor: '#9E9E9E' }
              ]}>
                <Ionicons name="lock-closed" size={16} color="white" />
                <Text style={styles.stepLockedText}>Locked</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    margin: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stepActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  stepActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stepCompletedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    opacity: 0.8,
  },
  stepCompletedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stepLockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    opacity: 0.6,
  },
  stepLockedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
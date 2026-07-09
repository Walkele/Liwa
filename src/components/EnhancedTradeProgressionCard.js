import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MeetingArrangementModal from './MeetingArrangementModal';
import MeetingMatchModal from './MeetingMatchModal';

const EnhancedTradeProgressionCard = ({ 
  acceptedTrade, 
  currentUserId, 
  messages, 
  onAction 
}) => {
  const [expandedStep, setExpandedStep] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showMeetingMatchModal, setShowMeetingMatchModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Define the complete trade progression with timing expectations and penalties
  const tradeSteps = [
    {
      id: 'seller_commit',
      title: 'Commit to Trade',
      description: 'Both parties confirm they\'re serious about this trade',
      userAction: 'I\'m committed to this trade',
      partnerAction: 'Waiting for partner to commit',
      timeExpected: '5 minutes',
      timeoutMinutes: 5,
      icon: 'hand-left-outline',
      color: '#FF6B6B',
      tips: [
        'This confirms you\'re both serious about the trade',
        'No backing out after both parties commit',
        'Helps prevent time wasters and low-ballers',
        'Trade auto-cancels if partner doesn\'t respond in 5 minutes'
      ],
      penalty: {
        description: 'Trade cancellation if not committed within 5 minutes',
        trustScoreImpact: -5,
        accountStrike: false
      }
    },
    {
      id: 'contact_exchange',
      title: 'Share Contact Info',
      description: 'Exchange phone numbers to coordinate the meetup',
      userAction: 'Share My Phone Number',
      partnerAction: 'Waiting for partner to share contact',
      timeExpected: '10 minutes',
      timeoutMinutes: 10,
      icon: 'call-outline',
      color: '#2196F3',
      tips: [
        'Share real phone numbers for coordination',
        'This allows direct communication outside the app',
        'Both parties must share before proceeding',
        'Trade auto-cancels if contact not shared within 10 minutes'
      ],
      penalty: {
        description: 'Trade cancellation if contact not shared within 10 minutes',
        trustScoreImpact: -3,
        accountStrike: false
      }
    },
    {
      id: 'meeting_arranged',
      title: 'Arrange Meeting',
      description: 'Propose times and locations - both must agree',
      userAction: 'Propose Meeting Details',
      partnerAction: 'Waiting for meeting proposal',
      timeExpected: '30 minutes',
      timeoutMinutes: 30,
      icon: 'location-outline',
      color: '#FF9800',
      tips: [
        'Propose 3 time slots and 3 safe locations',
        'Partner can accept, counter-propose, or suggest alternatives',
        'System finds the best match between both preferences',
        'Trade auto-cancels if meeting not arranged within 30 minutes'
      ],
      penalty: {
        description: 'Trade cancellation if meeting not arranged within 30 minutes',
        trustScoreImpact: -10,
        accountStrike: true
      },
      requiresModal: true,
      requiresMeetingMatch: true
    },
    {
      id: 'exchange_started',
      title: 'Start Exchange',
      description: 'Both parties confirm they\'re ready to meet and scan QR codes',
      userAction: 'Ready to Meet',
      partnerAction: 'Waiting for partner to confirm readiness',
      timeExpected: 'At meeting time',
      timeoutMinutes: 60, // 1 hour grace period
      icon: 'people-outline',
      color: '#9C27B0',
      tips: [
        'Only confirm when you\'re at the meeting location',
        'Both parties must confirm before QR scanning',
        'Either party can cancel before QR scan with valid reason',
        'Trade auto-cancels if meeting not confirmed within 1 hour'
      ],
      penalty: {
        description: 'Trade cancellation if not confirmed within 1 hour',
        trustScoreImpact: -15,
        accountStrike: true
      },
      requiresQR: true,
      allowsCancellation: true
    },
    {
      id: 'trade_completed',
      title: 'Complete Trade',
      description: 'Confirm the exchange was successful',
      userAction: 'Trade Completed Successfully',
      partnerAction: 'Waiting for partner to confirm completion',
      timeExpected: 'Immediately after',
      timeoutMinutes: 15, // Quick completion expected
      icon: 'trophy-outline',
      color: '#2ED573',
      tips: [
        'Only confirm if you\'re satisfied with the trade',
        'This finalizes the transaction',
        'Both parties must confirm to close the trade',
        'Trade auto-cancels if not completed within 15 minutes of exchange start'
      ],
      penalty: {
        description: 'Trade cancellation if not completed within 15 minutes',
        trustScoreImpact: -20,
        accountStrike: true
      }
    }
  ];

  // Find current step and user states
  const getCurrentStep = () => {
    console.log('🔍 EnhancedTradeProgressionCard - checking confirmations for steps');
    
    for (const step of tradeSteps) {
      const currentUserConfirmed = messages.some(msg => 
        msg.messageType === 'trade_step_confirmation' && 
        msg.step === step.id && 
        msg.userId === currentUserId
      );
      
      const otherUserConfirmed = messages.some(msg => 
        msg.messageType === 'trade_step_confirmation' && 
        msg.step === step.id && 
        msg.userId !== currentUserId
      );
      
      const bothConfirmed = currentUserConfirmed && otherUserConfirmed;
      
      console.log(`🔍 Step ${step.id}:`, {
        currentUserConfirmed,
        otherUserConfirmed,
        bothConfirmed,
        confirmationMessages: messages.filter(msg => 
          msg.messageType === 'trade_step_confirmation' && msg.step === step.id
        ).map(msg => ({
          userId: msg.userId,
          step: msg.step,
          text: msg.text
        }))
      });
      
      if (!bothConfirmed) {
        return {
          step,
          currentUserConfirmed,
          otherUserConfirmed,
          userNeedsToAct: !currentUserConfirmed,
          waitingForPartner: currentUserConfirmed && !otherUserConfirmed
        };
      }
    }
    
    // All steps completed
    return { completed: true };
  };

  const currentStepInfo = getCurrentStep();

  if (currentStepInfo.completed) {
    return (
      <View style={styles.completedCard}>
        <View style={styles.completedHeader}>
          <Ionicons name="trophy" size={32} color="#2ED573" />
          <Text style={styles.completedTitle}>Trade Completed! 🎉</Text>
        </View>
        <Text style={styles.completedSubtitle}>
          Both parties have confirmed the successful exchange
        </Text>
      </View>
    );
  }

  const { step, currentUserConfirmed, otherUserConfirmed, userNeedsToAct, waitingForPartner } = currentStepInfo;

  const handleStepAction = () => {
    console.log('🎯 EnhancedTradeProgressionCard - handleStepAction called for step:', step.id);
    
    if (step.id === 'contact_exchange') {
      // Show contact sharing modal
      onAction('share_contact', { step, acceptedTrade });
    } else if (step.id === 'meeting_arranged') {
      // Show meeting match modal
      if (step.requiresMeetingMatch) {
        setShowMeetingMatchModal(true);
      } else {
        setShowMeetingModal(true);
      }
    } else if (step.requiresQR) {
      // Navigate to QR verification
      onAction('qr_verification', { acceptedTrade, step });
    } else {
      // Simple confirmation for other steps
      console.log('🎯 Calling onAction with confirm_step:', { step: step, acceptedTrade: acceptedTrade.id });
      onAction('confirm_step', { step: step, acceptedTrade });
    }
  };

  const handleMeetingProposed = (proposal) => {
    console.log('🎯 Meeting proposal:', proposal);
    setShowMeetingMatchModal(false);
    onAction('meeting_proposed', { acceptedTrade, step, proposal });
  };

  const handleCancelTrade = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancellation');
      return;
    }
    
    setShowCancelModal(false);
    onAction('cancel_trade', { 
      acceptedTrade, 
      step, 
      reason: cancelReason,
      cancelStage: step.id 
    });
    setCancelReason('');
  };

  const handleMeetingArranged = (meetingData) => {
    console.log('🎯 Meeting arranged:', meetingData);
    setShowMeetingModal(false);
    onAction('meeting_arranged', { acceptedTrade, step, meetingData });
  };

  const toggleStepDetails = () => {
    setExpandedStep(expandedStep === step.id ? null : step.id);
  };

  return (
    <View style={styles.progressionCard}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <View style={styles.progressInfo}>
          <Ionicons name="trending-up" size={20} color="#666" />
          <Text style={styles.progressText}>
            Trade Progress: Step {tradeSteps.findIndex(s => s.id === step.id) + 1} of {tradeSteps.length}
          </Text>
        </View>
        <Text style={styles.timeExpected}>Expected: {step.timeExpected}</Text>
      </View>

      {/* Current Step Card */}
      <View style={[styles.stepCard, { borderLeftColor: step.color }]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepTitleRow}>
            <View style={[styles.stepIcon, { backgroundColor: `${step.color}20` }]}>
              <Ionicons name={step.icon} size={24} color={step.color} />
            </View>
            <View style={styles.stepTitleContainer}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
            <TouchableOpacity onPress={toggleStepDetails} style={styles.expandButton}>
              <Ionicons 
                name={expandedStep === step.id ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Indicators */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Ionicons 
                name={currentUserConfirmed ? "checkmark-circle" : "time-outline"} 
                size={16} 
                color={currentUserConfirmed ? "#4CAF50" : "#FF9800"} 
              />
              <Text style={[styles.statusText, currentUserConfirmed && styles.confirmedText]}>
                You: {currentUserConfirmed ? "Confirmed" : "Pending"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons 
                name={otherUserConfirmed ? "checkmark-circle" : "time-outline"} 
                size={16} 
                color={otherUserConfirmed ? "#4CAF50" : "#FF9800"} 
              />
              <Text style={[styles.statusText, otherUserConfirmed && styles.confirmedText]}>
                Partner: {otherUserConfirmed ? "Confirmed" : "Pending"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {userNeedsToAct ? (
          <View style={styles.actionContainer}>
            {step.allowsCancellation && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelTrade}
              >
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text style={styles.cancelButtonText}>Cancel Trade</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: step.color }]}
              onPress={handleStepAction}
            >
              <Ionicons name={step.icon} size={20} color="white" />
              <Text style={styles.actionButtonText}>{step.userAction}</Text>
            </TouchableOpacity>
          </View>
        ) : waitingForPartner ? (
          <View style={styles.waitingContainer}>
            <Ionicons name="hourglass-outline" size={20} color="#666" />
            <View style={styles.waitingTextContainer}>
              <Text style={styles.waitingText}>{step.partnerAction}</Text>
              <Text style={styles.timeoutWarning}>
                ⏰ Waiting {step.timeExpected} - Trade will auto-cancel if no response
              </Text>
            </View>
          </View>
        ) : null}

        {/* Expanded Details */}
        {expandedStep === step.id && (
          <View style={styles.expandedDetails}>
            <Text style={styles.tipsTitle}>💡 What to expect:</Text>
            {step.tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
            
            {/* Penalty Warning */}
            {step.penalty && (
              <View style={styles.penaltyWarning}>
                <Ionicons name="warning" size={16} color="#FF9800" />
                <View style={styles.penaltyTextContainer}>
                  <Text style={styles.penaltyTitle}>⚠️ Violation Penalty:</Text>
                  <Text style={styles.penaltyDescription}>{step.penalty.description}</Text>
                  <Text style={styles.penaltyImpact}>
                    Trust Score Impact: {step.penalty.trustScoreImpact > 0 ? '+' : ''}{step.penalty.trustScoreImpact}
                    {step.penalty.accountStrike && ' • Account Strike'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Enhanced Anti-Lowball Message */}
      <View style={styles.antiLowballContainer}>
        <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
        <View style={styles.antiLowballTextContainer}>
          <Text style={styles.antiLowballText}>
            🛡️ Committed trades prevent last-minute changes and time-wasters
          </Text>
          <Text style={styles.antiLowballSubtext}>
            Auto-cancellation ensures serious buyers and sellers only
          </Text>
        </View>
      </View>

      {/* Meeting Arrangement Modal */}
      <MeetingArrangementModal
        visible={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        conversationId={acceptedTrade.conversationId}
        otherUserName={acceptedTrade.targetUserName || 'Partner'}
        onMeetingArranged={handleMeetingArranged}
      />

      {/* Meeting Match Modal */}
      <MeetingMatchModal
        visible={showMeetingMatchModal}
        onClose={() => setShowMeetingMatchModal(false)}
        otherUserName={acceptedTrade.targetUserName || 'Partner'}
        onMeetingProposed={handleMeetingProposed}
      />

      {/* Cancellation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelModalHeader}>
              <Ionicons name="warning" size={28} color="#FF6B6B" />
              <Text style={styles.cancelModalTitle}>Cancel Trade?</Text>
            </View>
            
            <Text style={styles.cancelModalText}>
              Cancelling at this stage will impact your trust score. Please provide a valid reason.
            </Text>
            
            <View style={styles.cancelReasonOptions}>
              {[
                { id: 'no_show', label: 'Partner didn\'t show up', icon: 'person-remove-outline' },
                { id: 'item_condition', label: 'Item not as described', icon: 'alert-circle-outline' },
                { id: 'safety_concern', label: 'Safety concern', icon: 'shield-outline' },
                { id: 'changed_mind', label: 'Changed my mind', icon: 'refresh-outline' },
                { id: 'emergency', label: 'Emergency situation', icon: 'flame-outline' }
              ].map(reason => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.cancelReasonOption,
                    cancelReason === reason.id && styles.cancelReasonSelected
                  ]}
                  onPress={() => setCancelReason(reason.label)}
                >
                  <Ionicons 
                    name={reason.icon} 
                    size={20} 
                    color={cancelReason === reason.id ? '#FF6B6B' : '#999'} 
                  />
                  <Text style={[
                    styles.cancelReasonText,
                    cancelReason === reason.id && styles.cancelReasonTextSelected
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.cancelReasonInput}
              placeholder="Or enter custom reason..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              maxLength={200}
            />
            
            <View style={styles.cancelModalButtons}>
              <TouchableOpacity
                style={styles.cancelModalCancelButton}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.cancelModalCancelText}>Keep Trade</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelModalConfirmButton}
                onPress={handleCancelConfirm}
              >
                <Text style={styles.cancelModalConfirmText}>Cancel Trade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  progressionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeExpected: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  stepCard: {
    padding: 16,
    borderLeftWidth: 4,
  },
  stepHeader: {
    marginBottom: 12,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  expandButton: {
    padding: 4,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  confirmedText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  waitingTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timeoutWarning: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    fontStyle: 'normal',
  },
  expandedDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tipBullet: {
    color: '#666',
    marginRight: 8,
    fontSize: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  penaltyWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFECB3',
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 6,
  },
  penaltyTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  penaltyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 4,
  },
  penaltyDescription: {
    fontSize: 12,
    color: '#8D6E63',
    marginBottom: 4,
  },
  penaltyImpact: {
    fontSize: 11,
    color: '#D84315',
    fontWeight: '600',
  },
  antiLowballContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f0f8f0',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  antiLowballTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  antiLowballText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 2,
  },
  antiLowballSubtext: {
    fontSize: 11,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  cancelModalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelReasonOptions: {
    marginBottom: 16,
  },
  cancelReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelReasonSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF6B6B',
  },
  cancelReasonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  cancelReasonTextSelected: {
    fontWeight: '600',
    color: '#FF6B6B',
  },
  cancelReasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelModalButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cancelModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  cancelModalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  cancelModalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  completedCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ED573',
    marginTop: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default EnhancedTradeProgressionCard;
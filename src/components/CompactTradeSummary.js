import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BilateralTradeConfirmationService } from '../services/BilateralTradeConfirmationService';

const CompactTradeSummary = ({ 
  conversationId, 
  currentUserId, 
  messages, 
  onActionPress,
  onContactShare 
}) => {
  const [tradeData, setTradeData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});

  useEffect(() => {
    if (conversationId && currentUserId) {
      analyzeTradeData();
    }
  }, [conversationId, currentUserId, messages]);

  const analyzeTradeData = async () => {
    try {
      // Find the active trade (accepted counter-offer or trade proposal)
      const acceptedCounterOffer = messages.find(msg => 
        msg.messageType === 'counter_offer' && msg.status === 'accepted'
      );
      
      const acceptedTradeProposal = messages.find(msg => 
        msg.messageType === 'trade_proposal' && msg.status === 'accepted'
      );

      const pendingCounterOffer = messages.find(msg => 
        msg.messageType === 'counter_offer' && 
        msg.targetUserId === currentUserId &&
        (!msg.status || msg.status === 'pending' || msg.status === 'active')
      );

      if (pendingCounterOffer) {
        setTradeData({
          type: 'counter_offer_pending',
          amount: pendingCounterOffer.newTerms?.cashAmount || pendingCounterOffer.cashAmount || 0,
          status: 'Awaiting Your Response',
          urgency: 'high',
          message: pendingCounterOffer
        });
        return;
      }

      if (acceptedCounterOffer || acceptedTradeProposal) {
        const activeMessage = acceptedCounterOffer || acceptedTradeProposal;
        
        // Get step statuses
        const steps = [
          BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT,
          BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE,
          BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED,
          BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED,
          BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED
        ];

        const statuses = {};
        let currentStep = null;
        let completedSteps = 0;

        for (const step of steps) {
          const status = await BilateralTradeConfirmationService.getStepConfirmationStatus(
            conversationId, 
            step, 
            currentUserId
          );
          statuses[step] = status;
          
          if (status.bothConfirmed) {
            completedSteps++;
          } else if (!currentStep) {
            currentStep = step;
          }
        }

        setStepStatuses(statuses);
        
        const progress = (completedSteps / steps.length) * 100;
        
        setTradeData({
          type: 'trade_in_progress',
          amount: activeMessage.newTerms?.cashAmount || activeMessage.cashAmount || 0,
          currentStep,
          progress,
          completedSteps,
          totalSteps: steps.length,
          status: currentStep ? getStepDisplayName(currentStep) : 'Completed',
          urgency: statuses[currentStep]?.userNeedsAction ? 'high' : 'medium',
          message: activeMessage
        });
      } else {
        setTradeData(null);
      }
    } catch (error) {
      console.error('Error analyzing trade data:', error);
    }
  };

  const getStepDisplayName = (step) => {
    switch (step) {
      case BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT:
        return 'Commitment Phase';
      case BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE:
        return 'Contact Exchange';
      case BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED:
        return 'Meeting Setup';
      case BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED:
        return 'Exchange Started';
      case BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED:
        return 'Final Confirmation';
      default:
        return 'Trade Step';
    }
  };

  const getStepIcon = (step) => {
    switch (step) {
      case BilateralTradeConfirmationService.TRADE_STEPS.SELLER_COMMIT:
        return 'handshake';
      case BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE:
        return 'call';
      case BilateralTradeConfirmationService.TRADE_STEPS.MEETING_ARRANGED:
        return 'location';
      case BilateralTradeConfirmationService.TRADE_STEPS.EXCHANGE_STARTED:
        return 'swap-horizontal';
      case BilateralTradeConfirmationService.TRADE_STEPS.TRADE_COMPLETED:
        return 'checkmark-circle';
      default:
        return 'ellipse';
    }
  };

  const handleQuickAction = () => {
    if (tradeData?.type === 'counter_offer_pending') {
      onActionPress?.('show_counter_offer_buttons');
    } else if (tradeData?.currentStep) {
      if (tradeData.currentStep === BilateralTradeConfirmationService.TRADE_STEPS.CONTACT_EXCHANGE) {
        onContactShare?.();
      } else {
        onActionPress?.(tradeData.currentStep);
      }
    }
  };

  const renderProgressBar = () => {
    if (tradeData?.type !== 'trade_in_progress') return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${tradeData.progress}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {tradeData.completedSteps}/{tradeData.totalSteps} steps
        </Text>
      </View>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={showDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Trade Progress</Text>
          <TouchableOpacity 
            onPress={() => setShowDetails(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {Object.entries(stepStatuses).map(([step, status]) => (
            <View key={step} style={styles.stepItem}>
              <View style={styles.stepHeader}>
                <Ionicons 
                  name={getStepIcon(step)} 
                  size={20} 
                  color={status.bothConfirmed ? '#4CAF50' : status.userNeedsAction ? '#FF6B6B' : '#ccc'} 
                />
                <Text style={styles.stepTitle}>{getStepDisplayName(step)}</Text>
                {status.bothConfirmed && (
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                )}
              </View>
              
              <Text style={[
                styles.stepStatus,
                { color: status.bothConfirmed ? '#4CAF50' : status.userNeedsAction ? '#FF6B6B' : '#666' }
              ]}>
                {status.bothConfirmed ? 'Completed' : 
                 status.userNeedsAction ? 'Your action needed' : 
                 status.userAConfirmed || status.userBConfirmed ? 'Waiting for other party' : 'Pending'}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  if (!tradeData) {
    return null;
  }

  return (
    <>
      <View style={[
        styles.container,
        { backgroundColor: tradeData.urgency === 'high' ? '#FFF3E0' : '#E8F5E8' }
      ]}>
        <TouchableOpacity 
          style={styles.summaryContent}
          onPress={() => setShowDetails(true)}
        >
          <View style={styles.leftSection}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>${tradeData.amount}</Text>
              <Text style={styles.statusText}>{tradeData.status}</Text>
            </View>
            {renderProgressBar()}
          </View>

          <View style={styles.rightSection}>
            <Ionicons 
              name={tradeData.urgency === 'high' ? 'alert-circle' : 'information-circle'} 
              size={20} 
              color={tradeData.urgency === 'high' ? '#FF9800' : '#4CAF50'} 
            />
          </View>
        </TouchableOpacity>

        {(tradeData.type === 'counter_offer_pending' || 
          (tradeData.currentStep && stepStatuses[tradeData.currentStep]?.userNeedsAction)) && (
          <TouchableOpacity 
            style={[
              styles.actionButton,
              { backgroundColor: tradeData.urgency === 'high' ? '#FF9800' : '#4CAF50' }
            ]}
            onPress={handleQuickAction}
          >
            <Ionicons name="flash" size={16} color="white" />
            <Text style={styles.actionButtonText}>
              {tradeData.type === 'counter_offer_pending' ? 'Respond' : 'Take Action'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {renderDetailModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
  },
  amountContainer: {
    marginBottom: 8,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  rightSection: {
    marginLeft: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  stepItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  stepStatus: {
    fontSize: 14,
    marginLeft: 30,
  },
});

export default CompactTradeSummary;
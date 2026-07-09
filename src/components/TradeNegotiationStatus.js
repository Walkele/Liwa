import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TradeNegotiationService } from '../services/TradeNegotiationService';
import { EscrowService } from '../services/EscrowService';

export default function TradeNegotiationStatus({ tradeProposalId, userId, onAction }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextAction, setNextAction] = useState(null);

  useEffect(() => {
    if (tradeProposalId) {
      loadProposalData();
    }
  }, [tradeProposalId]);

  const loadProposalData = async () => {
    try {
      setLoading(true);
      const result = await TradeNegotiationService.getTradeProposal(tradeProposalId);
      if (result.success) {
        setProposal(result.proposal);
        const action = TradeNegotiationService.getNextAction(result.proposal, userId);
        setNextAction(action);
      }
    } catch (error) {
      console.error('Error loading proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading trade status...</Text>
      </View>
    );
  }

  if (!proposal) {
    return null;
  }

  const renderPhaseIndicator = () => {
    const phases = [
      { key: 'initial_proposal', label: 'Proposal', icon: 'document-text-outline' },
      { key: 'item_selection', label: 'Item Selection', icon: 'list-outline' },
      { key: 'terms_agreement', label: 'Terms', icon: 'checkmark-circle-outline' },
      { key: 'escrow_locking', label: 'Escrow', icon: 'lock-closed-outline' },
      { key: 'shipping_coordination', label: 'Shipping', icon: 'car-outline' },
      { key: 'confirmation', label: 'Confirmation', icon: 'checkmark-done-outline' },
      { key: 'completed', label: 'Completed', icon: 'ribbon-outline' }
    ];

    const currentPhaseIndex = phases.findIndex(p => p.key === proposal.phase);

    return (
      <View style={styles.phaseIndicator}>
        {phases.map((phase, index) => {
          const isCompleted = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;
          const isPending = index > currentPhaseIndex;

          return (
            <View key={phase.key} style={styles.phaseItem}>
              <View style={[
                styles.phaseIcon,
                isCompleted && styles.phaseIconCompleted,
                isCurrent && styles.phaseIconCurrent,
                isPending && styles.phaseIconPending
              ]}>
                <Ionicons
                  name={phase.icon}
                  size={16}
                  color={isCompleted ? '#4CAF50' : isCurrent ? '#FF6B6B' : '#ccc'}
                />
              </View>
              <Text style={[
                styles.phaseLabel,
                isCurrent && styles.phaseLabelCurrent
              ]}>
                {phase.label}
              </Text>
              {index < phases.length - 1 && (
                <View style={[
                  styles.phaseConnector,
                  isCompleted && styles.phaseConnectorCompleted
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderEscrowStatus = () => {
    if (!proposal.escrow) return null;

    const escrow = proposal.escrow;
    const stateColors = {
      [EscrowService.ESCROW_STATES.INITIATED]: '#FF9800',
      [EscrowService.ESCROW_STATES.ITEMS_LOCKED]: '#2196F3',
      [EscrowService.ESCROW_STATES.READY_TO_EXCHANGE]: '#4CAF50',
      [EscrowService.ESCROW_STATES.IN_TRANSIT]: '#9C27B0',
      [EscrowService.ESCROW_STATES.COMPLETED]: '#4CAF50',
      [EscrowService.ESCROW_STATES.CANCELLED]: '#F44336'
    };

    const stateLabels = {
      [EscrowService.ESCROW_STATES.INITIATED]: 'Trade Initiated',
      [EscrowService.ESCROW_STATES.ITEMS_LOCKED]: 'Items Locked in Escrow',
      [EscrowService.ESCROW_STATES.READY_TO_EXCHANGE]: 'Ready for Exchange',
      [EscrowService.ESCROW_STATES.IN_TRANSIT]: 'Items in Transit',
      [EscrowService.ESCROW_STATES.COMPLETED]: 'Trade Completed',
      [EscrowService.ESCROW_STATES.CANCELLED]: 'Trade Cancelled'
    };

    return (
      <View style={[
        styles.escrowStatus,
        { backgroundColor: `${stateColors[escrow.state] || '#ccc'}20` }
      ]}>
        <Ionicons 
          name="shield-checkmark-outline" 
          size={20} 
          color={stateColors[escrow.state] || '#666'} 
        />
        <View style={styles.escrowInfo}>
          <Text style={styles.escrowTitle}>Escrow Status</Text>
          <Text style={[
            styles.escrowState,
            { color: stateColors[escrow.state] || '#666' }
          ]}>
            {stateLabels[escrow.state] || escrow.state}
          </Text>
          {escrow.itemsLocked && (
            <Text style={styles.escrowDetail}>
              {escrow.lockedItems?.length || 0} items locked
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!nextAction || nextAction.action === 'waiting' || nextAction.action === 'completed') {
      return null;
    }

    const actions = {
      accept_or_counter: [
        { label: 'Accept Trade', action: 'accept', color: '#4CAF50' },
        { label: 'Counter Offer', action: 'counter', color: '#FF9800' }
      ],
      select_items: [
        { label: 'Select Items', action: 'select_items', color: '#FF6B6B' }
      ],
      agree_terms: [
        { label: 'Agree to Terms', action: 'agree_terms', color: '#4CAF50' }
      ],
      confirm_ready: [
        { label: 'Confirm Ready', action: 'confirm_ready', color: '#2196F3' }
      ],
      provide_shipping: [
        { label: 'Add Shipping Info', action: 'shipping', color: '#9C27B0' }
      ],
      confirm_receipt: [
        { label: 'Confirm Received', action: 'confirm_receipt', color: '#4CAF50' }
      ]
    };

    const availableActions = actions[nextAction.action] || [];

    return (
      <View style={styles.actionButtons}>
        {availableActions.map((action) => (
          <TouchableOpacity
            key={action.action}
            style={[styles.actionButton, { backgroundColor: action.color }]}
            onPress={() => onAction(action.action)}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="swap-horizontal" size={20} color="#FF6B6B" />
        <Text style={styles.headerTitle}>Trade Negotiation</Text>
      </View>

      {renderPhaseIndicator()}
      {renderEscrowStatus()}
      {renderActionButtons()}

      {proposal.proposerSelectedItems?.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>Items in Trade</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {proposal.proposerSelectedItems.map((item) => (
              <View key={item.id} style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{item.title}</Text>
              </View>
            ))}
          </ScrollView>
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
    margin: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  phaseIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  phaseItem: {
    alignItems: 'center',
    flex: 1,
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseIconCompleted: {
    backgroundColor: '#E8F5E9',
  },
  phaseIconCurrent: {
    backgroundColor: '#FFEBEE',
  },
  phaseIconPending: {
    backgroundColor: '#F5F5F5',
  },
  phaseLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  phaseLabelCurrent: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  phaseConnector: {
    position: 'absolute',
    top: 16,
    right: -8,
    width: 16,
    height: 2,
    backgroundColor: '#E8E8E8',
  },
  phaseConnectorCompleted: {
    backgroundColor: '#4CAF50',
  },
  escrowStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  escrowInfo: {
    flex: 1,
  },
  escrowTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  escrowState: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  escrowDetail: {
    fontSize: 11,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  itemsSectionTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  itemBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  itemBadgeText: {
    fontSize: 12,
    color: '#333',
  },
});
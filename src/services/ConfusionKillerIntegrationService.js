import { ConfusionKillerService } from './ConfusionKillerService';
import { SOPCompliantTradeService } from './SOPCompliantTradeService';
import { BilateralTradeConfirmationService } from './BilateralTradeConfirmationService';
import { UnifiedMessageService } from './UnifiedMessageService';

export class ConfusionKillerIntegrationService {
  
  // Integration helper to enhance existing ChatScreen components
  static async enhanceExistingChatScreen(conversationId, currentUserId) {
    try {
      console.log('🔄 Enhancing ChatScreen with Confusion Killer features');
      
      // Get current trade status
      const tradeStatus = await ConfusionKillerService.getTradeStatus(conversationId, currentUserId);
      
      // Check for any items that need lock status updates
      await this.syncItemLockStatuses(conversationId);
      
      // Validate any pending trade actions
      const validation = await ConfusionKillerService.validateTradeAction(
        conversationId, 
        'view_chat', 
        currentUserId
      );
      
      return {
        tradeStatus,
        validation,
        enhancementApplied: true
      };
      
    } catch (error) {
      console.error('❌ Error enhancing ChatScreen:', error);
      return {
        tradeStatus: null,
        validation: { valid: true },
        enhancementApplied: false,
        error: error.message
      };
    }
  }

  // Sync item lock statuses for all items in conversation
  static async syncItemLockStatuses(conversationId) {
    try {
      // This would be called to ensure all items have correct lock status
      console.log('🔄 Syncing item lock statuses for conversation:', conversationId);
      
      // Implementation would check all items mentioned in the conversation
      // and update their lock statuses appropriately
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error syncing item lock statuses:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper to determine which components to show based on message type
  static getComponentsForMessage(message, currentUserId, tradeStatus) {
    const components = {
      showTradeStatusBadge: false,
      showDynamicButtons: false,
      showValueMeter: false,
      showItemLockIndicator: false,
      showConfirmationStatus: false,
      showDeclineReasonModal: false,
      buttonConfig: null
    };

    // Trade proposal messages
    if (message.messageType === 'trade_proposal' || 
        (message.text && message.text.includes('Trade Proposal'))) {
      
      const isTarget = message.targetUserId === currentUserId;
      const isProposer = message.proposerUserId === currentUserId;
      
      if (isTarget && (!message.status || message.status === 'pending')) {
        components.showDynamicButtons = true;
        components.buttonConfig = {
          userRole: 'receiver',
          tradeState: 'proposed',
          proposalData: message
        };
      } else if (isProposer && (!message.status || message.status === 'pending')) {
        components.showDynamicButtons = true;
        components.buttonConfig = {
          userRole: 'proposer',
          tradeState: 'proposed',
          proposalData: message
        };
      }
      
      // Show value meter for all trade proposals
      if (message.proposerItemId && message.targetItemId) {
        components.showValueMeter = true;
      }
    }

    // Cash offer messages
    if (message.messageType === 'cash_offer' || 
        (message.text && message.text.includes('Cash Offer'))) {
      
      const isSeller = message.sellerId === currentUserId;
      
      if (isSeller && (!message.status || message.status === 'pending')) {
        components.showDynamicButtons = true;
        components.buttonConfig = {
          userRole: 'receiver',
          tradeState: 'cash_offered',
          proposalData: message
        };
      }
    }

    // Counter offer messages
    if (message.messageType === 'counter_offer') {
      const isTarget = message.targetUserId === currentUserId;
      
      if (isTarget && (!message.status || message.status === 'active')) {
        components.showDynamicButtons = true;
        components.buttonConfig = {
          userRole: 'receiver',
          tradeState: 'counter_offered',
          proposalData: message
        };
      }
    }

    // Bilateral confirmation messages
    if (message.messageType === 'bilateral_confirmation') {
      components.showConfirmationStatus = true;
    }

    // Show item lock indicators for any message with item IDs
    if (message.proposerItemId || message.targetItemId || message.itemId) {
      components.showItemLockIndicator = true;
    }

    return components;
  }

  // Helper to create enhanced message data for rendering
  static enhanceMessageForRendering(message, currentUserId, tradeStatus, itemLockStatuses = {}) {
    const enhanced = { ...message };
    
    // Add component configuration
    enhanced.components = this.getComponentsForMessage(message, currentUserId, tradeStatus);
    
    // Add lock status information
    if (message.proposerItemId && itemLockStatuses[message.proposerItemId]) {
      enhanced.proposerItemLockStatus = itemLockStatuses[message.proposerItemId];
    }
    
    if (message.targetItemId && itemLockStatuses[message.targetItemId]) {
      enhanced.targetItemLockStatus = itemLockStatuses[message.targetItemId];
    }
    
    // Add user role information
    enhanced.userRole = this.getUserRoleForMessage(message, currentUserId);
    
    // Add action availability
    enhanced.canTakeAction = this.canUserTakeAction(message, currentUserId, tradeStatus);
    
    return enhanced;
  }

  // Determine user's role in a message
  static getUserRoleForMessage(message, currentUserId) {
    if (message.proposerUserId === currentUserId) return 'proposer';
    if (message.targetUserId === currentUserId) return 'target';
    if (message.sellerId === currentUserId) return 'seller';
    if (message.buyerId === currentUserId) return 'buyer';
    if (message.senderId === currentUserId) return 'sender';
    return 'viewer';
  }

  // Check if user can take action on a message
  static canUserTakeAction(message, currentUserId, tradeStatus) {
    // User can't take action on their own proposals (except withdraw)
    if (message.proposerUserId === currentUserId || message.senderId === currentUserId) {
      return { canAct: true, actions: ['withdraw', 'browse_inventory'] };
    }
    
    // User can take action if they're the target and message is pending
    if ((message.targetUserId === currentUserId || message.sellerId === currentUserId) &&
        (!message.status || message.status === 'pending' || message.status === 'active')) {
      return { 
        canAct: true, 
        actions: ['accept', 'decline', 'counter', 'browse_inventory'] 
      };
    }
    
    return { canAct: false, actions: [] };
  }

  // Helper to create action handlers for enhanced messages
  static createActionHandlers(conversationId, currentUserId, navigation) {
    return {
      handleAccept: async (messageData) => {
        try {
          const validation = await ConfusionKillerService.validateTradeAction(
            conversationId, 
            'accept_proposal', 
            currentUserId,
            messageData
          );

          if (!validation.valid) {
            throw new Error(validation.errors.join('\n'));
          }

          // Proceed with acceptance logic
          return await this.processAcceptance(messageData, currentUserId);
          
        } catch (error) {
          throw new Error(`Failed to accept: ${error.message}`);
        }
      },

      handleDecline: async (messageData, reason, reasonText) => {
        try {
          // Process decline with reason
          return await this.processDeclineWithReason(
            conversationId, 
            messageData, 
            reason, 
            reasonText, 
            currentUserId
          );
          
        } catch (error) {
          throw new Error(`Failed to decline: ${error.message}`);
        }
      },

      handleCounter: async (messageData, counterTerms) => {
        try {
          // Process counter offer
          return await this.processCounterOffer(
            conversationId, 
            messageData, 
            counterTerms, 
            currentUserId
          );
          
        } catch (error) {
          throw new Error(`Failed to counter: ${error.message}`);
        }
      },

      handleWithdraw: async (messageData) => {
        try {
          // Process withdrawal
          return await this.processWithdrawal(conversationId, messageData, currentUserId);
          
        } catch (error) {
          throw new Error(`Failed to withdraw: ${error.message}`);
        }
      },

      handleBrowseInventory: () => {
        // Navigate to inventory browsing
        const otherUserId = this.getOtherUserId(conversationId, currentUserId);
        navigation.navigate('Profile', { 
          userId: otherUserId,
          mode: 'browse_inventory'
        });
      },

      handleSendNudge: async () => {
        try {
          const canNudge = await ConfusionKillerService.canSendNudge(conversationId, currentUserId);
          if (!canNudge.canNudge) {
            throw new Error(canNudge.reason);
          }

          await ConfusionKillerService.sendNudge(conversationId, currentUserId, 'general');
          return { success: true, message: 'Nudge sent successfully' };
          
        } catch (error) {
          throw new Error(`Failed to send nudge: ${error.message}`);
        }
      }
    };
  }

  // Process acceptance with SOP compliance
  static async processAcceptance(messageData, currentUserId) {
    try {
      // Check for simultaneous accepts
      const simultaneousCheck = await ConfusionKillerService.handleSimultaneousAccept(
        messageData.conversationId, 
        currentUserId, 
        messageData.tradeProposalId || messageData.id
      );

      if (!simultaneousCheck.success) {
        throw new Error(simultaneousCheck.reason);
      }

      // Use SOP compliant service for acceptance
      const result = await SOPCompliantTradeService.handleProposalResponse(
        messageData.conversationId,
        'ACCEPT',
        messageData,
        currentUserId
      );

      return result;
      
    } catch (error) {
      console.error('❌ Error processing acceptance:', error);
      throw error;
    }
  }

  // Process decline with reason
  static async processDeclineWithReason(conversationId, messageData, reason, reasonText, currentUserId) {
    try {
      // Update message status
      await UnifiedMessageService.updateMessageStatus(
        messageData.id,
        'declined',
        {
          declinedBy: currentUserId,
          declineReason: reason,
          declineReasonText: reasonText
        }
      );

      // Send enhanced decline message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        `❌ Trade proposal declined.\n\nReason: ${reasonText}\n\n${reason === 'need_more_cash' ? '💡 Consider adjusting your offer based on this feedback.' : ''}`,
        'trade_declined',
        'declined',
        {
          declineReason: reason,
          declineReasonText: reasonText,
          hasActionButtons: true,
          actionButtonText: 'Make New Offer'
        }
      );

      // Sync inventory after decline
      if (messageData.proposerItemId) {
        await ConfusionKillerService.syncInventoryAfterTrade(messageData.proposerItemId, 'available');
      }
      if (messageData.targetItemId) {
        await ConfusionKillerService.syncInventoryAfterTrade(messageData.targetItemId, 'available');
      }

      return { success: true, message: 'Proposal declined with reason' };
      
    } catch (error) {
      console.error('❌ Error processing decline:', error);
      throw error;
    }
  }

  // Process counter offer
  static async processCounterOffer(conversationId, messageData, counterTerms, currentUserId) {
    try {
      // Implementation for counter offer processing
      console.log('🔄 Processing counter offer:', { conversationId, messageData, counterTerms });
      
      // This would integrate with existing counter offer services
      return { success: true, message: 'Counter offer sent' };
      
    } catch (error) {
      console.error('❌ Error processing counter offer:', error);
      throw error;
    }
  }

  // Process withdrawal
  static async processWithdrawal(conversationId, messageData, currentUserId) {
    try {
      // Update message status to withdrawn
      await UnifiedMessageService.updateMessageStatus(
        messageData.id,
        'withdrawn',
        { withdrawnBy: currentUserId }
      );

      // Release item locks
      if (messageData.proposerItemId) {
        await ConfusionKillerService.syncInventoryAfterTrade(messageData.proposerItemId, 'available');
      }
      if (messageData.targetItemId) {
        await ConfusionKillerService.syncInventoryAfterTrade(messageData.targetItemId, 'available');
      }

      // Send withdrawal message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        '↩️ Trade proposal has been withdrawn by the proposer.',
        'proposal_withdrawn',
        'withdrawn',
        {
          withdrawnBy: currentUserId,
          hasActionButtons: false
        }
      );

      return { success: true, message: 'Proposal withdrawn' };
      
    } catch (error) {
      console.error('❌ Error processing withdrawal:', error);
      throw error;
    }
  }

  // Helper to get other user ID from conversation
  static getOtherUserId(conversationId, currentUserId) {
    const parts = conversationId.split('_');
    return parts.find(id => id !== currentUserId) || parts[0];
  }

  // Migration helper to update existing ChatScreen
  static getMigrationInstructions() {
    return {
      imports: [
        "import { TradeStatusBadge } from '../components/TradeStatusBadge';",
        "import { DynamicTradeButtons } from '../components/DynamicTradeButtons';",
        "import { ItemLockIndicator } from '../components/ItemLockIndicator';",
        "import { ValueMeter } from '../components/ValueMeter';",
        "import { DeclineReasonModal } from '../components/DeclineReasonModal';",
        "import { TradeTray } from '../components/TradeTray';",
        "import { OfflineQRFallback } from '../components/OfflineQRFallback';",
        "import { WhatsNextFooter } from '../components/WhatsNextFooter';",
        "import { TradeConfirmationStatus } from '../components/TradeConfirmationStatus';",
        "import { ConfusionKillerService } from '../services/ConfusionKillerService';",
        "import { ConfusionKillerIntegrationService } from '../services/ConfusionKillerIntegrationService';"
      ],
      stateAdditions: [
        "const [tradeStatus, setTradeStatus] = useState(null);",
        "const [showDeclineModal, setShowDeclineModal] = useState(false);",
        "const [declineProposalData, setDeclineProposalData] = useState(null);",
        "const [itemLockStatus, setItemLockStatus] = useState({});",
        "const [canSendNudge, setCanSendNudge] = useState(false);"
      ],
      useEffectAdditions: [
        `// Load trade status and confusion killer features
        useEffect(() => {
          const loadEnhancements = async () => {
            const enhancement = await ConfusionKillerIntegrationService.enhanceExistingChatScreen(
              conversationId, 
              user.uid
            );
            setTradeStatus(enhancement.tradeStatus);
          };
          loadEnhancements();
        }, [conversationId, user.uid, messages]);`
      ],
      renderEnhancements: [
        "// Replace static buttons with DynamicTradeButtons",
        "// Add TradeStatusBadge to header",
        "// Add ValueMeter to trade proposals",
        "// Add ItemLockIndicator for locked items",
        "// Add WhatsNextFooter at bottom",
        "// Replace decline handling with DeclineReasonModal"
      ]
    };
  }
}
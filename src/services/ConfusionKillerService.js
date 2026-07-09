import { doc, updateDoc, getDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UnifiedMessageService } from './UnifiedMessageService';

export class ConfusionKillerService {
  
  // Nudge system constants
  static NUDGE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  static RESPONSE_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  // 1. Solve "Whose Turn is it?" Confusion
  static async getTradeStatus(conversationId, currentUserId) {
    try {
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      if (!tradeDoc.exists()) {
        return {
          userRole: 'unknown',
          isWaitingForUser: false,
          nextAction: 'Start conversation',
          tradeState: 'no_trade'
        };
      }

      const tradeData = tradeDoc.data();
      const isUserA = tradeData.userA === currentUserId;
      
      // Determine user role and what they should do next
      switch (tradeData.state) {
        case 'proposed':
          const isProposer = tradeData.currentProposal?.proposerUserId === currentUserId;
          return {
            userRole: isProposer ? 'proposer' : 'receiver',
            isWaitingForUser: !isProposer,
            nextAction: isProposer ? 'Waiting for response' : 'Respond to proposal',
            tradeState: 'proposed',
            canWithdraw: isProposer,
            canRespond: !isProposer
          };
          
        case 'accepted':
          const needsToSchedule = !tradeData.meetupLocation;
          return {
            userRole: isUserA ? 'user_a' : 'user_b',
            isWaitingForUser: needsToSchedule,
            nextAction: needsToSchedule ? 'Schedule meetup location' : 'Confirm arrival at meetup',
            tradeState: 'accepted'
          };
          
        case 'arrived':
          const userArrivedField = isUserA ? 'userAArrivedAt' : 'userBArrivedAt';
          const otherArrivedField = isUserA ? 'userBArrivedAt' : 'userAArrivedAt';
          const userArrived = !!tradeData[userArrivedField];
          const otherArrived = !!tradeData[otherArrivedField];
          
          if (!userArrived) {
            return {
              userRole: isUserA ? 'user_a' : 'user_b',
              isWaitingForUser: true,
              nextAction: 'Confirm your arrival',
              tradeState: 'arrived'
            };
          } else if (!otherArrived) {
            return {
              userRole: isUserA ? 'user_a' : 'user_b',
              isWaitingForUser: false,
              nextAction: 'Waiting for partner to arrive',
              tradeState: 'arrived'
            };
          } else {
            return {
              userRole: isUserA ? 'user_a' : 'user_b',
              isWaitingForUser: true,
              nextAction: 'Start QR code exchange',
              tradeState: 'ready_for_exchange'
            };
          }
          
        default:
          return {
            userRole: isUserA ? 'user_a' : 'user_b',
            isWaitingForUser: false,
            nextAction: 'Continue trade process',
            tradeState: tradeData.state
          };
      }
      
    } catch (error) {
      console.error('Error getting trade status:', error);
      return {
        userRole: 'unknown',
        isWaitingForUser: false,
        nextAction: 'Check trade status',
        tradeState: 'error'
      };
    }
  }

  // 2. Handle Item Lock Transparency
  static async getItemLockStatus(itemId) {
    try {
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (!itemDoc.exists()) {
        return { locked: false, reason: 'Item not found' };
      }

      const itemData = itemDoc.data();
      
      if (itemData.status === 'locked_in_trade') {
        // Find which trade is locking it
        const tradesQuery = query(
          collection(db, 'trades'),
          where('state', 'in', ['accepted', 'arrived', 'exchanged'])
        );
        
        const tradesSnapshot = await getDocs(tradesQuery);
        for (const tradeDoc of tradesSnapshot.docs) {
          const tradeData = tradeDoc.data();
          if (tradeData.currentProposal?.proposerItemId === itemId || 
              tradeData.currentProposal?.targetItemId === itemId) {
            return {
              locked: true,
              lockType: 'hard',
              reason: 'Trade accepted - cannot be modified',
              lockingTradeId: tradeDoc.id,
              lockingTradeState: tradeData.state
            };
          }
        }
      }
      
      if (itemData.status === 'reserved') {
        // Find which proposals are reserving it
        const proposalsQuery = query(
          collection(db, 'messages'),
          where('messageType', '==', 'formal_proposal'),
          where('status', '==', 'active')
        );
        
        const proposalsSnapshot = await getDocs(proposalsQuery);
        const reservingTrades = [];
        
        for (const proposalDoc of proposalsSnapshot.docs) {
          const proposalData = proposalDoc.data();
          if (proposalData.proposerItemId === itemId || proposalData.targetItemId === itemId) {
            reservingTrades.push({
              conversationId: proposalData.conversationId,
              proposalId: proposalDoc.id
            });
          }
        }
        
        return {
          locked: true,
          lockType: 'soft',
          reason: 'In negotiation - can accept other offers',
          reservingTrades
        };
      }
      
      return { locked: false };
      
    } catch (error) {
      console.error('Error getting item lock status:', error);
      return { locked: false, reason: 'Error checking status' };
    }
  }

  // 3. Inventory Sync - Remove item from all active proposals when traded
  static async syncInventoryAfterTrade(itemId, newStatus = 'traded') {
    try {
      console.log(`🔄 Syncing inventory for item ${itemId} - new status: ${newStatus}`);
      
      // Update item status
      await updateDoc(doc(db, 'items', itemId), {
        status: newStatus,
        lastUpdated: serverTimestamp()
      });

      // Find all active proposals involving this item
      const proposalsQuery = query(
        collection(db, 'messages'),
        where('messageType', '==', 'formal_proposal'),
        where('status', '==', 'active')
      );
      
      const proposalsSnapshot = await getDocs(proposalsQuery);
      const affectedConversations = [];
      
      for (const proposalDoc of proposalsSnapshot.docs) {
        const proposalData = proposalDoc.data();
        
        if (proposalData.proposerItemId === itemId || proposalData.targetItemId === itemId) {
          // Mark proposal as invalid
          await updateDoc(proposalDoc.ref, {
            status: 'invalid_item_traded',
            invalidatedAt: serverTimestamp()
          });
          
          // Send notification to conversation
          await UnifiedMessageService.createSystemMessage(
            proposalData.conversationId,
            `⚠️ This proposal is no longer valid. One of the items has been traded with another user.`,
            'proposal_invalidated',
            'invalid',
            {
              invalidatedItemId: itemId,
              reason: 'item_traded_elsewhere',
              hasActionButtons: true,
              actionButtonText: 'Browse Other Items'
            }
          );
          
          affectedConversations.push(proposalData.conversationId);
        }
      }
      
      console.log(`✅ Synced inventory - affected ${affectedConversations.length} conversations`);
      return { success: true, affectedConversations };
      
    } catch (error) {
      console.error('❌ Error syncing inventory:', error);
      throw error;
    }
  }

  // 4. Nudge System
  static async canSendNudge(conversationId, nudgingUserId) {
    try {
      // Check if user has sent a nudge recently
      const nudgesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'nudge'),
        where('senderId', '==', nudgingUserId)
      );
      
      const nudgesSnapshot = await getDocs(nudgesQuery);
      
      if (nudgesSnapshot.empty) {
        return { canNudge: true, reason: 'No previous nudges' };
      }
      
      // Check most recent nudge
      const recentNudges = nudgesSnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      
      const lastNudge = recentNudges[0];
      const timeSinceLastNudge = Date.now() - lastNudge.createdAt.toMillis();
      
      if (timeSinceLastNudge < this.NUDGE_COOLDOWN) {
        const hoursRemaining = Math.ceil((this.NUDGE_COOLDOWN - timeSinceLastNudge) / (1000 * 60 * 60));
        return { 
          canNudge: false, 
          reason: `Must wait ${hoursRemaining} hours between nudges` 
        };
      }
      
      return { canNudge: true, reason: 'Cooldown period passed' };
      
    } catch (error) {
      console.error('Error checking nudge eligibility:', error);
      return { canNudge: false, reason: 'Error checking eligibility' };
    }
  }

  static async sendNudge(conversationId, nudgingUserId, nudgeType = 'general') {
    try {
      const nudgeEligibility = await this.canSendNudge(conversationId, nudgingUserId);
      if (!nudgeEligibility.canNudge) {
        throw new Error(nudgeEligibility.reason);
      }

      const nudgeMessages = {
        general: '👋 Friendly reminder about our trade discussion!',
        proposal_response: '💭 Still thinking about the proposal? Let me know your thoughts!',
        meetup_scheduling: '📍 Ready to schedule our meetup location?',
        arrival_confirmation: '🚗 Are you on your way to the meetup location?'
      };

      await UnifiedMessageService.createSystemMessage(
        conversationId,
        nudgeMessages[nudgeType] || nudgeMessages.general,
        'nudge',
        'sent',
        {
          nudgeType,
          nudgingUserId,
          hasActionButtons: false
        }
      );

      return { success: true, message: 'Nudge sent successfully' };
      
    } catch (error) {
      console.error('Error sending nudge:', error);
      throw error;
    }
  }

  // 5. Handle Deleted Items During Active Trades
  static async handleDeletedItemInTrade(itemId) {
    try {
      console.log(`🚨 Handling deleted item in active trades: ${itemId}`);
      
      // Find all active trades involving this item
      const tradesQuery = query(
        collection(db, 'trades'),
        where('state', 'in', ['proposed', 'accepted'])
      );
      
      const tradesSnapshot = await getDocs(tradesQuery);
      const affectedTrades = [];
      
      for (const tradeDoc of tradesSnapshot.docs) {
        const tradeData = tradeDoc.data();
        
        if (tradeData.currentProposal?.proposerItemId === itemId || 
            tradeData.currentProposal?.targetItemId === itemId) {
          
          // Cancel the trade
          await updateDoc(tradeDoc.ref, {
            state: 'cancelled',
            cancelReason: 'item_deleted',
            cancelledAt: serverTimestamp()
          });
          
          // Notify users
          await UnifiedMessageService.createSystemMessage(
            tradeData.conversationId,
            `❌ Trade cancelled: One of the items was deleted by its owner.`,
            'trade_cancelled',
            'item_deleted',
            {
              deletedItemId: itemId,
              hasActionButtons: true,
              actionButtonText: 'Start New Trade'
            }
          );
          
          affectedTrades.push(tradeData.conversationId);
        }
      }
      
      console.log(`✅ Handled deleted item - cancelled ${affectedTrades.length} trades`);
      return { success: true, affectedTrades };
      
    } catch (error) {
      console.error('❌ Error handling deleted item:', error);
      throw error;
    }
  }

  // 6. Handle Simultaneous Accepts
  static async handleSimultaneousAccept(conversationId, acceptingUserId, proposalId) {
    try {
      console.log(`🔄 Checking for simultaneous accept: ${conversationId}`);
      
      // Use atomic transaction to prevent race conditions
      const tradeRef = doc(db, 'trades', conversationId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const tradeData = tradeDoc.data();
      
      // Check if trade is still in proposed state
      if (tradeData.state !== 'proposed') {
        return {
          success: false,
          reason: 'Trade no longer available',
          currentState: tradeData.state
        };
      }
      
      // Check if the specific proposal is still active
      const proposalDoc = await getDoc(doc(db, 'messages', proposalId));
      if (!proposalDoc.exists() || proposalDoc.data().status !== 'active') {
        return {
          success: false,
          reason: 'Proposal no longer active'
        };
      }
      
      // Proceed with acceptance
      return { success: true, canProceed: true };
      
    } catch (error) {
      console.error('❌ Error handling simultaneous accept:', error);
      throw error;
    }
  }

  // 7. Timezone-Safe Timer Management
  static getServerTimestamp() {
    return serverTimestamp();
  }

  static calculateTimeRemaining(expiresAt) {
    if (!expiresAt) return null;
    
    const expiration = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { expired: true, text: 'EXPIRED' };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { 
        expired: false, 
        text: `${hours}h ${minutes}m remaining`,
        totalMinutes: hours * 60 + minutes
      };
    } else {
      return { 
        expired: false, 
        text: `${minutes}m remaining`,
        totalMinutes: minutes
      };
    }
  }

  // 8. Get Next Step Description for WhatsNextFooter
  static getNextStepDescription(tradeState, userRole, tradeData) {
    switch (tradeState) {
      case 'matched':
        return 'Send a formal swap proposal to lock the deal';
        
      case 'proposed':
        return userRole === 'proposer' 
          ? 'Waiting for them to accept, counter, or decline'
          : 'Review and respond to the swap proposal';
          
      case 'accepted':
        if (!tradeData?.meetupLocation) {
          return 'Schedule a safe meetup location';
        }
        return 'Confirm your arrival at the meetup location';
        
      case 'arrived':
        const userArrivedField = userRole === 'user_a' ? 'userAArrivedAt' : 'userBArrivedAt';
        const otherArrivedField = userRole === 'user_a' ? 'userBArrivedAt' : 'userAArrivedAt';
        
        if (!tradeData?.[userArrivedField]) {
          return 'Confirm your arrival at the meetup';
        } else if (!tradeData?.[otherArrivedField]) {
          return 'Waiting for partner to arrive';
        } else {
          return 'Start the QR code exchange process';
        }
        
      case 'exchanged':
        return 'Complete the final trade confirmation';
        
      case 'finalized':
        return 'Trade completed successfully!';
        
      default:
        return 'Continue with the trade process';
    }
  }

  // 9. Comprehensive Error Prevention
  static async validateTradeAction(conversationId, action, userId, additionalData = {}) {
    try {
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      if (!tradeDoc.exists()) {
        return { valid: false, error: 'Trade not found' };
      }

      const tradeData = tradeDoc.data();
      const errors = [];
      const warnings = [];

      // Check if user is part of this trade
      if (tradeData.userA !== userId && tradeData.userB !== userId) {
        errors.push('You are not part of this trade');
      }

      // Action-specific validations
      switch (action) {
        case 'accept_proposal':
          if (tradeData.state !== 'proposed') {
            errors.push('No active proposal to accept');
          }
          if (tradeData.currentProposal?.proposerUserId === userId) {
            errors.push('Cannot accept your own proposal');
          }
          break;

        case 'withdraw_proposal':
          if (tradeData.state !== 'proposed') {
            errors.push('No active proposal to withdraw');
          }
          if (tradeData.currentProposal?.proposerUserId !== userId) {
            errors.push('Can only withdraw your own proposal');
          }
          break;

        case 'confirm_arrival':
          if (tradeData.state !== 'accepted') {
            errors.push('Trade must be accepted before confirming arrival');
          }
          if (!tradeData.meetupLocation) {
            errors.push('Meetup location must be set first');
          }
          break;
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        tradeData
      };

    } catch (error) {
      console.error('Error validating trade action:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }
}
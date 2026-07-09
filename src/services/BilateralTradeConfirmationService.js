import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UnifiedMessageService } from './UnifiedMessageService';
import { ItemArchiveService } from './ItemArchiveService';

export class BilateralTradeConfirmationService {
  
  // Trade step states
  static STEP_STATES = {
    PENDING: 'pending',
    USER_A_CONFIRMED: 'user_a_confirmed',
    USER_B_CONFIRMED: 'user_b_confirmed', 
    BOTH_CONFIRMED: 'both_confirmed',
    COMPLETED: 'completed'
  };

  // Trade steps that require bilateral confirmation
  static TRADE_STEPS = {
    SELLER_COMMIT: 'seller_commit',
    CONTACT_EXCHANGE: 'contact_exchange',
    MEETING_ARRANGED: 'meeting_arranged',
    EXCHANGE_STARTED: 'exchange_started',
    TRADE_COMPLETED: 'trade_completed'
  };

  // Confirmation timeframes (in hours)
  static CONFIRMATION_TIMEFRAMES = {
    SELLER_COMMIT: 24, // 24 hours to commit to trade
    CONTACT_EXCHANGE: 2, // 2 hours to exchange contact info
    MEETING_ARRANGED: 24, // 24 hours to arrange meeting
    EXCHANGE_STARTED: 1, // 1 hour to confirm exchange started
    TRADE_COMPLETED: 2 // 2 hours to confirm completion
  };

  // Confirm a trade step for one user
  static async confirmTradeStep(conversationId, step, userId, confirmationData = {}) {
    try {
      console.log(`🔄 User ${userId} confirming step: ${step}`);
      
      // Get or create step confirmation document
      const stepDocId = `${conversationId}_${step}`;
      const stepRef = doc(db, 'tradeStepConfirmations', stepDocId);
      const stepDoc = await getDoc(stepRef);
      
      let stepData = {};
      if (stepDoc.exists()) {
        stepData = stepDoc.data();
      }
      
      // Determine user roles (A or B based on order in conversation ID)
      const conversationParts = conversationId.split('_');
      const userA = conversationParts[0];
      const userB = conversationParts[1];
      
      const isUserA = userId === userA;
      const confirmationField = isUserA ? 'userAConfirmed' : 'userBConfirmed';
      const confirmationTimeField = isUserA ? 'userAConfirmedAt' : 'userBConfirmedAt';
      const confirmationDataField = isUserA ? 'userAData' : 'userBData';
      
      // Update step confirmation
      const updateData = {
        conversationId,
        step,
        [confirmationField]: true,
        [confirmationTimeField]: serverTimestamp(),
        [confirmationDataField]: confirmationData,
        lastUpdated: serverTimestamp()
      };
      
      // Check if this is the first confirmation for this step
      if (!stepDoc.exists()) {
        updateData.createdAt = serverTimestamp();
        updateData.userA = userA;
        updateData.userB = userB;
        updateData.userAConfirmed = isUserA;
        updateData.userBConfirmed = !isUserA;
        updateData.expiresAt = this.getExpirationTime(step);
        
        // Use setDoc for new documents
        await setDoc(stepRef, updateData);
      } else {
        // Use updateDoc for existing documents
        await updateDoc(stepRef, updateData);
      }
      
      // Check if both users have now confirmed
      const updatedStepDoc = await getDoc(stepRef);
      const updatedStepData = updatedStepDoc.data();
      
      const bothConfirmed = updatedStepData.userAConfirmed && updatedStepData.userBConfirmed;
      
      if (bothConfirmed) {
        // Both users confirmed - proceed to next step
        await this.handleBothUsersConfirmed(conversationId, step, updatedStepData);
        
        return {
          success: true,
          bothConfirmed: true,
          nextStep: this.getNextStep(step),
          message: 'Both parties confirmed! Proceeding to next step.'
        };
      } else {
        // Only one user confirmed - send personalized messages
        await this.sendPersonalizedConfirmationMessages(conversationId, step, userId, isUserA ? userB : userA, updatedStepData);
        
        return {
          success: true,
          bothConfirmed: false,
          waitingFor: isUserA ? userB : userA,
          message: 'Your confirmation recorded. Waiting for other party.'
        };
      }
      
    } catch (error) {
      console.error('❌ Error confirming trade step:', error);
      throw error;
    }
  }

  // Handle when both users have confirmed a step
  static async handleBothUsersConfirmed(conversationId, step, stepData) {
    try {
      console.log(`✅ Both users confirmed step: ${step}`);
      
      // Update the counter-offer message with new trade stage
      const nextStage = this.getNextTradeStage(step);
      
      if (nextStage) {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          where('messageType', '==', 'counter_offer'),
          where('status', '==', 'accepted')
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        if (!messagesSnapshot.empty) {
          const messageDoc = messagesSnapshot.docs[0];
          await updateDoc(doc(db, 'messages', messageDoc.id), {
            tradeStage: nextStage,
            lastStageUpdate: serverTimestamp(),
            [`${step}ConfirmedAt`]: serverTimestamp()
          });
        }
      }
      
      // CRITICAL FIX: Automatically progress to next step when both parties confirm
      const nextStep = this.getNextStep(step);
      if (nextStep) {
        console.log(`🚀 Auto-progressing to next step: ${nextStep}`);
        
        // Update all relevant trade messages to unlock next step
        const allTradeMessagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          where('messageType', 'in', ['counter_offer', 'trade_proposal'])
        );
        
        const allTradeMessages = await getDocs(allTradeMessagesQuery);
        const updatePromises = allTradeMessages.docs.map(messageDoc => {
          return updateDoc(doc(db, 'messages', messageDoc.id), {
            [`${step}Completed`]: true,
            [`${step}CompletedAt`]: serverTimestamp(),
            currentStep: nextStep,
            stepUnlocked: true,
            lastProgressUpdate: serverTimestamp()
          });
        });
        
        await Promise.all(updatePromises);
        console.log(`✅ Trade messages updated to unlock ${nextStep}`);
      }
      
      // Send confirmation message to chat with next step info
      await this.sendBothConfirmedMessage(conversationId, step, nextStep);
      
      // Handle special cases
      if (step === this.TRADE_STEPS.TRADE_COMPLETED) {
        await this.handleTradeCompletion(conversationId, stepData);
      }
      
    } catch (error) {
      console.error('❌ Error handling both users confirmed:', error);
    }
  }

  // Send personalized messages to both users about confirmation status
  static async sendPersonalizedConfirmationMessages(conversationId, step, confirmingUserId, waitingUserId, stepData) {
    const stepName = this.getStepDisplayName(step);
    const timeframe = this.CONFIRMATION_TIMEFRAMES[step.toUpperCase()] || 24;
    const expirationTime = this.formatExpirationTime(stepData.expiresAt);
    
    // Special handling for contact exchange - show the actual contact info
    if (step === this.TRADE_STEPS.CONTACT_EXCHANGE && stepData.userAData && stepData.userBData) {
      const confirmingUserData = stepData.userA === confirmingUserId ? stepData.userAData : stepData.userBData;
      
      // Create a visible contact sharing message
      let contactMessage = `📞 Contact Information Shared:\n\n`;
      
      if (confirmingUserData.phoneNumber) {
        contactMessage += `📱 Phone: ${confirmingUserData.phoneNumber}\n`;
      }
      
      if (confirmingUserData.email) {
        contactMessage += `📧 Email: ${confirmingUserData.email}\n`;
      }
      
      if (confirmingUserData.preferredContact) {
        contactMessage += `⭐ Preferred: ${confirmingUserData.preferredContact}\n`;
      }
      
      if (confirmingUserData.additionalNotes) {
        contactMessage += `📝 Notes: ${confirmingUserData.additionalNotes}\n`;
      }
      
      // Send the contact info as a visible message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        contactMessage,
        'contact_shared',
        'contact_info',
        {
          step,
          contactData: confirmingUserData,
          sharedBy: confirmingUserId,
          hasActionButtons: false,
          isVisible: true
        }
      );
    }
    
    // Message for user who just confirmed
    const confirmedText = `✅ You confirmed: ${stepName}\n\n⏳ Waiting for other party to confirm.\n\n⚠️ This step expires ${expirationTime}`;
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      confirmedText,
      'bilateral_confirmation',
      'user_confirmed',
      {
        step,
        confirmingUserId,
        waitingUserId,
        userRole: 'confirmed',
        expiresAt: stepData.expiresAt,
        hasActionButtons: false
      }
    );
    
    // Message for user who needs to confirm
    const needsActionText = `🔔 ACTION REQUIRED: Please confirm ${stepName}\n\n⏰ You have ${timeframe} hours to confirm this step.\n\n⚠️ Expires ${expirationTime}`;
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      needsActionText,
      'bilateral_confirmation',
      'action_required',
      {
        step,
        confirmingUserId,
        waitingUserId,
        userRole: 'needs_action',
        expiresAt: stepData.expiresAt,
        hasActionButtons: true,
        actionButtonText: `Confirm ${stepName}`
      }
    );
  }

  // Send message when both parties have confirmed
  static async sendBothConfirmedMessage(conversationId, step, nextStep = null) {
    const stepName = this.getStepDisplayName(step);
    const calculatedNextStep = nextStep || this.getNextStep(step);
    
    let text = `✅ Both parties confirmed: ${stepName}`;
    
    if (calculatedNextStep) {
      const nextStepName = this.getStepDisplayName(calculatedNextStep);
      text += `\n\n🚀 NEXT STEP UNLOCKED: ${nextStepName}`;
      text += `\n\n💡 You can now proceed to the next step in your trade.`;
    } else {
      text += '\n\n🎉 Trade completed successfully!';
    }
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      text,
      'bilateral_confirmation',
      'both_confirmed',
      {
        step,
        nextStep: calculatedNextStep,
        stepCompleted: true,
        nextStepUnlocked: !!calculatedNextStep,
        hasActionButtons: false
      }
    );
  }

  // Handle complete trade completion (archive items, etc.)
  static async handleTradeCompletion(conversationId, stepData) {
    try {
      console.log('🎉 Handling complete trade completion');
      
      // Get the original trade proposal to find item IDs
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', 'in', ['trade_proposal', 'counter_offer'])
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      if (!messagesSnapshot.empty) {
        const tradeMessage = messagesSnapshot.docs[0].data();
        const itemIds = [];
        
        // Collect all item IDs from the trade
        if (tradeMessage.proposerItemId) {
          itemIds.push(tradeMessage.proposerItemId);
        }
        if (tradeMessage.targetItemId) {
          itemIds.push(tradeMessage.targetItemId);
        }
        
        // Archive all trade items using the new service
        if (itemIds.length > 0) {
          const tradeDetails = {
            conversationId,
            tradeType: tradeMessage.messageType,
            completedAt: new Date(),
            participants: [stepData.userA, stepData.userB]
          };
          
          await ItemArchiveService.archiveTradeItems(itemIds, tradeDetails);
          console.log(`✅ ${itemIds.length} items archived after trade completion`);
        }
      }
      
      // Send final completion message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        '🎉 Trade completed successfully!\n\n✅ Items have been archived and removed from listings.\n\n📚 You can view your trade history in your profile.\n\nThank you for using SwipeIt!',
        'trade_completion',
        'completed',
        {
          completedAt: serverTimestamp(),
          hasActionButtons: false,
          isTradeComplete: true
        }
      );
      
    } catch (error) {
      console.error('❌ Error handling trade completion:', error);
    }
  }

  // Get next trade stage based on completed step
  static getNextTradeStage(completedStep) {
    switch (completedStep) {
      case this.TRADE_STEPS.SELLER_COMMIT:
        return 'both_committed';
      case this.TRADE_STEPS.CONTACT_EXCHANGE:
        return 'contact_exchanged';
      case this.TRADE_STEPS.MEETING_ARRANGED:
        return 'meeting_arranged';
      case this.TRADE_STEPS.EXCHANGE_STARTED:
        return 'exchange_in_progress';
      case this.TRADE_STEPS.TRADE_COMPLETED:
        return 'completed';
      default:
        return null;
    }
  }

  // Get next step in sequence
  static getNextStep(currentStep) {
    const steps = [
      this.TRADE_STEPS.SELLER_COMMIT,
      this.TRADE_STEPS.CONTACT_EXCHANGE,
      this.TRADE_STEPS.MEETING_ARRANGED,
      this.TRADE_STEPS.EXCHANGE_STARTED,
      this.TRADE_STEPS.TRADE_COMPLETED
    ];
    
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  }

  // Get expiration time for a step
  static getExpirationTime(step) {
    const hours = this.CONFIRMATION_TIMEFRAMES[step.toUpperCase()] || 24;
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + hours);
    // Convert to Firestore Timestamp to avoid Firebase errors
    return serverTimestamp();
  }

  // Format expiration time for display
  static formatExpirationTime(expiresAt) {
    if (!expiresAt) return 'soon';
    
    const expiration = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) {
      return 'EXPIRED';
    } else if (diffHours === 1) {
      return 'in 1 hour';
    } else if (diffHours < 24) {
      return `in ${diffHours} hours`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return diffDays === 1 ? 'in 1 day' : `in ${diffDays} days`;
    }
  }

  // Check if a step has expired
  static isStepExpired(expiresAt) {
    if (!expiresAt) return false;
    
    const expiration = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return new Date() > expiration;
  }

  // Handle expired confirmations
  static async handleExpiredConfirmation(conversationId, step) {
    const stepName = this.getStepDisplayName(step);
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      `⚠️ EXPIRED: ${stepName} confirmation period has ended.\n\nThe trade may need to be restarted or cancelled.`,
      'bilateral_confirmation',
      'expired',
      {
        step,
        expiredAt: serverTimestamp(),
        hasActionButtons: true,
        actionButtonText: 'Restart Trade'
      }
    );
  }

  // Get display name for step
  static getStepDisplayName(step) {
    switch (step) {
      case this.TRADE_STEPS.SELLER_COMMIT:
        return 'Trade Commitment';
      case this.TRADE_STEPS.CONTACT_EXCHANGE:
        return 'Contact Information Exchange';
      case this.TRADE_STEPS.MEETING_ARRANGED:
        return 'Meeting Location Arranged';
      case this.TRADE_STEPS.EXCHANGE_STARTED:
        return 'Physical Exchange Started';
      case this.TRADE_STEPS.TRADE_COMPLETED:
        return 'Trade Completed';
      default:
        return 'Unknown Step';
    }
  }

  // Check if both parties have confirmed seller commit and unlock contact exchange
  static async checkAndUnlockContactExchange(conversationId) {
    try {
      const sellerCommitStatus = await this.getStepConfirmationStatus(
        conversationId, 
        this.TRADE_STEPS.SELLER_COMMIT
      );
      
      if (sellerCommitStatus.bothConfirmed) {
        console.log('✅ Both parties committed - contact exchange should be unlocked');
        
        // Update all trade messages to show contact exchange is available
        const tradeMessagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          where('messageType', 'in', ['counter_offer', 'trade_proposal'])
        );
        
        const tradeMessages = await getDocs(tradeMessagesQuery);
        const updatePromises = tradeMessages.docs.map(messageDoc => {
          return updateDoc(doc(db, 'messages', messageDoc.id), {
            sellerCommitCompleted: true,
            contactExchangeUnlocked: true,
            currentStep: this.TRADE_STEPS.CONTACT_EXCHANGE,
            tradeStage: 'both_committed',
            lastProgressUpdate: serverTimestamp()
          });
        });
        
        await Promise.all(updatePromises);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error checking seller commit status:', error);
      return false;
    }
  }

  // Check if user can proceed to next step (both parties must confirm current step)
  static async canProceedToNextStep(conversationId, currentStep) {
    try {
      const stepDocId = `${conversationId}_${currentStep}`;
      const stepRef = doc(db, 'tradeStepConfirmations', stepDocId);
      const stepDoc = await getDoc(stepRef);
      
      if (!stepDoc.exists()) {
        return false;
      }
      
      const stepData = stepDoc.data();
      
      // Check if expired
      if (this.isStepExpired(stepData.expiresAt)) {
        await this.handleExpiredConfirmation(conversationId, currentStep);
        return false;
      }
      
      return stepData.userAConfirmed && stepData.userBConfirmed;
      
    } catch (error) {
      console.error('❌ Error checking step confirmation:', error);
      return false;
    }
  }

  // Get confirmation status for a step with user-specific information
  static async getStepConfirmationStatus(conversationId, step, currentUserId = null) {
    try {
      const stepDocId = `${conversationId}_${step}`;
      const stepRef = doc(db, 'tradeStepConfirmations', stepDocId);
      const stepDoc = await getDoc(stepRef);
      
      if (!stepDoc.exists()) {
        return {
          userAConfirmed: false,
          userBConfirmed: false,
          bothConfirmed: false,
          expired: false,
          timeRemaining: null,
          userNeedsAction: currentUserId ? true : null
        };
      }
      
      const stepData = stepDoc.data();
      const expired = this.isStepExpired(stepData.expiresAt);
      const bothConfirmed = (stepData.userAConfirmed && stepData.userBConfirmed) || false;
      
      let userNeedsAction = null;
      if (currentUserId) {
        const isUserA = currentUserId === stepData.userA;
        const userConfirmed = isUserA ? stepData.userAConfirmed : stepData.userBConfirmed;
        userNeedsAction = !userConfirmed && !expired && !bothConfirmed;
      }
      
      return {
        userAConfirmed: stepData.userAConfirmed || false,
        userBConfirmed: stepData.userBConfirmed || false,
        bothConfirmed,
        expired,
        expiresAt: stepData.expiresAt,
        timeRemaining: expired ? null : this.formatExpirationTime(stepData.expiresAt),
        userA: stepData.userA,
        userB: stepData.userB,
        userNeedsAction
      };
      
    } catch (error) {
      console.error('❌ Error getting step confirmation status:', error);
      return {
        userAConfirmed: false,
        userBConfirmed: false,
        bothConfirmed: false,
        expired: false,
        timeRemaining: null,
        userNeedsAction: null
      };
    }
  }
}
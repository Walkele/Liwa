// Service Confirmation and Transaction Completion System
// Handles bilateral confirmation for service transactions similar to trade confirmations

import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UnifiedMessageService } from './UnifiedMessageService';
import { EnhancedNotificationService } from './EnhancedNotificationService';

export class ServiceConfirmationService {
  
  // Service step states
  static STEP_STATES = {
    PENDING: 'pending',
    CLIENT_CONFIRMED: 'client_confirmed',
    PROVIDER_CONFIRMED: 'provider_confirmed', 
    BOTH_CONFIRMED: 'both_confirmed',
    COMPLETED: 'completed'
  };

  // Service transaction steps that require bilateral confirmation
  static SERVICE_STEPS = {
    SERVICE_ACCEPTED: 'service_accepted',        // Both parties confirm service details
    CONTACT_EXCHANGE: 'contact_exchange',        // Exchange contact information
    SERVICE_SCHEDULED: 'service_scheduled',      // Schedule service appointment
    SERVICE_STARTED: 'service_started',          // Confirm service has begun
    SERVICE_COMPLETED: 'service_completed',      // Confirm service is finished
    PAYMENT_COMPLETED: 'payment_completed'       // Confirm payment and final completion
  };

  // Confirmation timeframes (in hours)
  static CONFIRMATION_TIMEFRAMES = {
    SERVICE_ACCEPTED: 24,    // 24 hours to confirm service details
    CONTACT_EXCHANGE: 4,     // 4 hours to exchange contact info
    SERVICE_SCHEDULED: 48,   // 48 hours to schedule service
    SERVICE_STARTED: 2,      // 2 hours to confirm service started
    SERVICE_COMPLETED: 4,    // 4 hours to confirm service completion
    PAYMENT_COMPLETED: 24    // 24 hours to confirm payment
  };

  // Confirm a service step for one user
  static async confirmServiceStep(conversationId, step, userId, confirmationData = {}) {
    try {
      console.log(`🔧 User ${userId} confirming service step: ${step}`);
      
      // Get or create step confirmation document
      const stepDocId = `${conversationId}_${step}`;
      const stepRef = doc(db, 'serviceStepConfirmations', stepDocId);
      const stepDoc = await getDoc(stepRef);
      
      let stepData = {};
      if (stepDoc.exists()) {
        stepData = stepDoc.data();
      }
      
      // Determine user roles (client = item owner, provider = service provider)
      const conversationParts = conversationId.split('_');
      let clientId, providerId;
      
      // For service conversations, format is: service_providerId_clientId_itemId
      if (conversationParts[0] === 'service') {
        providerId = conversationParts[1];
        clientId = conversationParts[2];
      } else {
        // Fallback to original conversation format
        clientId = conversationParts[0];
        providerId = conversationParts[1];
      }
      
      const isClient = userId === clientId;
      const confirmationField = isClient ? 'clientConfirmed' : 'providerConfirmed';
      const confirmationTimeField = isClient ? 'clientConfirmedAt' : 'providerConfirmedAt';
      const confirmationDataField = isClient ? 'clientData' : 'providerData';
      
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
        updateData.clientId = clientId;
        updateData.providerId = providerId;
        updateData.clientConfirmed = isClient;
        updateData.providerConfirmed = !isClient;
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
      
      const bothConfirmed = updatedStepData.clientConfirmed && updatedStepData.providerConfirmed;
      
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
        await this.sendPersonalizedConfirmationMessages(
          conversationId, 
          step, 
          userId, 
          isClient ? providerId : clientId, 
          updatedStepData,
          isClient
        );
        
        return {
          success: true,
          bothConfirmed: false,
          waitingFor: isClient ? providerId : clientId,
          message: 'Your confirmation recorded. Waiting for other party.'
        };
      }
      
    } catch (error) {
      console.error('❌ Error confirming service step:', error);
      throw error;
    }
  }

  // Handle when both users have confirmed a step
  static async handleBothUsersConfirmed(conversationId, step, stepData) {
    try {
      console.log(`✅ Both parties confirmed service step: ${step}`);
      
      // Update the service offer message with new service stage
      const nextStage = this.getNextServiceStage(step);
      
      if (nextStage) {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          where('messageType', '==', 'service_offer'),
          where('status', '==', 'accepted')
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        if (!messagesSnapshot.empty) {
          const messageDoc = messagesSnapshot.docs[0];
          await updateDoc(doc(db, 'messages', messageDoc.id), {
            serviceStage: nextStage,
            lastStageUpdate: serverTimestamp(),
            [`${step}ConfirmedAt`]: serverTimestamp()
          });
        }
      }
      
      // Auto-progress to next step when both parties confirm
      const nextStep = this.getNextStep(step);
      if (nextStep) {
        console.log(`🚀 Auto-progressing to next service step: ${nextStep}`);
        
        // Update all relevant service messages to unlock next step
        const allServiceMessagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          where('messageType', 'in', ['service_offer', 'service_proposal'])
        );
        
        const allServiceMessages = await getDocs(allServiceMessagesQuery);
        const updatePromises = allServiceMessages.docs.map(messageDoc => {
          return updateDoc(doc(db, 'messages', messageDoc.id), {
            [`${step}Completed`]: true,
            [`${step}CompletedAt`]: serverTimestamp(),
            currentStep: nextStep,
            stepUnlocked: true,
            lastProgressUpdate: serverTimestamp()
          });
        });
        
        await Promise.all(updatePromises);
        console.log(`✅ Service messages updated to unlock ${nextStep}`);
      }
      
      // Send confirmation message to chat with next step info
      await this.sendBothConfirmedMessage(conversationId, step, nextStep);
      
      // Handle special cases
      if (step === this.SERVICE_STEPS.PAYMENT_COMPLETED) {
        await this.handleServiceTransactionCompletion(conversationId, stepData);
      }
      
    } catch (error) {
      console.error('❌ Error handling both users confirmed:', error);
    }
  }

  // Send personalized messages to both users about confirmation status
  static async sendPersonalizedConfirmationMessages(conversationId, step, confirmingUserId, waitingUserId, stepData, isClient) {
    const stepName = this.getStepDisplayName(step);
    const timeframe = this.CONFIRMATION_TIMEFRAMES[step.toUpperCase()] || 24;
    const expirationTime = this.formatExpirationTime(stepData.expiresAt);
    const userRole = isClient ? 'Client' : 'Service Provider';
    const otherRole = isClient ? 'Service Provider' : 'Client';
    
    // Special handling for contact exchange - show the actual contact info
    if (step === this.SERVICE_STEPS.CONTACT_EXCHANGE && stepData.clientData && stepData.providerData) {
      const confirmingUserData = stepData.clientId === confirmingUserId ? stepData.clientData : stepData.providerData;
      
      // Create a visible contact sharing message
      let contactMessage = `📞 Contact Information Shared by ${userRole}:\n\n`;
      
      if (confirmingUserData.phoneNumber) {
        contactMessage += `📱 Phone: ${confirmingUserData.phoneNumber}\n`;
      }
      
      if (confirmingUserData.email) {
        contactMessage += `📧 Email: ${confirmingUserData.email}\n`;
      }
      
      if (confirmingUserData.preferredContact) {
        contactMessage += `⭐ Preferred: ${confirmingUserData.preferredContact}\n`;
      }
      
      if (confirmingUserData.availability) {
        contactMessage += `🕐 Availability: ${confirmingUserData.availability}\n`;
      }
      
      if (confirmingUserData.additionalNotes) {
        contactMessage += `📝 Notes: ${confirmingUserData.additionalNotes}\n`;
      }
      
      // Send the contact info as a visible message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        contactMessage,
        'service_contact_shared',
        'contact_info',
        {
          step,
          contactData: confirmingUserData,
          sharedBy: confirmingUserId,
          userRole,
          hasActionButtons: false,
          isVisible: true
        }
      );
    }
    
    // Special handling for service scheduling
    if (step === this.SERVICE_STEPS.SERVICE_SCHEDULED && stepData.clientData && stepData.providerData) {
      const schedulingData = stepData.clientData || stepData.providerData;
      
      if (schedulingData.scheduledDate || schedulingData.scheduledTime) {
        let scheduleMessage = `📅 Service Scheduled:\n\n`;
        
        if (schedulingData.scheduledDate) {
          scheduleMessage += `📆 Date: ${schedulingData.scheduledDate}\n`;
        }
        
        if (schedulingData.scheduledTime) {
          scheduleMessage += `🕐 Time: ${schedulingData.scheduledTime}\n`;
        }
        
        if (schedulingData.location) {
          scheduleMessage += `📍 Location: ${schedulingData.location}\n`;
        }
        
        if (schedulingData.duration) {
          scheduleMessage += `⏱️ Duration: ${schedulingData.duration}\n`;
        }
        
        if (schedulingData.specialInstructions) {
          scheduleMessage += `📝 Instructions: ${schedulingData.specialInstructions}\n`;
        }
        
        await UnifiedMessageService.createSystemMessage(
          conversationId,
          scheduleMessage,
          'service_scheduled',
          'schedule_info',
          {
            step,
            scheduleData: schedulingData,
            scheduledBy: confirmingUserId,
            userRole,
            hasActionButtons: false,
            isVisible: true
          }
        );
      }
    }
    
    // Message for user who just confirmed
    const confirmedText = `✅ You confirmed: ${stepName}\n\n⏳ Waiting for ${otherRole} to confirm.\n\n⚠️ This step expires ${expirationTime}`;
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      confirmedText,
      'service_bilateral_confirmation',
      'user_confirmed',
      {
        step,
        confirmingUserId,
        waitingUserId,
        userRole: 'confirmed',
        serviceRole: userRole,
        expiresAt: stepData.expiresAt,
        hasActionButtons: false
      }
    );
    
    // Message for user who needs to confirm
    const needsActionText = `🔔 ACTION REQUIRED: Please confirm ${stepName}\n\n⏰ You have ${timeframe} hours to confirm this step.\n\n⚠️ Expires ${expirationTime}`;
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      needsActionText,
      'service_bilateral_confirmation',
      'action_required',
      {
        step,
        confirmingUserId,
        waitingUserId,
        userRole: 'needs_action',
        serviceRole: otherRole,
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
      text += `\n\n💡 You can now proceed to the next step in your service transaction.`;
    } else {
      text += '\n\n🎉 Service transaction completed successfully!';
    }
    
    await UnifiedMessageService.createSystemMessage(
      conversationId,
      text,
      'service_bilateral_confirmation',
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

  // Handle complete service transaction completion
  static async handleServiceTransactionCompletion(conversationId, stepData) {
    try {
      console.log('🎉 Handling complete service transaction completion');
      
      // Get the original service offer to find service details
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', 'in', ['service_offer', 'service_proposal'])
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      if (!messagesSnapshot.empty) {
        const serviceMessage = messagesSnapshot.docs[0].data();
        
        // Update service offer status to completed
        if (serviceMessage.serviceOfferId) {
          const serviceOfferRef = doc(db, 'serviceOffers', serviceMessage.serviceOfferId);
          await updateDoc(serviceOfferRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
            paymentConfirmed: true,
            transactionComplete: true
          });
        }
        
        // Create completed service record for history
        const completedServiceData = {
          conversationId,
          serviceType: serviceMessage.serviceType || 'custom',
          serviceTitle: serviceMessage.serviceTitle || 'Service',
          servicePrice: serviceMessage.servicePrice || 0,
          clientId: stepData.clientId,
          providerId: stepData.providerId,
          itemId: serviceMessage.itemId,
          completedAt: serverTimestamp(),
          paymentMethod: stepData.providerData?.paymentMethod || 'cash',
          serviceRating: null, // To be filled by rating system
          transactionId: `service_${Date.now()}_${stepData.clientId}_${stepData.providerId}`
        };
        
        await addDoc(collection(db, 'completedServices'), completedServiceData);
        console.log('✅ Service transaction recorded in completed services');
        
        // Send notifications to both parties
        await EnhancedNotificationService.createNotification(
          stepData.clientId,
          'SERVICE_TRANSACTION_COMPLETED',
          '🎉 Service Transaction Completed!',
          `Your service "${serviceMessage.serviceTitle}" has been completed and payment confirmed.`,
          {
            serviceTitle: serviceMessage.serviceTitle,
            servicePrice: serviceMessage.servicePrice,
            providerId: stepData.providerId,
            conversationId
          }
        );
        
        await EnhancedNotificationService.createNotification(
          stepData.providerId,
          'SERVICE_TRANSACTION_COMPLETED',
          '💰 Payment Confirmed!',
          `Payment for "${serviceMessage.serviceTitle}" has been confirmed. Transaction complete!`,
          {
            serviceTitle: serviceMessage.serviceTitle,
            servicePrice: serviceMessage.servicePrice,
            clientId: stepData.clientId,
            conversationId
          }
        );
      }
      
      // Send final completion message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        '🎉 Service transaction completed successfully!\n\n✅ Payment has been confirmed by both parties.\n\n📚 You can view your service history in your profile.\n\n⭐ Don\'t forget to leave a review for each other!\n\nThank you for using SwipeIt Services!',
        'service_transaction_completion',
        'completed',
        {
          completedAt: serverTimestamp(),
          hasActionButtons: true,
          actionButtonText: 'Leave Review',
          isServiceComplete: true
        }
      );
      
    } catch (error) {
      console.error('❌ Error handling service transaction completion:', error);
    }
  }

  // Get next service stage based on completed step
  static getNextServiceStage(completedStep) {
    switch (completedStep) {
      case this.SERVICE_STEPS.SERVICE_ACCEPTED:
        return 'service_confirmed';
      case this.SERVICE_STEPS.CONTACT_EXCHANGE:
        return 'contact_exchanged';
      case this.SERVICE_STEPS.SERVICE_SCHEDULED:
        return 'service_scheduled';
      case this.SERVICE_STEPS.SERVICE_STARTED:
        return 'service_in_progress';
      case this.SERVICE_STEPS.SERVICE_COMPLETED:
        return 'service_finished';
      case this.SERVICE_STEPS.PAYMENT_COMPLETED:
        return 'transaction_completed';
      default:
        return null;
    }
  }

  // Get next step in sequence
  static getNextStep(currentStep) {
    const steps = [
      this.SERVICE_STEPS.SERVICE_ACCEPTED,
      this.SERVICE_STEPS.CONTACT_EXCHANGE,
      this.SERVICE_STEPS.SERVICE_SCHEDULED,
      this.SERVICE_STEPS.SERVICE_STARTED,
      this.SERVICE_STEPS.SERVICE_COMPLETED,
      this.SERVICE_STEPS.PAYMENT_COMPLETED
    ];
    
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  }

  // Get expiration time for a step
  static getExpirationTime(step) {
    const hours = this.CONFIRMATION_TIMEFRAMES[step.toUpperCase()] || 24;
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + hours);
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
      `⚠️ EXPIRED: ${stepName} confirmation period has ended.\n\nThe service transaction may need to be restarted or cancelled.`,
      'service_bilateral_confirmation',
      'expired',
      {
        step,
        expiredAt: serverTimestamp(),
        hasActionButtons: true,
        actionButtonText: 'Restart Service'
      }
    );
  }

  // Get display name for step
  static getStepDisplayName(step) {
    switch (step) {
      case this.SERVICE_STEPS.SERVICE_ACCEPTED:
        return 'Service Agreement';
      case this.SERVICE_STEPS.CONTACT_EXCHANGE:
        return 'Contact Information Exchange';
      case this.SERVICE_STEPS.SERVICE_SCHEDULED:
        return 'Service Appointment Scheduled';
      case this.SERVICE_STEPS.SERVICE_STARTED:
        return 'Service Started';
      case this.SERVICE_STEPS.SERVICE_COMPLETED:
        return 'Service Completed';
      case this.SERVICE_STEPS.PAYMENT_COMPLETED:
        return 'Payment Confirmed';
      default:
        return 'Unknown Step';
    }
  }

  // Get confirmation status for a step with user-specific information
  static async getStepConfirmationStatus(conversationId, step, currentUserId = null) {
    try {
      const stepDocId = `${conversationId}_${step}`;
      const stepRef = doc(db, 'serviceStepConfirmations', stepDocId);
      const stepDoc = await getDoc(stepRef);
      
      if (!stepDoc.exists()) {
        return {
          clientConfirmed: false,
          providerConfirmed: false,
          bothConfirmed: false,
          expired: false,
          timeRemaining: null,
          userNeedsAction: currentUserId ? true : null
        };
      }
      
      const stepData = stepDoc.data();
      const expired = this.isStepExpired(stepData.expiresAt);
      const bothConfirmed = (stepData.clientConfirmed && stepData.providerConfirmed) || false;
      
      let userNeedsAction = null;
      if (currentUserId) {
        const isClient = currentUserId === stepData.clientId;
        const userConfirmed = isClient ? stepData.clientConfirmed : stepData.providerConfirmed;
        userNeedsAction = !userConfirmed && !expired && !bothConfirmed;
      }
      
      return {
        clientConfirmed: stepData.clientConfirmed || false,
        providerConfirmed: stepData.providerConfirmed || false,
        bothConfirmed,
        expired,
        expiresAt: stepData.expiresAt,
        timeRemaining: expired ? null : this.formatExpirationTime(stepData.expiresAt),
        clientId: stepData.clientId,
        providerId: stepData.providerId,
        userNeedsAction
      };
      
    } catch (error) {
      console.error('❌ Error getting service step confirmation status:', error);
      return {
        clientConfirmed: false,
        providerConfirmed: false,
        bothConfirmed: false,
        expired: false,
        timeRemaining: null,
        userNeedsAction: null
      };
    }
  }

  // Check if user can proceed to next step (both parties must confirm current step)
  static async canProceedToNextStep(conversationId, currentStep) {
    try {
      const stepDocId = `${conversationId}_${currentStep}`;
      const stepRef = doc(db, 'serviceStepConfirmations', stepDocId);
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
      
      return stepData.clientConfirmed && stepData.providerConfirmed;
      
    } catch (error) {
      console.error('❌ Error checking service step confirmation:', error);
      return false;
    }
  }

  // Start service transaction (when service offer is accepted)
  static async startServiceTransaction(conversationId, serviceOfferId, clientId, providerId) {
    try {
      console.log('🚀 Starting service transaction workflow');
      
      // Initialize the first step - service acceptance confirmation
      await this.sendBothConfirmedMessage(
        conversationId, 
        null, 
        this.SERVICE_STEPS.SERVICE_ACCEPTED
      );
      
      // Send initial system message explaining the process
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        '🔧 Service Transaction Started!\n\n📋 Both parties need to confirm each step:\n\n1️⃣ Service Agreement\n2️⃣ Contact Exchange\n3️⃣ Schedule Service\n4️⃣ Start Service\n5️⃣ Complete Service\n6️⃣ Confirm Payment\n\n✅ Let\'s begin with confirming the service details!',
        'service_transaction_started',
        'workflow_info',
        {
          serviceOfferId,
          currentStep: this.SERVICE_STEPS.SERVICE_ACCEPTED,
          hasActionButtons: true,
          actionButtonText: 'Confirm Service Details'
        }
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error starting service transaction:', error);
      return false;
    }
  }
}

export default ServiceConfirmationService;
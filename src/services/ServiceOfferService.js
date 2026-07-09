// Service Offer Management System
// Handles service offers like repair, delivery, installation, skill exchange

import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';
import { EnhancedNotificationService } from './EnhancedNotificationService';

export class ServiceOfferService {
  
  // Service offer types
  static SERVICE_TYPES = {
    REPAIR: {
      id: 'repair',
      title: 'Repair Service',
      icon: 'construct',
      color: '#FF9800',
      description: 'Offer to repair or fix the item'
    },
    DELIVERY: {
      id: 'delivery', 
      title: 'Delivery Service',
      icon: 'car',
      color: '#2196F3',
      description: 'Offer to deliver the item'
    },
    INSTALLATION: {
      id: 'installation',
      title: 'Installation Service', 
      icon: 'build',
      color: '#4CAF50',
      description: 'Offer to install or set up the item'
    },
    SKILL_EXCHANGE: {
      id: 'skill_exchange',
      title: 'Skill Exchange',
      icon: 'school',
      color: '#9C27B0',
      description: 'Offer skills/knowledge in exchange'
    },
    CUSTOM_SERVICE: {
      id: 'custom',
      title: 'Custom Service',
      icon: 'hand-left',
      color: '#FF6B6B',
      description: 'Offer a custom service'
    }
  };

  // Create service offer
  static async createServiceOffer(itemId, sellerId, serviceProviderId, serviceDetails) {
    try {
      console.log('🔧 Creating service offer...');
      
      const {
        serviceType,
        serviceTitle,
        serviceDescription,
        servicePrice,
        estimatedTime,
        location,
        message
      } = serviceDetails;
      
      // Get item details
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      // Get service provider details
      const providerRef = doc(db, 'users', serviceProviderId);
      const providerDoc = await getDoc(providerRef);
      
      if (!providerDoc.exists()) {
        throw new Error('Service provider not found');
      }
      
      const providerData = providerDoc.data();
      
      // Get seller details
      const sellerRef = doc(db, 'users', sellerId);
      const sellerDoc = await getDoc(sellerRef);
      const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
      
      // Check for existing pending service offers
      const existingServiceQuery = query(
        collection(db, 'serviceOffers'),
        where('itemId', '==', itemId),
        where('serviceProviderId', '==', serviceProviderId),
        where('status', '==', 'pending')
      );
      
      const existingServices = await getDocs(existingServiceQuery);
      if (!existingServices.empty) {
        throw new Error('You already have a pending service offer for this item');
      }
      
      // Create comprehensive service offer record
      const serviceOfferData = {
        // Item information
        itemId,
        itemTitle: itemData.title,
        itemPrice: itemData.price,
        itemCategory: itemData.category,
        itemImages: itemData.images || [],
        
        // Seller information (item owner)
        sellerId,
        sellerName: sellerData.name || sellerData.displayName || 'Item Owner',
        sellerEmail: sellerData.email || '',
        
        // Service provider information
        serviceProviderId,
        providerName: providerData.name || providerData.displayName || 'Service Provider',
        providerEmail: providerData.email || '',
        providerRating: providerData.rating || 5.0,
        providerTotalServices: providerData.totalServices || 0,
        
        // Service details
        serviceType,
        serviceTitle,
        serviceDescription,
        servicePrice: parseFloat(servicePrice) || 0,
        estimatedTime,
        serviceLocation: location,
        message: message.trim(),
        
        // Service metadata
        serviceCategory: this.SERVICE_TYPES[serviceType]?.title || 'Custom Service',
        serviceIcon: this.SERVICE_TYPES[serviceType]?.icon || 'hand-left',
        serviceColor: this.SERVICE_TYPES[serviceType]?.color || '#FF6B6B',
        
        // Status and timestamps
        status: 'pending',
        createdAt: serverTimestamp(),
        
        // Conversation setup
        conversationId: this.generateServiceConversationId(serviceProviderId, sellerId, itemId),
        
        // Service-specific fields
        isServiceOffer: true,
        offerType: 'service',
        requiresInPerson: serviceType !== 'skill_exchange',
        canBeRemote: serviceType === 'skill_exchange' || serviceType === 'custom',
        
        // Additional metadata
        serviceValue: parseFloat(servicePrice) || 0,
        estimatedDuration: estimatedTime,
        serviceTerms: `Service: ${serviceTitle}\nPrice: $${servicePrice}\nTime: ${estimatedTime}\nLocation: ${location}`
      };
      
      // Create the service offer
      const serviceOfferRef = await addDoc(collection(db, 'serviceOffers'), serviceOfferData);
      
      // Create/update conversation with service context
      await this.createServiceConversation(serviceOfferData, serviceOfferRef.id);
      
      // Send notification to item owner
      await EnhancedNotificationService.createNotification(
        sellerId,
        'SERVICE_OFFER_RECEIVED',
        '🔧 Service Offer Received',
        `${providerData.name || 'Someone'} offered "${serviceTitle}" for your "${itemData.title}" - $${servicePrice}`,
        {
          serviceOfferId: serviceOfferRef.id,
          serviceType,
          serviceTitle,
          servicePrice,
          providerName: providerData.name,
          itemTitle: itemData.title
        }
      );
      
      console.log('✅ Service offer created successfully:', serviceOfferRef.id);
      return {
        serviceOfferId: serviceOfferRef.id,
        conversationId: serviceOfferData.conversationId,
        serviceOfferData
      };
      
    } catch (error) {
      console.error('❌ Error creating service offer:', error);
      throw error;
    }
  }
  
  // Accept service offer
  static async acceptServiceOffer(serviceOfferId, acceptingUserId) {
    try {
      console.log('✅ Accepting service offer:', serviceOfferId);
      
      const serviceOfferRef = doc(db, 'serviceOffers', serviceOfferId);
      const serviceOfferDoc = await getDoc(serviceOfferRef);
      
      if (!serviceOfferDoc.exists()) {
        throw new Error('Service offer not found');
      }
      
      const serviceOfferData = serviceOfferDoc.data();
      
      // Verify user can accept
      if (serviceOfferData.sellerId !== acceptingUserId) {
        throw new Error('You are not authorized to accept this service offer');
      }
      
      // Update service offer status
      await updateDoc(serviceOfferRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: acceptingUserId
      });
      
      // Create accepted service record for service management
      const acceptedServiceData = {
        originalServiceOfferId: serviceOfferId,
        itemId: serviceOfferData.itemId,
        itemTitle: serviceOfferData.itemTitle,
        sellerId: serviceOfferData.sellerId,
        sellerName: serviceOfferData.sellerName,
        serviceProviderId: serviceOfferData.serviceProviderId,
        providerName: serviceOfferData.providerName,
        providerEmail: serviceOfferData.providerEmail,
        serviceType: serviceOfferData.serviceType,
        serviceTitle: serviceOfferData.serviceTitle,
        serviceDescription: serviceOfferData.serviceDescription,
        servicePrice: serviceOfferData.servicePrice,
        estimatedTime: serviceOfferData.estimatedTime,
        serviceLocation: serviceOfferData.serviceLocation,
        status: 'accepted',
        currentStep: 1, // Start at service arrangement
        createdAt: serverTimestamp(),
        conversationId: serviceOfferData.conversationId,
        serviceSteps: [
          { step: 1, title: 'Service Details Confirmed', completed: true, completedAt: serverTimestamp() },
          { step: 2, title: 'Contact Information Shared', completed: false },
          { step: 3, title: 'Service Scheduled', completed: false },
          { step: 4, title: 'Service Completed', completed: false },
          { step: 5, title: 'Payment & Review', completed: false }
        ]
      };
      
      const acceptedServiceRef = await addDoc(collection(db, 'acceptedServices'), acceptedServiceData);
      
      // Update conversation with acceptance message
      await this.addServiceSystemMessage(
        serviceOfferData.conversationId,
        `Service offer accepted! "${serviceOfferData.serviceTitle}" for $${serviceOfferData.servicePrice}. Let's arrange the service details.`,
        'service_accepted'
      );
      
      // Send notification to service provider
      await EnhancedNotificationService.createNotification(
        serviceOfferData.serviceProviderId,
        'SERVICE_OFFER_ACCEPTED',
        '✅ Service Offer Accepted!',
        `${serviceOfferData.sellerName} accepted your service offer: "${serviceOfferData.serviceTitle}" for $${serviceOfferData.servicePrice}`,
        {
          serviceOfferId,
          acceptedServiceId: acceptedServiceRef.id,
          serviceTitle: serviceOfferData.serviceTitle,
          servicePrice: serviceOfferData.servicePrice,
          itemTitle: serviceOfferData.itemTitle
        }
      );
      
      console.log('✅ Service offer accepted successfully');
      
      // Start the service confirmation workflow
      try {
        const { ServiceConfirmationService } = await import('./ServiceConfirmationService');
        await ServiceConfirmationService.startServiceTransaction(
          serviceOfferData.conversationId,
          serviceOfferId,
          serviceOfferData.sellerId,
          serviceOfferData.serviceProviderId
        );
      } catch (confirmationError) {
        console.error('⚠️ Error starting service confirmation workflow:', confirmationError);
        // Don't fail the acceptance, just log the error
      }
      
      return {
        acceptedServiceId: acceptedServiceRef.id,
        conversationId: serviceOfferData.conversationId
      };
      
    } catch (error) {
      console.error('❌ Error accepting service offer:', error);
      throw error;
    }
  }
  
  // Create/update conversation for service offer
  static async createServiceConversation(serviceOfferData, serviceOfferId) {
    try {
      const conversationData = {
        id: serviceOfferData.conversationId,
        participants: [serviceOfferData.serviceProviderId, serviceOfferData.sellerId],
        participantNames: {
          [serviceOfferData.serviceProviderId]: serviceOfferData.providerName,
          [serviceOfferData.sellerId]: serviceOfferData.sellerName
        },
        itemId: serviceOfferData.itemId,
        itemTitle: serviceOfferData.itemTitle,
        serviceOfferId: serviceOfferId,
        serviceType: serviceOfferData.serviceType,
        serviceTitle: serviceOfferData.serviceTitle,
        servicePrice: serviceOfferData.servicePrice,
        conversationType: 'service_offer',
        lastMessage: `Service Offer: "${serviceOfferData.serviceTitle}" for "${serviceOfferData.itemTitle}" - $${serviceOfferData.servicePrice}`,
        lastMessageAt: serverTimestamp(),
        unreadCount: { 
          [serviceOfferData.serviceProviderId]: 0, 
          [serviceOfferData.sellerId]: 1 
        },
        createdAt: serverTimestamp()
      };
      
      const conversationRef = doc(db, 'conversations', serviceOfferData.conversationId);
      await setDoc(conversationRef, conversationData, { merge: true });
      
      // Add initial system message
      await this.addServiceSystemMessage(
        serviceOfferData.conversationId,
        `${serviceOfferData.providerName} offered "${serviceOfferData.serviceTitle}" for your "${serviceOfferData.itemTitle}" - $${serviceOfferData.servicePrice}. ${serviceOfferData.message}`,
        'service_offer_created',
        {
          serviceOfferId: serviceOfferId,
          serviceType: serviceOfferData.serviceType,
          serviceTitle: serviceOfferData.serviceTitle,
          servicePrice: serviceOfferData.servicePrice,
          serviceDescription: serviceOfferData.serviceDescription,
          estimatedTime: serviceOfferData.estimatedTime,
          serviceLocation: serviceOfferData.serviceLocation,
          itemTitle: serviceOfferData.itemTitle,
          providerName: serviceOfferData.providerName,
          sellerId: serviceOfferData.sellerId,
          serviceProviderId: serviceOfferData.serviceProviderId,
          status: 'pending'
        }
      );
      
    } catch (error) {
      console.error('Error creating service conversation:', error);
    }
  }
  
  // Add system message to service conversation
  static async addServiceSystemMessage(conversationId, message, messageType, additionalData = {}) {
    try {
      const messageData = {
        conversationId,
        senderId: 'system',
        senderName: 'SwipeIt Services',
        text: message,
        messageType: messageType,
        isSystemMessage: true,
        isServiceMessage: true,
        createdAt: serverTimestamp(),
        read: false,
        delivered: true,
        ...additionalData // Include any additional service offer data
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation last message
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: message,
        lastMessageAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error adding service system message:', error);
    }
  }
  
  // Generate consistent conversation ID for service offers
  static generateServiceConversationId(serviceProviderId, sellerId, itemId) {
    const sortedUsers = [serviceProviderId, sellerId].sort();
    return `service_${sortedUsers[0]}_${sortedUsers[1]}_${itemId}`;
  }
  
  // Get user's service offers (sent)
  static async getUserServiceOffers(userId) {
    try {
      const serviceOffersQuery = query(
        collection(db, 'serviceOffers'),
        where('serviceProviderId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(serviceOffersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting user service offers:', error);
      return [];
    }
  }
  
  // Get service offers received by user (for their items)
  static async getReceivedServiceOffers(userId) {
    try {
      const receivedServiceQuery = query(
        collection(db, 'serviceOffers'),
        where('sellerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(receivedServiceQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting received service offers:', error);
      return [];
    }
  }
  
  // Reject service offer
  static async rejectServiceOffer(serviceOfferId, rejectingUserId, reason = '') {
    try {
      console.log('❌ Rejecting service offer:', serviceOfferId);
      
      const serviceOfferRef = doc(db, 'serviceOffers', serviceOfferId);
      const serviceOfferDoc = await getDoc(serviceOfferRef);
      
      if (!serviceOfferDoc.exists()) {
        throw new Error('Service offer not found');
      }
      
      const serviceOfferData = serviceOfferDoc.data();
      
      // Update service offer status
      await updateDoc(serviceOfferRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: rejectingUserId,
        rejectionReason: reason
      });
      
      // Add system message to conversation
      await this.addServiceSystemMessage(
        serviceOfferData.conversationId,
        `Service offer "${serviceOfferData.serviceTitle}" was declined. ${reason}`,
        'service_rejected'
      );
      
      // Send notification to service provider
      await EnhancedNotificationService.createNotification(
        serviceOfferData.serviceProviderId,
        'SERVICE_OFFER_REJECTED',
        '❌ Service Offer Declined',
        `Your service offer "${serviceOfferData.serviceTitle}" for "${serviceOfferData.itemTitle}" was declined.`,
        {
          serviceOfferId,
          serviceTitle: serviceOfferData.serviceTitle,
          itemTitle: serviceOfferData.itemTitle,
          reason
        }
      );
      
      console.log('✅ Service offer rejected successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error rejecting service offer:', error);
      throw error;
    }
  }
  
  // Get service offer details
  static async getServiceOfferDetails(serviceOfferId) {
    try {
      const serviceOfferRef = doc(db, 'serviceOffers', serviceOfferId);
      const serviceOfferDoc = await getDoc(serviceOfferRef);
      
      if (!serviceOfferDoc.exists()) {
        return null;
      }
      
      return {
        id: serviceOfferId,
        ...serviceOfferDoc.data()
      };
      
    } catch (error) {
      console.error('Error getting service offer details:', error);
      return null;
    }
  }
  
  // Complete service (mark as completed)
  static async completeService(acceptedServiceId, completingUserId, completionDetails = {}) {
    try {
      console.log('✅ Completing service:', acceptedServiceId);
      
      const acceptedServiceRef = doc(db, 'acceptedServices', acceptedServiceId);
      const acceptedServiceDoc = await getDoc(acceptedServiceRef);
      
      if (!acceptedServiceDoc.exists()) {
        throw new Error('Accepted service not found');
      }
      
      const serviceData = acceptedServiceDoc.data();
      
      // Update service status
      await updateDoc(acceptedServiceRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        completedBy: completingUserId,
        completionDetails,
        currentStep: 5,
        'serviceSteps.4.completed': true,
        'serviceSteps.4.completedAt': serverTimestamp()
      });
      
      // Add completion message to conversation
      await this.addServiceSystemMessage(
        serviceData.conversationId,
        `Service "${serviceData.serviceTitle}" has been completed! Please leave a review for the service provider.`,
        'service_completed'
      );
      
      // Send notifications to both parties
      const otherUserId = completingUserId === serviceData.sellerId 
        ? serviceData.serviceProviderId 
        : serviceData.sellerId;
      
      await EnhancedNotificationService.createNotification(
        otherUserId,
        'SERVICE_COMPLETED',
        '🎉 Service Completed!',
        `The service "${serviceData.serviceTitle}" has been completed successfully!`,
        {
          acceptedServiceId,
          serviceTitle: serviceData.serviceTitle,
          itemTitle: serviceData.itemTitle
        }
      );
      
      console.log('✅ Service completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error completing service:', error);
      throw error;
    }
  }
  
  // Create service counter offer
  static async createServiceCounterOffer(serviceOfferId, counteringUserId, counterData) {
    try {
      console.log('🔄 Creating service counter offer...');
      
      // Get original service offer
      const serviceOfferRef = doc(db, 'serviceOffers', serviceOfferId);
      const serviceOfferDoc = await getDoc(serviceOfferRef);
      
      if (!serviceOfferDoc.exists()) {
        throw new Error('Service offer not found');
      }
      
      const serviceOfferData = serviceOfferDoc.data();
      
      // Check counter offer limit
      const counterOfferQuery = query(
        collection(db, 'serviceCounterOffers'),
        where('serviceOfferId', '==', serviceOfferId)
      );
      
      const counterOfferSnapshot = await getDocs(counterOfferQuery);
      const counterCount = counterOfferSnapshot.size;
      
      if (counterCount >= 3) {
        throw new Error('Maximum counter offers (3) reached for this service');
      }
      
      // Determine user roles
      const isProvider = counteringUserId === serviceOfferData.serviceProviderId;
      const isSeller = counteringUserId === serviceOfferData.sellerId;
      
      if (!isProvider && !isSeller) {
        throw new Error('You are not authorized to counter this service offer');
      }
      
      // Create counter offer document
      const counterOfferDoc = {
        serviceOfferId,
        originalServiceOfferId: serviceOfferId,
        itemId: serviceOfferData.itemId,
        itemTitle: serviceOfferData.itemTitle,
        
        // User information
        counteringUserId,
        counteringUserName: isProvider ? serviceOfferData.providerName : serviceOfferData.sellerName,
        targetUserId: isProvider ? serviceOfferData.sellerId : serviceOfferData.serviceProviderId,
        targetUserName: isProvider ? serviceOfferData.sellerName : serviceOfferData.providerName,
        
        // Original terms
        originalPrice: serviceOfferData.servicePrice,
        originalDuration: serviceOfferData.estimatedTime,
        originalServiceTitle: serviceOfferData.serviceTitle,
        
        // Counter terms
        counterPrice: counterData.counterPrice,
        counterDuration: counterData.counterDuration || serviceOfferData.estimatedTime,
        counterMessage: counterData.counterMessage || `Counter offer: $${counterData.counterPrice}`,
        
        // Metadata
        counterNumber: counterCount + 1,
        status: 'pending',
        createdAt: serverTimestamp(),
        conversationId: serviceOfferData.conversationId,
        
        // Service details
        serviceType: serviceOfferData.serviceType,
        serviceTitle: serviceOfferData.serviceTitle,
        serviceDescription: serviceOfferData.serviceDescription,
        serviceLocation: serviceOfferData.serviceLocation,
        
        // Counter offer type
        isServiceCounterOffer: true,
        offerType: 'service_counter'
      };
      
      // Create the counter offer
      const counterOfferRef = await addDoc(collection(db, 'serviceCounterOffers'), counterOfferDoc);
      
      // Update original service offer status
      await updateDoc(serviceOfferRef, {
        status: 'countered',
        lastCounterOfferId: counterOfferRef.id,
        counterOfferCount: counterCount + 1,
        lastCounteredAt: serverTimestamp()
      });
      
      // Create system message in conversation
      await this.addServiceSystemMessage(
        serviceOfferData.conversationId,
        `${counterOfferDoc.counteringUserName} sent a counter offer: $${counterData.counterPrice}${counterData.counterDuration !== serviceOfferData.estimatedTime ? ` (${counterData.counterDuration})` : ''}. ${counterData.counterMessage}`,
        'service_counter_offer',
        {
          // Counter offer IDs
          serviceCounterOfferId: counterOfferRef.id,
          serviceOfferId,
          originalServiceOfferId: serviceOfferId,
          
          // User information
          counteringUserId,
          counteringUserName: counterOfferDoc.counteringUserName,
          targetUserId: counterOfferDoc.targetUserId,
          targetUserName: counterOfferDoc.targetUserName,
          
          // Price information
          counterPrice: counterData.counterPrice,
          originalPrice: serviceOfferData.servicePrice,
          
          // Duration information
          counterDuration: counterData.counterDuration || serviceOfferData.estimatedTime,
          originalDuration: serviceOfferData.estimatedTime,
          
          // Service information
          serviceTitle: serviceOfferData.serviceTitle,
          originalServiceTitle: serviceOfferData.serviceTitle,
          serviceType: serviceOfferData.serviceType,
          
          // Counter message
          counterMessage: counterData.counterMessage,
          
          // Counter tracking
          counterNumber: counterCount + 1,
          maxCounters: 3,
          remainingCounters: 3 - (counterCount + 1),
          
          // Status
          status: 'pending',
          
          // Item information
          itemId: serviceOfferData.itemId,
          itemTitle: serviceOfferData.itemTitle
        }
      );
      
      // Send notification to target user
      await EnhancedNotificationService.createNotification(
        counterOfferDoc.targetUserId,
        'SERVICE_COUNTER_OFFER_RECEIVED',
        '🔄 Service Counter Offer',
        `${counterOfferDoc.counteringUserName} countered with $${counterData.counterPrice} for "${serviceOfferData.serviceTitle}"`,
        {
          serviceCounterOfferId: counterOfferRef.id,
          serviceOfferId,
          counterPrice: counterData.counterPrice,
          originalPrice: serviceOfferData.servicePrice,
          serviceTitle: serviceOfferData.serviceTitle,
          counterNumber: counterCount + 1
        }
      );
      
      console.log('✅ Service counter offer created successfully:', counterOfferRef.id);
      return {
        counterOfferId: counterOfferRef.id,
        conversationId: serviceOfferData.conversationId,
        counterOfferData: counterOfferDoc
      };
      
    } catch (error) {
      console.error('❌ Error creating service counter offer:', error);
      throw error;
    }
  }
  
  // Accept service counter offer
  static async acceptServiceCounterOffer(counterOfferId, acceptingUserId) {
    try {
      console.log('✅ Accepting service counter offer:', counterOfferId);
      
      const counterOfferRef = doc(db, 'serviceCounterOffers', counterOfferId);
      const counterOfferDoc = await getDoc(counterOfferRef);
      
      if (!counterOfferDoc.exists()) {
        throw new Error('Service counter offer not found');
      }
      
      const counterOfferData = counterOfferDoc.data();
      
      // Verify user can accept
      if (counterOfferData.targetUserId !== acceptingUserId) {
        throw new Error('You are not authorized to accept this counter offer');
      }
      
      // Update counter offer status
      await updateDoc(counterOfferRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: acceptingUserId
      });
      
      // Update original service offer with new terms
      const serviceOfferRef = doc(db, 'serviceOffers', counterOfferData.serviceOfferId);
      await updateDoc(serviceOfferRef, {
        status: 'accepted',
        servicePrice: counterOfferData.counterPrice,
        estimatedTime: counterOfferData.counterDuration,
        acceptedAt: serverTimestamp(),
        acceptedBy: acceptingUserId,
        acceptedCounterOfferId: counterOfferId,
        finalPrice: counterOfferData.counterPrice,
        finalDuration: counterOfferData.counterDuration
      });
      
      // Add acceptance message to conversation
      await this.addServiceSystemMessage(
        counterOfferData.conversationId,
        `Counter offer accepted! Service "${counterOfferData.serviceTitle}" for $${counterOfferData.counterPrice}. Let's arrange the service details.`,
        'service_counter_accepted',
        {
          serviceCounterOfferId: counterOfferId,
          serviceOfferId: counterOfferData.serviceOfferId,
          finalPrice: counterOfferData.counterPrice,
          finalDuration: counterOfferData.counterDuration,
          status: 'accepted'
        }
      );
      
      // Send notification to countering user
      await EnhancedNotificationService.createNotification(
        counterOfferData.counteringUserId,
        'SERVICE_COUNTER_OFFER_ACCEPTED',
        '✅ Counter Offer Accepted!',
        `Your counter offer of $${counterOfferData.counterPrice} for "${counterOfferData.serviceTitle}" was accepted!`,
        {
          serviceCounterOfferId: counterOfferId,
          serviceOfferId: counterOfferData.serviceOfferId,
          finalPrice: counterOfferData.counterPrice,
          serviceTitle: counterOfferData.serviceTitle
        }
      );
      
      console.log('✅ Service counter offer accepted successfully');
      
      // Start the service confirmation workflow
      try {
        const { ServiceConfirmationService } = await import('./ServiceConfirmationService');
        await ServiceConfirmationService.startServiceTransaction(
          counterOfferData.conversationId,
          counterOfferData.serviceOfferId,
          counterOfferData.targetUserId === counterOfferData.counteringUserId 
            ? counterOfferData.counteringUserId 
            : counterOfferData.targetUserId,
          counterOfferData.targetUserId === counterOfferData.counteringUserId 
            ? counterOfferData.targetUserId 
            : counterOfferData.counteringUserId
        );
      } catch (confirmationError) {
        console.error('⚠️ Error starting service confirmation workflow:', confirmationError);
      }
      
      return {
        conversationId: counterOfferData.conversationId,
        finalPrice: counterOfferData.counterPrice,
        finalDuration: counterOfferData.counterDuration
      };
      
    } catch (error) {
      console.error('❌ Error accepting service counter offer:', error);
      throw error;
    }
  }
  
  // Decline service counter offer
  static async declineServiceCounterOffer(counterOfferId, decliningUserId, reason = '') {
    try {
      console.log('❌ Declining service counter offer:', counterOfferId);
      
      const counterOfferRef = doc(db, 'serviceCounterOffers', counterOfferId);
      const counterOfferDoc = await getDoc(counterOfferRef);
      
      if (!counterOfferDoc.exists()) {
        throw new Error('Service counter offer not found');
      }
      
      const counterOfferData = counterOfferDoc.data();
      
      // Update counter offer status
      await updateDoc(counterOfferRef, {
        status: 'declined',
        declinedAt: serverTimestamp(),
        declinedBy: decliningUserId,
        declineReason: reason
      });
      
      // Update original service offer
      const serviceOfferRef = doc(db, 'serviceOffers', counterOfferData.serviceOfferId);
      await updateDoc(serviceOfferRef, {
        status: 'counter_declined',
        lastCounterDeclinedAt: serverTimestamp()
      });
      
      // Add decline message to conversation
      await this.addServiceSystemMessage(
        counterOfferData.conversationId,
        `Counter offer declined. ${reason}`,
        'service_counter_declined',
        {
          serviceCounterOfferId: counterOfferId,
          serviceOfferId: counterOfferData.serviceOfferId,
          declineReason: reason
        }
      );
      
      // Send notification
      await EnhancedNotificationService.createNotification(
        counterOfferData.counteringUserId,
        'SERVICE_COUNTER_OFFER_DECLINED',
        '❌ Counter Offer Declined',
        `Your counter offer for "${counterOfferData.serviceTitle}" was declined.`,
        {
          serviceCounterOfferId: counterOfferId,
          serviceOfferId: counterOfferData.serviceOfferId,
          reason
        }
      );
      
      console.log('✅ Service counter offer declined successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error declining service counter offer:', error);
      throw error;
    }
  }
  
  // Get counter offers for a service offer
  static async getServiceCounterOffers(serviceOfferId) {
    try {
      const counterOffersQuery = query(
        collection(db, 'serviceCounterOffers'),
        where('serviceOfferId', '==', serviceOfferId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(counterOffersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error getting service counter offers:', error);
      return [];
    }
  }

}

export default ServiceOfferService;

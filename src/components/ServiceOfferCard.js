// Service Offer Card Component
// Displays service offers with Accept/Decline/Counter buttons similar to trade proposals

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingButton from './LoadingButton';
import ServiceCounterOfferModal from './ServiceCounterOfferModal';
import { ServiceOfferService } from '../services/ServiceOfferService';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

export default function ServiceOfferCard({
  conversationId,
  currentUserId,
  messages = [],
  navigation,
  onServiceAction
}) {
  const [serviceOffer, setServiceOffer] = useState(null);
  const [serviceOfferStatus, setServiceOfferStatus] = useState('pending');
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterOfferCount, setCounterOfferCount] = useState(0);
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  useEffect(() => {
    // Only run when conversationId or messages length changes
    findServiceOffer();
  }, [conversationId, messages.length]); // Only re-run when these change

  const findServiceOffer = () => {
    // Look for service offer messages with multiple detection methods
    const serviceMessage = messages.find(msg => {
      return msg.messageType === 'service_offer_created' || 
             msg.isServiceMessage === true ||
             (msg.text && msg.text.includes('offered') && msg.text.includes('for your')) ||
             msg.serviceOfferId || 
             msg.serviceTitle;
    });

    if (serviceMessage) {
      console.log('🔧 ServiceOfferCard: Found service message:', serviceMessage);
      const serviceData = extractServiceDataFromMessage(serviceMessage);
      console.log('🔧 ServiceOfferCard: Extracted service data:', serviceData);
      console.log('🔧 ServiceOfferCard: Current user ID:', currentUserId);
      console.log('🔧 ServiceOfferCard: Seller ID:', serviceData.sellerId);
      console.log('🔧 ServiceOfferCard: Provider ID:', serviceData.serviceProviderId);
      
      setServiceOffer(serviceData);
      
      // Determine if current user can take action
      const canAccept = serviceData.sellerId === currentUserId && serviceData.status === 'pending';
      console.log('🔧 ServiceOfferCard: Can accept?', canAccept);
      setServiceOfferStatus(serviceData.status || 'pending');
    } else {
      console.log('🔧 ServiceOfferCard: No service message found');
      setServiceOffer(null);
    }
  };

  const extractServiceDataFromMessage = (message) => {
    // If message has direct service offer metadata, use it
    if (message.serviceOfferId && message.serviceTitle) {
      return {
        serviceOfferId: message.serviceOfferId,
        serviceTitle: message.serviceTitle,
        servicePrice: message.servicePrice || 0,
        serviceDescription: message.serviceDescription || message.serviceTitle,
        estimatedTime: message.estimatedTime || '1-2 hours',
        serviceLocation: message.serviceLocation || 'To be arranged',
        itemTitle: message.itemTitle || 'Item',
        providerName: message.providerName || 'Service Provider',
        sellerId: message.sellerId || extractSellerIdFromConversation(),
        serviceProviderId: message.serviceProviderId || extractProviderIdFromConversation(),
        status: message.status || 'pending',
        conversationId: conversationId,
        createdAt: message.createdAt,
        serviceType: message.serviceType || 'custom'
      };
    }
    
    // Try to extract from message text
    const text = message.text || '';
    
    // Parse service offer from text like: "test2 offered 'Repair Two' for your 'Two' - $250"
    const offerMatch = text.match(/(.+?) offered "(.+?)" for your "(.+?)" - \$?(\d+(?:\.\d{2})?)/);
    
    if (offerMatch) {
      const [, providerName, serviceTitle, itemTitle, servicePrice] = offerMatch;
      
      return {
        serviceOfferId: message.serviceOfferId || `temp_${Date.now()}`,
        providerName: providerName.trim(),
        serviceTitle: serviceTitle.trim(),
        itemTitle: itemTitle.trim(),
        servicePrice: parseFloat(servicePrice),
        sellerId: message.sellerId || extractSellerIdFromConversation(),
        serviceProviderId: message.serviceProviderId || extractProviderIdFromConversation(),
        status: message.status || 'pending',
        conversationId: conversationId,
        createdAt: message.createdAt,
        serviceType: message.serviceType || 'repair',
        serviceDescription: message.serviceDescription || `${serviceTitle.trim()} service`,
        estimatedTime: message.estimatedTime || '1-2 hours',
        serviceLocation: message.serviceLocation || 'Your location'
      };
    }
    
    // Fallback to basic service offer structure
    return {
      serviceOfferId: message.serviceOfferId || `temp_${Date.now()}`,
      providerName: message.providerName || 'Service Provider',
      serviceTitle: message.serviceTitle || 'Service Offer',
      itemTitle: message.itemTitle || 'Item',
      servicePrice: message.servicePrice || 0,
      sellerId: message.sellerId || extractSellerIdFromConversation(),
      serviceProviderId: message.serviceProviderId || extractProviderIdFromConversation(),
      status: message.status || 'pending',
      conversationId: conversationId,
      createdAt: message.createdAt,
      serviceType: message.serviceType || 'custom',
      serviceDescription: message.serviceDescription || 'Service offer',
      estimatedTime: message.estimatedTime || '1-2 hours',
      serviceLocation: message.serviceLocation || 'To be arranged'
    };
  };

  const extractSellerIdFromConversation = () => {
    // Extract seller ID from conversation ID format: service_providerId_sellerId_itemId
    const parts = conversationId.split('_');
    if (parts.length >= 3 && parts[0] === 'service') {
      return parts[2]; // sellerId is the third part
    }
    return null;
  };

  const extractProviderIdFromConversation = () => {
    // Extract provider ID from conversation ID format: service_providerId_sellerId_itemId
    const parts = conversationId.split('_');
    if (parts.length >= 2 && parts[0] === 'service') {
      return parts[1]; // providerId is the second part
    }
    return null;
  };

  const handleAcceptService = async () => {
    if (!serviceOffer) return;

    Alert.alert(
      'Accept Service Offer',
      `Accept "${serviceOffer.serviceTitle}" for $${serviceOffer.servicePrice}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            await withLoading(async () => {
              try {
                const result = await ServiceOfferService.acceptServiceOffer(
                  serviceOffer.serviceOfferId,
                  currentUserId
                );

                showNotification({
                  type: 'success',
                  title: 'Service Offer Accepted!',
                  message: `You accepted "${serviceOffer.serviceTitle}" from ${serviceOffer.providerName}`,
                  autoHide: true,
                  duration: 4000
                });

                setServiceOfferStatus('accepted');

                if (onServiceAction) {
                  onServiceAction('accepted', serviceOffer, result);
                }

              } catch (error) {
                console.error('Error accepting service offer:', error);
                showNotification({
                  type: 'error',
                  title: 'Failed to Accept',
                  message: error.message || 'Could not accept service offer',
                  autoHide: true,
                  duration: 4000
                });
              }
            });
          }
        }
      ]
    );
  };

  const handleDeclineService = async () => {
    if (!serviceOffer) return;

    Alert.prompt(
      'Decline Service Offer',
      'Why are you declining this service offer? (Optional)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          onPress: async (reason) => {
            await withLoading(async () => {
              try {
                await ServiceOfferService.rejectServiceOffer(
                  serviceOffer.serviceOfferId,
                  currentUserId,
                  reason || 'Not interested'
                );

                showNotification({
                  type: 'info',
                  title: 'Service Offer Declined',
                  message: `You declined "${serviceOffer.serviceTitle}"`,
                  autoHide: true,
                  duration: 3000
                });

                setServiceOfferStatus('rejected');

                if (onServiceAction) {
                  onServiceAction('declined', serviceOffer, { reason });
                }

              } catch (error) {
                console.error('Error declining service offer:', error);
                showNotification({
                  type: 'error',
                  title: 'Failed to Decline',
                  message: error.message || 'Could not decline service offer',
                  autoHide: true,
                  duration: 4000
                });
              }
            });
          }
        }
      ],
      'plain-text'
    );
  };

  const handleCounterService = () => {
    // Check counter offer limit
    if (counterOfferCount >= 3) {
      Alert.alert(
        'Counter Limit Reached',
        'Maximum of 3 counter offers have been reached for this service. You can still message the service provider to negotiate.',
        [
          { text: 'OK' },
          {
            text: 'Send Message',
            onPress: () => {
              if (onServiceAction) {
                onServiceAction('counter', serviceOffer, { action: 'message' });
              }
            }
          }
        ]
      );
      return;
    }
    
    // Show counter offer modal
    setShowCounterModal(true);
  };
  
  const handleCounterSubmit = async (counterData) => {
    try {
      await withLoading(async () => {
        const result = await ServiceOfferService.createServiceCounterOffer(
          serviceOffer.serviceOfferId,
          currentUserId,
          counterData
        );
        
        showNotification({
          type: 'success',
          title: 'Counter Offer Sent!',
          message: `Your counter offer of $${counterData.counterPrice} has been sent`,
          autoHide: true,
          duration: 3000
        });
        
        setCounterOfferCount(prev => prev + 1);
        setShowCounterModal(false);
        
        if (onServiceAction) {
          onServiceAction('counter_sent', serviceOffer, result);
        }
      });
    } catch (error) {
      console.error('Error sending counter offer:', error);
      throw error; // Let modal handle the error
    }
  };

  // Show debug info if no service offer found
  if (!serviceOffer) {
    return null; // Don't render anything if no service offer
  }

  // Don't render if current user is the service provider
  if (currentUserId === serviceOffer.serviceProviderId) {
    return null; // Provider doesn't need to see their own offer card
  }

  // Don't render if already accepted or rejected
  if (serviceOfferStatus === 'accepted' || serviceOfferStatus === 'rejected') {
    return null;
  }

  const canTakeAction = currentUserId === serviceOffer.sellerId && serviceOfferStatus === 'pending';
  
  console.log('🔧 ServiceOfferCard RENDER:', {
    currentUserId,
    sellerId: serviceOffer.sellerId,
    serviceProviderId: serviceOffer.serviceProviderId,
    status: serviceOfferStatus,
    canTakeAction,
    isProvider: currentUserId === serviceOffer.serviceProviderId,
    isSeller: currentUserId === serviceOffer.sellerId
  });

  return (
    <View style={styles.container}>
      {/* DEBUG INFO */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>🔍 Debug Info</Text>
        <Text style={styles.debugText}>Your ID: {currentUserId}</Text>
        <Text style={styles.debugText}>Seller ID: {serviceOffer.sellerId}</Text>
        <Text style={styles.debugText}>Provider ID: {serviceOffer.serviceProviderId}</Text>
        <Text style={styles.debugText}>Status: {serviceOfferStatus}</Text>
        <Text style={styles.debugText}>Can Take Action: {canTakeAction ? 'YES' : 'NO'}</Text>
        <Text style={styles.debugText}>You are: {currentUserId === serviceOffer.sellerId ? 'SELLER (Owner)' : currentUserId === serviceOffer.serviceProviderId ? 'PROVIDER' : 'UNKNOWN'}</Text>
      </View>
      
      {/* Service Offer Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="construct" size={24} color="#4CAF50" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Service Offer</Text>
          <Text style={styles.headerSubtitle}>
            From {serviceOffer.providerName}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>${serviceOffer.servicePrice}</Text>
        </View>
      </View>

      {/* Service Details */}
      <View style={styles.serviceDetails}>
        <Text style={styles.serviceTitle}>{serviceOffer.serviceTitle}</Text>
        <Text style={styles.serviceDescription}>
          For your "{serviceOffer.itemTitle}"
        </Text>
        
        <View style={styles.serviceMetadata}>
          <View style={styles.metadataItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.metadataText}>{serviceOffer.estimatedTime}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.metadataText}>{serviceOffer.serviceLocation}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {canTakeAction && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDeclineService}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.counterButton}
            onPress={handleCounterService}
            disabled={loading}
          >
            <Ionicons name="swap-horizontal" size={20} color="#FF9800" />
            <Text style={styles.counterButtonText}>Counter</Text>
          </TouchableOpacity>

          <LoadingButton
            title="Accept"
            onPress={handleAcceptService}
            loading={loading}
            variant="primary"
            icon="checkmark-circle"
            style={styles.acceptButton}
            textStyle={styles.acceptButtonText}
          />
        </View>
      )}

      {/* Status Display */}
      {!canTakeAction && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {serviceOfferStatus === 'pending' 
              ? 'Waiting for response...' 
              : `Service offer ${serviceOfferStatus}`
            }
          </Text>
        </View>
      )}
      
      {/* Counter Offer Modal */}
      <ServiceCounterOfferModal
        visible={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        serviceOffer={serviceOffer}
        currentCounterCount={counterOfferCount}
        onCounterSubmit={handleCounterSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  debugContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    margin: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 2,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  priceContainer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceDetails: {
    padding: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  serviceMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: 'white',
  },
  declineButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  counterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    backgroundColor: 'white',
  },
  counterButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 16,
    paddingTop: 0,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export { ServiceOfferCard };
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ServiceOfferService } from '../services/ServiceOfferService';
import { useNotification } from '../context/NotificationContext';
import LoadingButton from './LoadingButton';

const { width } = Dimensions.get('window');

const SERVICE_TYPES = [
  {
    id: 'delivery',
    title: 'Delivery Service',
    description: 'I can deliver this item to you',
    icon: 'car',
    color: '#2196F3',
    gradient: ['#2196F3', '#1976D2']
  },
  {
    id: 'pickup',
    title: 'Pickup Service',
    description: 'I can pick up this item from you',
    icon: 'location',
    color: '#FF9800',
    gradient: ['#FF9800', '#F57C00']
  },
  {
    id: 'installation',
    title: 'Installation',
    description: 'I can help install or set up this item',
    icon: 'construct',
    color: '#4CAF50',
    gradient: ['#4CAF50', '#388E3C']
  },
  {
    id: 'repair',
    title: 'Repair Service',
    description: 'I can repair or fix this item',
    icon: 'build',
    color: '#9C27B0',
    gradient: ['#9C27B0', '#7B1FA2']
  },
  {
    id: 'consultation',
    title: 'Consultation',
    description: 'I can provide expert advice about this item',
    icon: 'chatbubbles',
    color: '#607D8B',
    gradient: ['#607D8B', '#455A64']
  },
  {
    id: 'custom',
    title: 'Custom Service',
    description: 'I can provide a custom service for this item',
    icon: 'star',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#F44336']
  }
];

export const EnhancedServiceButton = ({ 
  item, 
  user, 
  navigation,
  style = {} 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showNotification, showError } = useNotification();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const serviceAnims = useRef(SERVICE_TYPES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (showModal) {
      // Animate modal entrance
      Animated.spring(modalAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Stagger service type animations
      const animations = serviceAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        })
      );

      Animated.stagger(50, animations).start();
    } else {
      // Reset animations
      modalAnim.setValue(0);
      serviceAnims.forEach(anim => anim.setValue(0));
    }
  }, [showModal]);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowModal(true);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
  };

  const handleSubmitOffer = async () => {
    if (!selectedService) {
      showError('Selection Required', 'Please select a service type');
      return;
    }

    setLoading(true);
    try {
      const result = await ServiceOfferService.createServiceOffer(
        item.id,
        item.userId,
        user.uid,
        selectedService.id,
        selectedService.description
      );

      setShowModal(false);
      setSelectedService(null);

      showNotification({
        type: 'success',
        title: 'Service Offer Sent! 🛠️',
        message: `Your ${selectedService.title.toLowerCase()} offer has been sent to the seller. They can accept or discuss details with you.`,
        autoHide: false,
        actions: [
          {
            title: 'View Messages',
            onPress: () => navigation.navigate('Messages'),
            style: 'primary'
          },
          {
            title: 'OK',
            onPress: () => {},
            style: 'secondary'
          }
        ]
      });

    } catch (error) {
      console.error('Error creating service offer:', error);
      showError('Error', error.message || 'Failed to send service offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={styles.serviceButton}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.gradientButton}
          >
            <Ionicons name="construct" size={20} color="white" />
            <Text style={styles.serviceButtonText}>Offer Service</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: modalAnim,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Ionicons name="construct" size={24} color="#4CAF50" />
                <Text style={styles.modalTitle}>Offer a Service</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              What service can you provide for "{item.title}"?
            </Text>

            {/* Service Types */}
            <ScrollView 
              style={styles.servicesList}
              showsVerticalScrollIndicator={false}
            >
              {SERVICE_TYPES.map((service, index) => (
                <Animated.View
                  key={service.id}
                  style={[
                    {
                      transform: [
                        {
                          translateX: serviceAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0],
                          }),
                        },
                      ],
                      opacity: serviceAnims[index],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.serviceCard,
                      selectedService?.id === service.id && styles.selectedServiceCard
                    ]}
                    onPress={() => handleServiceSelect(service)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={selectedService?.id === service.id ? service.gradient : ['white', 'white']}
                      style={styles.serviceCardGradient}
                    >
                      <View style={styles.serviceCardContent}>
                        <View style={[
                          styles.serviceIcon,
                          { backgroundColor: selectedService?.id === service.id ? 'rgba(255,255,255,0.2)' : service.color }
                        ]}>
                          <Ionicons 
                            name={service.icon} 
                            size={24} 
                            color={selectedService?.id === service.id ? 'white' : 'white'} 
                          />
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={[
                            styles.serviceTitle,
                            selectedService?.id === service.id && styles.selectedServiceTitle
                          ]}>
                            {service.title}
                          </Text>
                          <Text style={[
                            styles.serviceDescription,
                            selectedService?.id === service.id && styles.selectedServiceDescription
                          ]}>
                            {service.description}
                          </Text>
                        </View>
                        {selectedService?.id === service.id && (
                          <Ionicons name="checkmark-circle" size={24} color="white" />
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <LoadingButton
                title={selectedService ? `Offer ${selectedService.title}` : 'Select Service'}
                onPress={handleSubmitOffer}
                loading={loading}
                disabled={!selectedService}
                variant="primary"
                style={[styles.submitButton, !selectedService && styles.disabledButton]}
                textStyle={styles.submitButtonText}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  serviceButton: {
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  serviceButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
  },
  servicesList: {
    flex: 1,
    padding: 20,
  },
  serviceCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedServiceCard: {
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  serviceCardGradient: {
    padding: 16,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  selectedServiceTitle: {
    color: 'white',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  selectedServiceDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default EnhancedServiceButton;
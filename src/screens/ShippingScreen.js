import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ShippingScreen({ route, navigation }) {
  const { itemId, itemTitle, sellerAddress } = route.params || {};
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);

  const carriers = [
    { 
      id: 'fedex', 
      name: 'FedEx', 
      icon: 'airplane-outline', 
      services: [
        { id: 'ground', name: 'FedEx Ground', days: '3-5 business days', price: 8.99 },
        { id: 'express', name: 'FedEx Express', days: '1-2 business days', price: 18.99 },
        { id: 'overnight', name: 'FedEx Overnight', days: 'Next business day', price: 29.99 },
      ]
    },
    { 
      id: 'ups', 
      name: 'UPS', 
      icon: 'cube-outline', 
      services: [
        { id: 'ground', name: 'UPS Ground', days: '3-5 business days', price: 7.99 },
        { id: 'express', name: 'UPS Express', days: '1-2 business days', price: 17.99 },
        { id: 'overnight', name: 'UPS Overnight', days: 'Next business day', price: 27.99 },
      ]
    },
    { 
      id: 'usps', 
      name: 'USPS', 
      icon: 'mail-outline', 
      services: [
        { id: 'priority', name: 'Priority Mail', days: '1-3 business days', price: 9.99 },
        { id: 'express', name: 'Priority Express', days: '1-2 business days', price: 22.99 },
      ]
    },
  ];

  const handleGenerateLabel = async () => {
    if (!selectedCarrier || !selectedService) {
      Alert.alert('Select Shipping', 'Please select a carrier and shipping service');
      return;
    }

    setLoading(true);
    
    // Simulate label generation
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Shipping Label Generated! 📦',
        `Your ${selectedCarrier.name} ${selectedService.name} label has been generated. You can print it now or later from your orders.`,
        [
          { text: 'Print Label', onPress: () => Alert.alert('Print', 'Opening print dialog...') },
          { text: 'View Orders', onPress: () => navigation.navigate('TradeHistory') },
          { text: 'Done', style: 'cancel' }
        ]
      );
    }, 2000);
  };

  const renderCarrier = (carrier) => (
    <TouchableOpacity
      key={carrier.id}
      style={[
        styles.carrierCard,
        selectedCarrier === carrier.id && styles.selectedCarrier
      ]}
      onPress={() => {
        setSelectedCarrier(carrier.id);
        setSelectedService(null);
      }}
    >
      <View style={styles.carrierHeader}>
        <View style={styles.carrierIcon}>
          <Ionicons name={carrier.icon} size={32} color={selectedCarrier === carrier.id ? '#FF6B6B' : '#666'} />
        </View>
        <Text style={styles.carrierName}>{carrier.name}</Text>
        {selectedCarrier === carrier.id && (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </View>
      
      {selectedCarrier === carrier.id && (
        <View style={styles.servicesList}>
          {carrier.services.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceItem,
                selectedService === service.id && styles.selectedService
              ]}
              onPress={() => setSelectedService(service.id)}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDays}>{service.days}</Text>
              </View>
              <View style={styles.servicePrice}>
                <Text style={styles.priceAmount}>${service.price}</Text>
                {selectedService === service.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping Label</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Item Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          <View style={styles.itemInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Item:</Text>
              <Text style={styles.infoValue}>{itemTitle || 'Item'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Destination:</Text>
              <Text style={styles.infoValue}>{sellerAddress || 'Seller Address'}</Text>
            </View>
          </View>
        </View>

        {/* Shipping Insurance */}
        <View style={styles.section}>
          <View style={styles.insuranceHeader}>
            <View style={styles.insuranceIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.insuranceInfo}>
              <Text style={styles.insuranceTitle}>Shipping Insurance</Text>
              <Text style={styles.insuranceDescription}>Protect your shipment up to $200</Text>
            </View>
            <TouchableOpacity style={styles.insuranceToggle}>
              <View style={[styles.toggleTrack, styles.toggleActive]}>
                <View style={styles.toggleThumb} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.insurancePrice}>Included FREE</Text>
        </View>

        {/* Carriers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Carrier</Text>
          <View style={styles.carriersList}>
            {carriers.map(renderCarrier)}
          </View>
        </View>

        {/* Package Details */}
        {selectedCarrier && selectedService && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Details</Text>
            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Weight</Text>
                <Text style={styles.detailValue}>Under 1 lb</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dimensions</Text>
                <Text style={styles.detailValue}>12" x 9" x 2"</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>
                  {carriers.find(c => c.id === selectedCarrier)?.services.find(s => s.id === selectedService)?.name}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tracking Info */}
        <View style={styles.trackingSection}>
          <View style={styles.trackingItem}>
            <Ionicons name="navigate-outline" size={20} color="#FF6B6B" />
            <Text style={styles.trackingText}>Real-time tracking included</Text>
          </View>
          <View style={styles.trackingItem}>
            <Ionicons name="time-outline" size={20} color="#FF6B6B" />
            <Text style={styles.trackingText}>Delivery confirmation</Text>
          </View>
          <View style={styles.trackingItem}>
            <Ionicons name="document-text-outline" size={20} color="#FF6B6B" />
            <Text style={styles.trackingText}>Printable PDF label</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      {selectedCarrier && selectedService && (
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Shipping Cost</Text>
            <Text style={styles.footerTotalValue}>
              ${carriers.find(c => c.id === selectedCarrier)?.services.find(s => s.id === selectedService)?.price}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.generateButton, loading && styles.disabledButton]}
            onPress={handleGenerateLabel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="print-outline" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Generate Shipping Label</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  itemInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  insuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insuranceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insuranceInfo: {
    flex: 1,
  },
  insuranceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  insuranceDescription: {
    fontSize: 12,
    color: '#888',
  },
  insuranceToggle: {
    marginLeft: 12,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  insurancePrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 12,
  },
  carriersList: {
    marginTop: 8,
  },
  carrierCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCarrier: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  carrierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carrierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  carrierName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  servicesList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  selectedService: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  serviceDays: {
    fontSize: 12,
    color: '#888',
  },
  servicePrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
    marginRight: 8,
  },
  packageDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  trackingSection: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  trackingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerTotalLabel: {
    fontSize: 14,
    color: '#666',
  },
  footerTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6B6B',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
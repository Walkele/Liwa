import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentScreen({ route, navigation }) {
  const { amount, itemId, itemTitle, sellerId, sellerName } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [savedCards, setSavedCards] = useState([
    { id: '1', last4: '4242', brand: 'Visa', isDefault: true },
    { id: '2', last4: '5555', brand: 'Mastercard', isDefault: false },
  ]);

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'card-outline', description: 'Visa, Mastercard, Amex' },
    { id: 'apple_pay', name: 'Apple Pay', icon: 'logo-apple', description: 'Fast & secure' },
    { id: 'google_pay', name: 'Google Pay', icon: 'logo-google', description: 'Quick checkout' },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please choose a payment method to continue');
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Payment Successful! 🎉',
        `Your payment of $${amount} has been processed securely. The seller has been notified.`,
        [
          { text: 'View Order', onPress: () => navigation.navigate('TradeHistory') },
          { text: 'Continue Shopping', onPress: () => navigation.popToTop() }
        ]
      );
    }, 2000);
  };

  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethod,
        selectedMethod === method.id && styles.selectedMethod
      ]}
      onPress={() => setSelectedMethod(method.id)}
    >
      <View style={styles.methodIcon}>
        <Ionicons name={method.icon} size={28} color={selectedMethod === method.id ? '#FF6B6B' : '#666'} />
      </View>
      <View style={styles.methodInfo}>
        <Text style={styles.methodName}>{method.name}</Text>
        <Text style={styles.methodDescription}>{method.description}</Text>
      </View>
      <View style={styles.methodRadio}>
        <View style={[
          styles.radioOuter,
          selectedMethod === method.id && styles.radioOuterSelected
        ]}>
          {selectedMethod === method.id && <View style={styles.radioInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Item</Text>
              <Text style={styles.summaryValue}>{itemTitle || 'Item'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Seller</Text>
              <Text style={styles.summaryValue}>{sellerName || 'Seller'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${amount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Text style={styles.summaryValue}>${(amount * 0.05).toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${(amount * 1.05).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        </View>

        {/* Saved Cards */}
        {selectedMethod === 'card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Cards</Text>
            {savedCards.map(card => (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.savedCard,
                  card.isDefault && styles.defaultCard
                ]}
              >
                <View style={styles.cardBrand}>
                  <Ionicons 
                    name={card.brand === 'Visa' ? 'card-outline' : 'card-outline'} 
                    size={24} 
                    color="#666" 
                  />
                  <Text style={styles.cardBrandText}>{card.brand}</Text>
                </View>
                <Text style={styles.cardNumber}>•••• {card.last4}</Text>
                {card.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addCardButton}>
              <Ionicons name="add-circle-outline" size={20} color="#FF6B6B" />
              <Text style={styles.addCardText}>Add New Card</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>Buyer Protection Guarantee</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>256-bit SSL Encryption</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="card-outline" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>Secure Payment Processing</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By completing this purchase, you agree to our Terms of Service and Privacy Policy. 
            Your payment information is secure and will not be shared with the seller until the transaction is complete.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total Amount</Text>
          <Text style={styles.footerTotalValue}>${(amount * 1.05).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.payButton, (!selectedMethod || loading) && styles.disabledButton]}
          onPress={handlePayment}
          disabled={!selectedMethod || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="white" style={styles.payButtonIcon} />
              <Text style={styles.payButtonText}>Pay Securely</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  orderSummary: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: '800',
  },
  paymentMethods: {
    marginTop: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMethod: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 12,
    color: '#888',
  },
  methodRadio: {
    marginLeft: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FF6B6B',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  defaultCard: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBrandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  cardNumber: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  securitySection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '500',
  },
  termsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
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
  payButton: {
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
  payButtonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
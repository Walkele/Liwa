import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BoostAndPremiumService } from '../services/BoostAndPremiumService';
import { TrustScoreService } from '../services/TrustScoreService';
import { useAuth } from '../context/AuthContext';

export default function PremiumSubscriptionScreen({ navigation }) {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [userTrustScore, setUserTrustScore] = useState(0);
  const [selectedTier, setSelectedTier] = useState('PREMIUM');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load current subscription
      const subscription = await BoostAndPremiumService.getUserSubscription(user.uid);
      setCurrentSubscription(subscription);

      // Load trust score for discount calculation
      const trustData = await TrustScoreService.calculateTrustScore(user.uid);
      setUserTrustScore(trustData.score);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleUpgradeSubscription = async (tier) => {
    try {
      setLoading(true);
      
      const result = await BoostAndPremiumService.upgradeSubscription(
        user.uid, 
        tier, 
        'demo_payment_method'
      );
      
      Alert.alert(
        'Success!', 
        `Welcome to ${tier}! Your new features are now active.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
      // Reload subscription data
      await loadUserData();
      
    } catch (error) {
      Alert.alert('Error', 'Failed to upgrade subscription. Please try again.');
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  const getTrustDiscount = () => {
    return BoostAndPremiumService.getTrustDiscount(userTrustScore);
  };

  const calculateDiscountedPrice = (originalPrice) => {
    const discount = getTrustDiscount();
    return originalPrice * (1 - discount);
  };

  const renderSubscriptionTier = (tierKey, tier) => {
    const isCurrentTier = currentSubscription?.tier === tierKey;
    const discount = getTrustDiscount();
    const discountedPrice = calculateDiscountedPrice(tier.price);
    const savings = tier.price - discountedPrice;

    return (
      <View 
        key={tierKey}
        style={[
          styles.tierCard,
          isCurrentTier && styles.currentTierCard,
          tierKey === 'PREMIUM' && styles.popularTierCard
        ]}
      >
        {tierKey === 'PREMIUM' && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}
        
        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>{tier.name}</Text>
          <View style={styles.tierPricing}>
            {tier.price > 0 ? (
              <>
                {discount > 0 && (
                  <Text style={styles.originalPrice}>${tier.price}</Text>
                )}
                <Text style={styles.tierPrice}>
                  ${discountedPrice.toFixed(2)}
                </Text>
                <Text style={styles.tierDuration}>/{tier.duration}</Text>
              </>
            ) : (
              <Text style={styles.tierPrice}>Free</Text>
            )}
          </View>
          
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                Save ${savings.toFixed(2)} with {userTrustScore}+ trust!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.featuresContainer}>
          <FeatureItem 
            icon="swap-horizontal" 
            text={tier.features.swipesPerDay === -1 ? 'Unlimited swipes' : `${tier.features.swipesPerDay} swipes per day`}
            included={true}
          />
          <FeatureItem 
            icon="search" 
            text={tier.features.searchRadius === -1 ? 'Global search' : `${tier.features.searchRadius}km search radius`}
            included={true}
          />
          <FeatureItem 
            icon="rocket" 
            text={tier.features.boostsPerMonth === 0 ? 'No boosts included' : `${tier.features.boostsPerMonth} boosts per month`}
            included={tier.features.boostsPerMonth > 0}
          />
          <FeatureItem 
            icon="filter" 
            text="Advanced filters"
            included={tier.features.advancedFilters}
          />
          <FeatureItem 
            icon="star" 
            text="Priority listing"
            included={tier.features.priorityListing}
          />
          <FeatureItem 
            icon="shield-checkmark" 
            text="Verification badge"
            included={tier.features.verificationBadge}
          />
          <FeatureItem 
            icon="headset" 
            text="Premium support"
            included={tier.features.premiumSupport}
          />
          <FeatureItem 
            icon="analytics" 
            text="Analytics access"
            included={tier.features.analyticsAccess}
          />
          
          {tierKey === 'PRO' && (
            <>
              <FeatureItem 
                icon="layers" 
                text="Bulk operations"
                included={tier.features.bulkOperations}
              />
              <FeatureItem 
                icon="code" 
                text="API access"
                included={tier.features.apiAccess}
              />
            </>
          )}
        </View>

        <View style={styles.limitsContainer}>
          <Text style={styles.limitsTitle}>Limits:</Text>
          <Text style={styles.limitsText}>
            • {tier.limits.activeItems === -1 ? 'Unlimited' : tier.limits.activeItems} active items
          </Text>
          <Text style={styles.limitsText}>
            • {tier.limits.savedSearches === -1 ? 'Unlimited' : tier.limits.savedSearches} saved searches
          </Text>
          <Text style={styles.limitsText}>
            • {tier.limits.messageHistory === -1 ? 'Unlimited' : `${tier.limits.messageHistory} days`} message history
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.tierButton,
            isCurrentTier ? styles.currentTierButton : styles.upgradeTierButton,
            tierKey === 'PREMIUM' && !isCurrentTier && styles.popularTierButton
          ]}
          onPress={() => {
            if (!isCurrentTier && tierKey !== 'FREE') {
              setSelectedTier(tierKey);
              setShowPaymentModal(true);
            }
          }}
          disabled={isCurrentTier || loading}
        >
          <Text style={[
            styles.tierButtonText,
            isCurrentTier ? styles.currentTierButtonText : styles.upgradeTierButtonText
          ]}>
            {isCurrentTier ? 'Current Plan' : tierKey === 'FREE' ? 'Downgrade' : 'Upgrade'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const FeatureItem = ({ icon, text, included }) => (
    <View style={styles.featureItem}>
      <Ionicons 
        name={included ? "checkmark-circle" : "close-circle"} 
        size={20} 
        color={included ? "#4CAF50" : "#F44336"} 
      />
      <Ionicons name={icon} size={16} color="#666" style={styles.featureIcon} />
      <Text style={[styles.featureText, !included && styles.featureTextDisabled]}>
        {text}
      </Text>
    </View>
  );

  const PaymentModal = () => {
    const selectedTierData = BoostAndPremiumService.SUBSCRIPTION_TIERS[selectedTier];
    const discountedPrice = calculateDiscountedPrice(selectedTierData.price);
    
    return (
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Upgrade to {selectedTierData.name}</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentSummary}>
              <Text style={styles.paymentAmount}>${discountedPrice.toFixed(2)}</Text>
              <Text style={styles.paymentDuration}>per {selectedTierData.duration}</Text>
              
              {getTrustDiscount() > 0 && (
                <View style={styles.paymentDiscount}>
                  <Ionicons name="star" size={16} color="#FF9800" />
                  <Text style={styles.paymentDiscountText}>
                    {Math.round(getTrustDiscount() * 100)}% trust discount applied!
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.paymentMethods}>
              <Text style={styles.paymentMethodsTitle}>Payment Method</Text>
              <TouchableOpacity style={styles.paymentMethod}>
                <Ionicons name="card" size={20} color="#666" />
                <Text style={styles.paymentMethodText}>•••• •••• •••• 1234</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.cancelPaymentButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelPaymentButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPaymentButton}
                onPress={() => handleUpgradeSubscription(selectedTier)}
                disabled={loading}
              >
                <Text style={styles.confirmPaymentButtonText}>
                  {loading ? 'Processing...' : 'Confirm Upgrade'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Plans</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Trust Discount Info */}
        {getTrustDiscount() > 0 && (
          <View style={styles.discountInfoCard}>
            <View style={styles.discountInfoHeader}>
              <Ionicons name="star" size={24} color="#FF9800" />
              <Text style={styles.discountInfoTitle}>
                Trust Reward: {Math.round(getTrustDiscount() * 100)}% Off!
              </Text>
            </View>
            <Text style={styles.discountInfoText}>
              Your {userTrustScore} trust score earns you a discount on all premium plans!
            </Text>
          </View>
        )}

        {/* Current Subscription Info */}
        {currentSubscription && (
          <View style={styles.currentSubCard}>
            <Text style={styles.currentSubTitle}>Current Plan</Text>
            <Text style={styles.currentSubTier}>{currentSubscription.tier}</Text>
            {currentSubscription.endDate && (
              <Text style={styles.currentSubExpiry}>
                {currentSubscription.tier !== 'FREE' ? 
                  `Renews on ${new Date(currentSubscription.endDate.seconds * 1000).toLocaleDateString()}` :
                  'Free forever'
                }
              </Text>
            )}
          </View>
        )}

        {/* Subscription Tiers */}
        <View style={styles.tiersContainer}>
          {Object.entries(BoostAndPremiumService.SUBSCRIPTION_TIERS).map(([key, tier]) =>
            renderSubscriptionTier(key, tier)
          )}
        </View>

        {/* Benefits Summary */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why Go Premium?</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.benefitText}>Increase your item visibility by up to 300%</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="globe" size={20} color="#2196F3" />
              <Text style={styles.benefitText}>Access global marketplace beyond your area</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={20} color="#FF9800" />
              <Text style={styles.benefitText}>Get verified badge for increased trust</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="headset" size={20} color="#9C27B0" />
              <Text style={styles.benefitText}>Priority customer support</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <PaymentModal />
    </SafeAreaView>
  );
}

const FeatureItem = ({ icon, text, included }) => (
  <View style={styles.featureItem}>
    <Ionicons 
      name={included ? "checkmark-circle" : "close-circle"} 
      size={20} 
      color={included ? "#4CAF50" : "#F44336"} 
    />
    <Ionicons name={icon} size={16} color="#666" style={styles.featureIcon} />
    <Text style={[styles.featureText, !included && styles.featureTextDisabled]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  discountInfoCard: {
    backgroundColor: '#FFF8E1',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  discountInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 8,
  },
  discountInfoText: {
    fontSize: 14,
    color: '#E65100',
  },
  currentSubCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentSubTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentSubTier: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  currentSubExpiry: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tiersContainer: {
    paddingHorizontal: 16,
  },
  tierCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentTierCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  popularTierCard: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B6B',
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  tierHeader: {
    marginBottom: 20,
    marginTop: 8,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tierPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  tierPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  tierDuration: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  discountBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginLeft: 8,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  featureTextDisabled: {
    color: '#999',
  },
  limitsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  limitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  limitsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tierButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentTierButton: {
    backgroundColor: '#E8F5E8',
  },
  upgradeTierButton: {
    backgroundColor: '#FF6B6B',
  },
  popularTierButton: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tierButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentTierButtonText: {
    color: '#2E7D32',
  },
  upgradeTierButtonText: {
    color: 'white',
  },
  benefitsCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  benefitsList: {
    marginLeft: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentSummary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  paymentAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  paymentDuration: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  paymentDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  paymentDiscountText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 4,
    fontWeight: '600',
  },
  paymentMethods: {
    marginBottom: 24,
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelPaymentButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginRight: 8,
  },
  confirmPaymentButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelPaymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmPaymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
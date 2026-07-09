import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BoostAndPremiumService } from '../services/BoostAndPremiumService';
import { TrustScoreService } from '../services/TrustScoreService';
import { useAuth } from '../context/AuthContext';

export default function ItemBoostScreen({ route, navigation }) {
  const { item } = route.params;
  const { user } = useAuth();
  
  const [userTrustScore, setUserTrustScore] = useState(0);
  const [selectedBoost, setSelectedBoost] = useState('ITEM_BOOST');
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [activeBoosts, setActiveBoosts] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load trust score for discount calculation
      const trustData = await TrustScoreService.calculateTrustScore(user.uid);
      setUserTrustScore(trustData.score);

      // Load active boosts
      const boosts = await BoostAndPremiumService.getUserActiveBoosts(user.uid);
      setActiveBoosts(boosts);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handlePurchaseBoost = async () => {
    try {
      setLoading(true);
      
      const result = await BoostAndPremiumService.purchaseItemBoost(
        user.uid,
        item.id,
        selectedBoost,
        selectedDuration
      );
      
      Alert.alert(
        'Boost Activated!', 
        `Your item is now boosted for ${selectedDuration} hours. Expect increased visibility!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to purchase boost. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTrustDiscount = () => {
    return BoostAndPremiumService.getTrustDiscount(userTrustScore);
  };

  const calculateBoostPrice = (boostType, duration) => {
    const boost = BoostAndPremiumService.BOOST_TYPES[boostType];
    const discount = getTrustDiscount();
    return BoostAndPremiumService.calculateBoostPrice(boost.basePrice, duration, discount);
  };

  const getEstimatedImpact = (boostType) => {
    const boost = BoostAndPremiumService.BOOST_TYPES[boostType];
    const baseViews = 100; // Estimated base views per day
    const boostedViews = Math.round(baseViews * boost.multiplier);
    return {
      viewIncrease: `+${Math.round((boost.multiplier - 1) * 100)}%`,
      estimatedViews: boostedViews,
      multiplier: boost.multiplier
    };
  };

  const renderBoostOption = (boostKey, boost) => {
    const isSelected = selectedBoost === boostKey;
    const price = calculateBoostPrice(boostKey, selectedDuration);
    const originalPrice = BoostAndPremiumService.calculateBoostPrice(boost.basePrice, selectedDuration, 0);
    const impact = getEstimatedImpact(boostKey);
    const discount = getTrustDiscount();

    return (
      <TouchableOpacity
        key={boostKey}
        style={[styles.boostOption, isSelected && styles.selectedBoostOption]}
        onPress={() => setSelectedBoost(boostKey)}
      >
        <View style={styles.boostHeader}>
          <View style={styles.boostIconContainer}>
            <Text style={styles.boostEmoji}>{boost.icon}</Text>
          </View>
          <View style={styles.boostInfo}>
            <Text style={styles.boostName}>{boost.name}</Text>
            <Text style={styles.boostDescription}>{boost.description}</Text>
          </View>
          <View style={styles.boostPricing}>
            {discount > 0 && (
              <Text style={styles.originalBoostPrice}>${originalPrice}</Text>
            )}
            <Text style={styles.boostPrice}>${price}</Text>
          </View>
        </View>

        <View style={styles.boostImpact}>
          <View style={styles.impactItem}>
            <Ionicons name="trending-up" size={16} color="#4CAF50" />
            <Text style={styles.impactText}>
              {impact.viewIncrease} more views
            </Text>
          </View>
          <View style={styles.impactItem}>
            <Ionicons name="eye" size={16} color="#2196F3" />
            <Text style={styles.impactText}>
              ~{impact.estimatedViews} daily views
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDurationOption = (hours, label) => {
    const isSelected = selectedDuration === hours;
    const price = calculateBoostPrice(selectedBoost, hours);
    
    return (
      <TouchableOpacity
        key={hours}
        style={[styles.durationOption, isSelected && styles.selectedDurationOption]}
        onPress={() => setSelectedDuration(hours)}
      >
        <Text style={[styles.durationLabel, isSelected && styles.selectedDurationLabel]}>
          {label}
        </Text>
        <Text style={[styles.durationPrice, isSelected && styles.selectedDurationPrice]}>
          ${price}
        </Text>
      </TouchableOpacity>
    );
  };

  const currentItemBoost = activeBoosts.find(boost => boost.itemId === item.id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boost Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Item Preview */}
        <View style={styles.itemPreview}>
          <View style={styles.itemImageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
            ) : (
              <View style={styles.noItemImage}>
                <Ionicons name="image-outline" size={40} color="#ccc" />
              </View>
            )}
            {currentItemBoost && (
              <View style={styles.currentBoostBadge}>
                <Text style={styles.currentBoostText}>BOOSTED</Text>
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemPrice}>${item.price}</Text>
            <Text style={styles.itemLocation}>{item.location}</Text>
          </View>
        </View>

        {/* Current Boost Status */}
        {currentItemBoost && (
          <View style={styles.currentBoostCard}>
            <View style={styles.currentBoostHeader}>
              <Ionicons name="rocket" size={20} color="#FF6B6B" />
              <Text style={styles.currentBoostTitle}>Currently Boosted</Text>
            </View>
            <Text style={styles.currentBoostDetails}>
              {currentItemBoost.boostType.replace('_', ' ')} • 
              Expires {new Date(currentItemBoost.endTime.seconds * 1000).toLocaleDateString()}
            </Text>
            <View style={styles.currentBoostStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentItemBoost.impressions || 0}</Text>
                <Text style={styles.statLabel}>Impressions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentItemBoost.clicks || 0}</Text>
                <Text style={styles.statLabel}>Clicks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentItemBoost.conversions || 0}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trust Discount Info */}
        {getTrustDiscount() > 0 && (
          <View style={styles.discountCard}>
            <View style={styles.discountHeader}>
              <Ionicons name="star" size={20} color="#FF9800" />
              <Text style={styles.discountTitle}>
                Trust Reward: {Math.round(getTrustDiscount() * 100)}% Off!
              </Text>
            </View>
            <Text style={styles.discountText}>
              Your {userTrustScore} trust score earns you a discount on all boosts!
            </Text>
          </View>
        )}

        {/* Boost Options */}
        <View style={styles.boostOptionsCard}>
          <Text style={styles.sectionTitle}>Choose Boost Type</Text>
          {Object.entries(BoostAndPremiumService.BOOST_TYPES).map(([key, boost]) =>
            renderBoostOption(key, boost)
          )}
        </View>

        {/* Duration Options */}
        <View style={styles.durationCard}>
          <Text style={styles.sectionTitle}>Choose Duration</Text>
          <View style={styles.durationOptions}>
            {renderDurationOption(24, '1 Day')}
            {renderDurationOption(48, '2 Days')}
            {renderDurationOption(72, '3 Days')}
            {renderDurationOption(168, '1 Week')}
          </View>
        </View>

        {/* Boost Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.sectionTitle}>Boost Benefits</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.benefitText}>Appear at the top of search results</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="eye" size={20} color="#2196F3" />
              <Text style={styles.benefitText}>Increase visibility by up to 300%</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="people" size={20} color="#FF9800" />
              <Text style={styles.benefitText}>Reach more potential buyers</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="time" size={20} color="#9C27B0" />
              <Text style={styles.benefitText}>Sell faster with priority placement</Text>
            </View>
          </View>
        </View>

        {/* Purchase Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Purchase Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Boost Type:</Text>
            <Text style={styles.summaryValue}>
              {BoostAndPremiumService.BOOST_TYPES[selectedBoost].name}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{selectedDuration} hours</Text>
          </View>
          {getTrustDiscount() > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trust Discount:</Text>
              <Text style={styles.summaryDiscount}>
                -{Math.round(getTrustDiscount() * 100)}%
              </Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total:</Text>
            <Text style={styles.summaryTotalPrice}>
              ${calculateBoostPrice(selectedBoost, selectedDuration)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.purchaseContainer}>
        <TouchableOpacity
          style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
          onPress={handlePurchaseBoost}
          disabled={loading}
        >
          <Ionicons name="rocket" size={20} color="white" />
          <Text style={styles.purchaseButtonText}>
            {loading ? 'Processing...' : `Boost for $${calculateBoostPrice(selectedBoost, selectedDuration)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  itemPreview: {
    flexDirection: 'row',
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
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBoostBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBoostText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 14,
    color: '#666',
  },
  currentBoostCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  currentBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentBoostTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginLeft: 8,
  },
  currentBoostDetails: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 12,
  },
  currentBoostStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#1976D2',
    marginTop: 2,
  },
  discountCard: {
    backgroundColor: '#FFF8E1',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 8,
  },
  discountText: {
    fontSize: 14,
    color: '#E65100',
  },
  boostOptionsCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  boostOption: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  selectedBoostOption: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  boostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boostIconContainer: {
    marginRight: 12,
  },
  boostEmoji: {
    fontSize: 24,
  },
  boostInfo: {
    flex: 1,
  },
  boostName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  boostDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  boostPricing: {
    alignItems: 'flex-end',
  },
  originalBoostPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  boostPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  boostImpact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  durationCard: {
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
  durationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  selectedDurationOption: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedDurationLabel: {
    color: '#FF6B6B',
  },
  durationPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  selectedDurationPrice: {
    color: '#FF6B6B',
  },
  benefitsCard: {
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
  summaryCard: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryDiscount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  purchaseContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
});
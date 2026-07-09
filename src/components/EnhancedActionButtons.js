import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Platform,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingButton from './LoadingButton';

const { width } = Dimensions.get('window');

export const EnhancedActionButtons = ({
  onMessage,
  onTrade,
  onOffer,
  onService,
  tradeButtonLoading = false,
  offerButtonLoading = false,
  existingTradeProposals = [],
  existingOffers = [],
  userItemsCount = 0,
  style = {}
}) => {
  const [pressedButton, setPressedButton] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation on mount
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Subtle pulse animation for primary buttons
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const handlePressIn = (buttonName) => {
    setPressedButton(buttonName);
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setPressedButton(null);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const hasPendingTrade = existingTradeProposals.some(p => p.status === 'pending');
  const hasPendingOffer = existingOffers.some(o => o.status === 'pending');

  const getTradeButtonText = () => {
    if (tradeButtonLoading) return 'Loading...';
    if (hasPendingTrade) return 'Pending';
    return `Trade (${userItemsCount})`;
  };

  const getOfferButtonText = () => {
    if (offerButtonLoading) return 'Sending...';
    if (hasPendingOffer) return 'Pending';
    return 'Make Offer';
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Primary Action Row */}
      <View style={styles.primaryRow}>
        {/* Message Button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            { transform: [{ scale: pressedButton === 'message' ? scaleAnim : 1 }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.messageButton, styles.primaryButton]}
            onPress={onMessage}
            onPressIn={() => handlePressIn('message')}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FF6B6B" />
              <Text style={styles.messageButtonText}>Message</Text>
            </View>
            <View style={styles.buttonRipple} />
          </TouchableOpacity>
        </Animated.View>

        {/* Trade Button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            { 
              transform: [
                { scale: pressedButton === 'trade' ? scaleAnim : 1 },
                { scale: !hasPendingTrade ? pulseAnim : 1 }
              ] 
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tradeButton, 
              styles.primaryButton,
              hasPendingTrade && styles.pendingButton,
              tradeButtonLoading && styles.loadingButton
            ]}
            onPress={onTrade}
            onPressIn={() => handlePressIn('trade')}
            onPressOut={handlePressOut}
            disabled={hasPendingTrade || tradeButtonLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={hasPendingTrade ? ['#FF9500', '#FF7A00'] : ['#4CAF50', '#45A049']}
              style={styles.gradientButton}
            >
              <View style={styles.buttonContent}>
                {tradeButtonLoading ? (
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: pulseAnim.interpolate({
                          inputRange: [1, 1.05],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    }}
                  >
                    <Ionicons name="refresh" size={20} color="white" />
                  </Animated.View>
                ) : (
                  <Ionicons 
                    name={hasPendingTrade ? "time" : "swap-horizontal"} 
                    size={20} 
                    color="white" 
                  />
                )}
                <Text style={styles.tradeButtonText}>{getTradeButtonText()}</Text>
              </View>
              {!hasPendingTrade && !tradeButtonLoading && (
                <View style={styles.shimmerEffect} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Secondary Action Row */}
      <View style={styles.secondaryRow}>
        {/* Offer Button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            { 
              transform: [
                { scale: pressedButton === 'offer' ? scaleAnim : 1 },
                { scale: !hasPendingOffer ? pulseAnim : 1 }
              ] 
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.offerButton, 
              styles.secondaryButton,
              hasPendingOffer && styles.pendingButton,
              offerButtonLoading && styles.loadingButton
            ]}
            onPress={onOffer}
            onPressIn={() => handlePressIn('offer')}
            onPressOut={handlePressOut}
            disabled={hasPendingOffer || offerButtonLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={hasPendingOffer ? ['#FF9500', '#FF7A00'] : ['#FF6B6B', '#FF5252']}
              style={styles.gradientButton}
            >
              <View style={styles.buttonContent}>
                {offerButtonLoading ? (
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: pulseAnim.interpolate({
                          inputRange: [1, 1.05],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    }}
                  >
                    <Ionicons name="refresh" size={18} color="white" />
                  </Animated.View>
                ) : (
                  <Ionicons 
                    name={hasPendingOffer ? "time" : "pricetag"} 
                    size={18} 
                    color="white" 
                  />
                )}
                <Text style={styles.offerButtonText}>{getOfferButtonText()}</Text>
              </View>
              {!hasPendingOffer && !offerButtonLoading && (
                <View style={styles.shimmerEffect} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Service Button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            { transform: [{ scale: pressedButton === 'service' ? scaleAnim : 1 }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.serviceButton, styles.secondaryButton]}
            onPress={onService}
            onPressIn={() => handlePressIn('service')}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="construct" size={18} color="#4CAF50" />
              <Text style={styles.serviceButtonText}>Service</Text>
            </View>
            <View style={styles.buttonRipple} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Status Indicators */}
      {(hasPendingTrade || hasPendingOffer) && (
        <View style={styles.statusIndicator}>
          <Ionicons name="information-circle" size={16} color="#FF9500" />
          <Text style={styles.statusText}>
            {hasPendingTrade && hasPendingOffer 
              ? 'You have pending trade and offer requests'
              : hasPendingTrade 
                ? 'You have a pending trade request'
                : 'You have a pending offer request'
            }
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  secondaryButton: {
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  messageButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  tradeButton: {
    // Gradient handled by LinearGradient
  },
  offerButton: {
    // Gradient handled by LinearGradient
  },
  serviceButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  pendingButton: {
    opacity: 0.7,
  },
  loadingButton: {
    opacity: 0.8,
  },
  messageButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  tradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  offerButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  serviceButtonText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  buttonRipple: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0,
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  statusText: {
    fontSize: 12,
    color: '#F57F17',
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
  },
});

export default EnhancedActionButtons;
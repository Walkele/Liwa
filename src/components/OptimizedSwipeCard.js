import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

export default function OptimizedSwipeCard({ 
  item, 
  index, 
  currentIndex, 
  onSwipe, 
  style 
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(index === currentIndex ? 1 : 0.95)).current;
  const opacity = useRef(new Animated.Value(index === currentIndex ? 1 : 0.8)).current;

  if (index < currentIndex - 1 || index > currentIndex + 2) {
    return null; // Don't render cards that are too far away
  }

  const resetCardPosition = () => {
    translateX.setValue(0);
    translateY.setValue(0);
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === 5) { // END state
      const { translationX, velocityX } = event.nativeEvent;
      
      // Determine swipe direction based on translation and velocity
      const shouldSwipe = Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 1000;
      
      if (shouldSwipe) {
        const direction = translationX > 0 ? 'right' : 'left';
        
        // Animate card off screen with improved performance
        Animated.timing(translateX, {
          toValue: translationX > 0 ? screenWidth * 1.5 : -screenWidth * 1.5,
          duration: 200, // Faster animation
          useNativeDriver: true,
        }).start(() => {
          onSwipe(direction, item);
          resetCardPosition();
        });
        
        // Fade out for better visual effect
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
      } else {
        // Snap back to center with spring animation
        Animated.spring(translateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
        
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const rotateInterpolate = translateX.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ['-15deg', '0deg', '15deg'], // Reduced rotation for smoother feel
    extrapolate: 'clamp',
  });

  const cardStyle = {
    transform: [
      { translateX },
      { translateY },
      { rotate: rotateInterpolate },
      { scale }
    ],
    opacity,
    zIndex: currentIndex - index,
  };

  const formatPrice = (price) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}k`;
    }
    return `$${price}`;
  };

  const getOfferStatusBadge = () => {
    if (!item.hasExistingOffer) return null;

    const badgeColor = item.existingOfferStatus === 'pending' ? '#FF9800' : 
                      item.existingOfferStatus === 'accepted' ? '#4CAF50' : '#666';

    return (
      <View style={[styles.offerBadge, { backgroundColor: badgeColor }]}>
        <Ionicons 
          name={item.existingOfferType === 'cash' ? 'cash' : 'swap-horizontal'} 
          size={12} 
          color="white" 
        />
        <Text style={styles.offerBadgeText}>
          {formatPrice(item.existingOfferAmount)} {item.existingOfferStatus}
        </Text>
      </View>
    );
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      enabled={index === currentIndex}
    >
      <Animated.View style={[styles.card, cardStyle, style]}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={60} color="#ccc" />
            </View>
          )}
          
          {/* Offer Status Badge */}
          {getOfferStatusBadge()}
          
          {/* Distance Badge */}
          {item.distance !== undefined && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={10} color="white" />
              <Text style={styles.distanceText}>{item.distance}mi</Text>
            </View>
          )}
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          </View>
          
          {item.hasExistingOffer && (
            <View style={styles.offerInfo}>
              <Ionicons name="information-circle" size={14} color="#FF9800" />
              <Text style={styles.offerInfoText}>
                You offered {formatPrice(item.existingOfferAmount)} • {item.existingOfferStatus}
              </Text>
            </View>
          )}
          
          <Text style={styles.cardLocation} numberOfLines={1}>
            📍 {item.location || 'Location not specified'}
          </Text>
          
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          {/* Trade Preferences */}
          {(item.tradePreferences?.acceptsCash || item.tradePreferences?.acceptsTrade) && (
            <View style={styles.preferences}>
              {item.tradePreferences.acceptsCash && (
                <View style={styles.preferenceTag}>
                  <Text style={styles.preferenceText}>💰 Cash</Text>
                </View>
              )}
              {item.tradePreferences.acceptsTrade && (
                <View style={styles.preferenceTag}>
                  <Text style={styles.preferenceText}>🔄 Trade</Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Swipe Indicators */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.passIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [-screenWidth / 2, -50, 0],
                outputRange: [1, 0.5, 0],
                extrapolate: 'clamp',
              })
            }
          ]}
        >
          <Text style={styles.passText}>PASS</Text>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.interestedIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [0, 50, screenWidth / 2],
                outputRange: [0, 0.5, 1],
                extrapolate: 'clamp',
              })
            }
          ]}
        >
          <Text style={styles.interestedText}>
            {item.hasExistingOffer ? 'FOLLOW UP' : 'INTERESTED'}
          </Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: screenWidth - 40,
    height: screenHeight * 0.75,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: '65%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  offerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  cardInfo: {
    padding: 20,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  cardPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  offerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  offerInfoText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '500',
    flex: 1,
  },
  cardLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  preferences: {
    flexDirection: 'row',
    gap: 8,
  },
  preferenceTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  preferenceText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '40%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  passIndicator: {
    left: 20,
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  interestedIndicator: {
    right: 20,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  passText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  interestedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
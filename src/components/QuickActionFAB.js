import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const QuickActionFAB = ({ 
  tradeStatus, 
  nextAction, 
  onActionPress,
  pendingCounterOffer 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedScale] = useState(new Animated.Value(0));
  const [animatedOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    const shouldShow = nextAction || pendingCounterOffer;
    
    if (shouldShow && !isVisible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.spring(animatedScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!shouldShow && isVisible) {
      Animated.parallel([
        Animated.spring(animatedScale, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setIsVisible(false));
    }
  }, [nextAction, pendingCounterOffer, isVisible]);

  const handlePress = () => {
    if (pendingCounterOffer) {
      onActionPress?.('show_counter_offer_actions', pendingCounterOffer);
    } else if (nextAction) {
      onActionPress?.(nextAction.action);
    }
  };

  const getActionText = () => {
    if (pendingCounterOffer) {
      return `Accept $${pendingCounterOffer.newTerms?.cashAmount || pendingCounterOffer.cashAmount || 0}?`;
    }
    return nextAction?.text || 'Take Action';
  };

  const getActionIcon = () => {
    if (pendingCounterOffer) {
      return 'cash';
    }
    if (nextAction?.urgent) {
      return 'alert-circle';
    }
    return 'play-circle';
  };

  const getActionColor = () => {
    if (pendingCounterOffer) {
      return '#FF9800';
    }
    if (nextAction?.urgent) {
      return '#FF6B6B';
    }
    return '#4CAF50';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ scale: animatedScale }],
          opacity: animatedOpacity,
        }
      ]}
    >
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: getActionColor() }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.fabContent}>
          <Ionicons 
            name={getActionIcon()} 
            size={20} 
            color="white" 
          />
          <Text style={styles.fabText} numberOfLines={1}>
            {getActionText()}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: width * 0.7,
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    flexShrink: 1,
  },
});

export default QuickActionFAB;
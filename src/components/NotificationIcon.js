// Enhanced Notification Icon Component
// Shows notification count, different states, and handles real-time updates

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { EnhancedNotificationService } from '../services/EnhancedNotificationService';

export default function NotificationIcon({ 
  onPress, 
  style = {},
  showCount = true,
  showPulse = true,
  maxDisplayCount = 99,
  size = 24,
  color = 'white'
}) {
  const { user } = useAuth();
  const [notificationCounts, setNotificationCounts] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byCategory: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) {
      setNotificationCounts({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byCategory: {}
      });
      setIsLoading(false);
      return;
    }

    loadNotificationCounts();
    
    // Subscribe to real-time notification updates
    const unsubscribe = EnhancedNotificationService.subscribeToNotifications(
      user.uid,
      handleNotificationUpdate,
      { unreadOnly: true, limit: 100 }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Handle real-time notification updates
  const handleNotificationUpdate = (notifications) => {
    // Ensure notifications is an array
    if (!Array.isArray(notifications)) {
      console.warn('⚠️ NotificationIcon: notifications is not an array:', notifications);
      notifications = [];
    }

    const counts = {
      total: notifications.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {}
    };

    notifications.forEach(notification => {
      // Safely access notification properties
      if (!notification || typeof notification !== 'object') {
        console.warn('⚠️ NotificationIcon: Invalid notification:', notification);
        return;
      }

      const priority = notification.priority || 'low';
      const category = notification.category || 'system';
      
      counts[priority] = (counts[priority] || 0) + 1;
      counts.byCategory[category] = (counts.byCategory[category] || 0) + 1;
    });

    // Trigger animations for new high-priority notifications
    const hadCritical = notificationCounts.critical > 0;
    const hasCritical = counts.critical > 0;
    const hadHigh = notificationCounts.high > 0;
    const hasHigh = counts.high > 0;

    setNotificationCounts(counts);
    setIsLoading(false);

    // Animate for new critical notifications
    if (!hadCritical && hasCritical) {
      triggerShakeAnimation();
    }
    // Animate for new high priority notifications
    else if (!hadHigh && hasHigh) {
      triggerPulseAnimation();
    }
    // Pulse for any new notifications if enabled
    else if (showPulse && counts.total > notificationCounts.total) {
      triggerPulseAnimation();
    }
  };

  const loadNotificationCounts = async () => {
    try {
      setIsLoading(true);
      const counts = await EnhancedNotificationService.getNotificationCounts(user.uid);
      
      // Ensure counts has the expected structure
      const safeCounts = {
        total: counts?.total || 0,
        critical: counts?.critical || 0,
        high: counts?.high || 0,
        medium: counts?.medium || 0,
        low: counts?.low || 0,
        byCategory: counts?.byCategory || {}
      };
      
      setNotificationCounts(safeCounts);
    } catch (error) {
      console.error('Error loading notification counts:', error);
      // Set safe default values on error
      setNotificationCounts({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byCategory: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Animation for critical notifications (shake)
  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Animation for high priority notifications (pulse)
  const triggerPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  // Determine notification icon and color based on priority
  const getNotificationState = () => {
    if (isLoading) {
      return {
        icon: 'notifications-outline',
        badgeColor: '#9E9E9E',
        iconColor: color,
        shouldPulse: false
      };
    }

    if (notificationCounts.critical > 0) {
      return {
        icon: 'notifications',
        badgeColor: '#F44336',
        iconColor: '#F44336',
        shouldPulse: true
      };
    }

    if (notificationCounts.high > 0) {
      return {
        icon: 'notifications',
        badgeColor: '#FF9800',
        iconColor: '#FF9800',
        shouldPulse: true
      };
    }

    if (notificationCounts.medium > 0) {
      return {
        icon: 'notifications',
        badgeColor: '#2196F3',
        iconColor: color,
        shouldPulse: false
      };
    }

    if (notificationCounts.low > 0) {
      return {
        icon: 'notifications',
        badgeColor: '#4CAF50',
        iconColor: color,
        shouldPulse: false
      };
    }

    return {
      icon: 'notifications-outline',
      badgeColor: '#9E9E9E',
      iconColor: color,
      shouldPulse: false
    };
  };

  const notificationState = getNotificationState();
  const displayCount = notificationCounts.total > maxDisplayCount ? `${maxDisplayCount}+` : notificationCounts.total.toString();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: pulseAnim },
              { translateX: shakeAnim }
            ]
          }
        ]}
      >
        <Ionicons
          name={notificationState.icon}
          size={size}
          color={notificationState.iconColor}
        />
        
        {/* Notification Count Badge */}
        {showCount && notificationCounts.total > 0 && (
          <View style={[
            styles.badge,
            { backgroundColor: notificationState.badgeColor }
          ]}>
            <Text style={styles.badgeText}>{displayCount}</Text>
          </View>
        )}

        {/* Critical Alert Indicator */}
        {notificationCounts.critical > 0 && (
          <View style={styles.criticalIndicator}>
            <Ionicons name="warning" size={12} color="white" />
          </View>
        )}

        {/* Pulse Animation for High Priority */}
        {showPulse && notificationState.shouldPulse && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                backgroundColor: notificationState.badgeColor,
                transform: [{ scale: pulseAnim }]
              }
            ]}
          />
        )}
      </Animated.View>

      {/* Category Indicators (small dots for different categories) */}
      {notificationCounts.byCategory && Object.keys(notificationCounts.byCategory).length > 1 && (
        <View style={styles.categoryIndicators}>
          {Object.entries(notificationCounts.byCategory || {}).slice(0, 3).map(([category, count], index) => (
            <View
              key={category}
              style={[
                styles.categoryDot,
                { backgroundColor: getCategoryColor(category) }
              ]}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// Helper function to get category colors
const getCategoryColor = (category) => {
  const categoryColors = {
    trade: '#4CAF50',
    offer: '#FF9800',
    message: '#2196F3',
    system: '#9E9E9E',
    security: '#F44336',
    item: '#E91E63',
    social: '#9C27B0'
  };
  
  return categoryColors[category] || '#9E9E9E';
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  criticalIndicator: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
    zIndex: -1,
  },
  categoryIndicators: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    flexDirection: 'row',
    gap: 1,
  },
  categoryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export { NotificationIcon };
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const NotificationCard = ({
  visible = false,
  type = 'info', // success, error, warning, info
  title,
  message,
  onClose,
  autoHide = true,
  duration = 4000,
  actions = [], // [{ title: 'Action', onPress: () => {}, style: 'primary' }]
  position = 'top' // top, bottom, center
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      if (autoHide) {
        const timer = setTimeout(() => {
          hideCard();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      hideCard();
    }
  }, [visible]);

  const hideCard = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'bottom' ? 100 : -100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50',
          iconColor: '#4CAF50',
          iconName: 'checkmark-circle'
        };
      case 'error':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#FF4444',
          iconColor: '#FF4444',
          iconName: 'alert-circle'
        };
      case 'warning':
        return {
          backgroundColor: '#FFF8E1',
          borderColor: '#FF9800',
          iconColor: '#FF9800',
          iconName: 'warning'
        };
      default:
        return {
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          iconColor: '#2196F3',
          iconName: 'information-circle'
        };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return {
          bottom: 20,
          top: undefined
        };
      case 'center':
        return {
          top: '50%',
          marginTop: -50
        };
      default:
        return {
          top: 60,
          bottom: undefined
        };
    }
  };

  if (!visible) return null;

  const typeStyles = getTypeStyles();
  const positionStyles = getPositionStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyles,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={[
        styles.card,
        {
          backgroundColor: typeStyles.backgroundColor,
          borderColor: typeStyles.borderColor
        }
      ]}>
        <View style={styles.header}>
          <View style={styles.iconTitleContainer}>
            <Ionicons
              name={typeStyles.iconName}
              size={24}
              color={typeStyles.iconColor}
              style={styles.icon}
            />
            <View style={styles.textContainer}>
              {title && (
                <Text style={[styles.title, { color: typeStyles.iconColor }]}>
                  {title}
                </Text>
              )}
              {message && (
                <Text style={styles.message}>
                  {message}
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            onPress={hideCard}
            style={styles.closeButton}
          >
            <Ionicons
              name="close"
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  action.style === 'primary' && styles.primaryAction
                ]}
                onPress={() => {
                  action.onPress();
                  hideCard();
                }}
              >
                <Text style={[
                  styles.actionText,
                  action.style === 'primary' && styles.primaryActionText
                ]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  iconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1
  },
  icon: {
    marginRight: 12,
    marginTop: 2
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  closeButton: {
    padding: 4,
    marginLeft: 8
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'flex-end'
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8
  },
  primaryAction: {
    backgroundColor: '#FF6B6B'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  primaryActionText: {
    color: '#FFF'
  }
});

export default NotificationCard;
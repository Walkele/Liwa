import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TradeStatusBadge = ({ 
  userRole, 
  tradeState, 
  isWaitingForUser, 
  nextAction,
  style 
}) => {
  
  const getBadgeConfig = () => {
    if (isWaitingForUser) {
      return {
        text: 'YOUR TURN',
        icon: 'alert-circle',
        backgroundColor: '#FF6B6B',
        textColor: 'white',
        pulse: true
      };
    } else {
      return {
        text: 'WAITING FOR PARTNER',
        icon: 'time-outline',
        backgroundColor: '#E3F2FD',
        textColor: '#1976D2',
        pulse: false
      };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }, style]}>
      <View style={[styles.badge, config.pulse && styles.pulsing]}>
        <Ionicons 
          name={config.icon} 
          size={16} 
          color={config.textColor} 
          style={styles.icon}
        />
        <Text style={[styles.text, { color: config.textColor }]}>
          {config.text}
        </Text>
      </View>
      
      {nextAction && (
        <Text style={[styles.nextAction, { color: config.textColor }]}>
          Next: {nextAction}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsing: {
    // Animation would be added here
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  nextAction: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
});
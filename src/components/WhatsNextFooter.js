import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const WhatsNextFooter = ({ 
  nextStep,
  nextStepDescription,
  actionRequired = false,
  onActionPress,
  actionButtonText,
  timeRemaining,
  style 
}) => {
  
  const getStepIcon = (step) => {
    switch (step) {
      case 'propose': return 'paper-plane';
      case 'respond': return 'chatbubble-ellipses';
      case 'accept': return 'checkmark-circle';
      case 'schedule_meetup': return 'location';
      case 'confirm_arrival': return 'walk';
      case 'scan_qr': return 'qr-code';
      case 'complete': return 'trophy';
      default: return 'arrow-forward';
    }
  };

  const getStepColor = () => {
    if (actionRequired) {
      return {
        backgroundColor: '#FF6B6B',
        textColor: 'white',
        iconColor: 'white'
      };
    } else {
      return {
        backgroundColor: '#E3F2FD',
        textColor: '#1976D2',
        iconColor: '#1976D2'
      };
    }
  };

  const colors = getStepColor();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }, style]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Ionicons 
            name={getStepIcon(nextStep)} 
            size={24} 
            color={colors.iconColor} 
          />
          <View style={styles.textSection}>
            <Text style={[styles.title, { color: colors.textColor }]}>
              {actionRequired ? 'Action Required' : 'Next Step'}
            </Text>
            <Text style={[styles.description, { color: colors.textColor }]}>
              {nextStepDescription}
            </Text>
            {timeRemaining && (
              <Text style={[styles.timeRemaining, { color: colors.textColor }]}>
                ⏰ {timeRemaining}
              </Text>
            )}
          </View>
        </View>

        {actionRequired && actionButtonText && onActionPress && (
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: colors.textColor }]}
            onPress={onActionPress}
          >
            <Text style={[styles.actionButtonText, { color: colors.textColor }]}>
              {actionButtonText}
            </Text>
            <Ionicons 
              name="arrow-forward" 
              size={16} 
              color={colors.textColor} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textSection: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    opacity: 0.9,
  },
  timeRemaining: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
});
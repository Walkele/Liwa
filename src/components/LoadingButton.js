import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LoadingButton = ({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false,
  style = {},
  textStyle = {},
  variant = 'primary', // primary, secondary, danger, success
  icon = null,
  size = 'medium' // small, medium, large
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: loading || disabled ? '#FFB3B3' : '#FF6B6B',
          borderColor: '#FF6B6B'
        };
      case 'secondary':
        return {
          backgroundColor: loading || disabled ? '#E8E8E8' : '#F5F5F5',
          borderColor: '#DDD',
          borderWidth: 1
        };
      case 'danger':
        return {
          backgroundColor: loading || disabled ? '#FFB3B3' : '#FF4444',
          borderColor: '#FF4444'
        };
      case 'success':
        return {
          backgroundColor: loading || disabled ? '#B3FFB3' : '#4CAF50',
          borderColor: '#4CAF50'
        };
      default:
        return {
          backgroundColor: loading || disabled ? '#FFB3B3' : '#FF6B6B',
          borderColor: '#FF6B6B'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          minHeight: 36
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          minHeight: 56
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          minHeight: 44
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary') {
      return loading || disabled ? '#999' : '#333';
    }
    return loading || disabled ? '#FFF' : '#FFF';
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        style,
        (loading || disabled) && styles.disabled
      ]}
      onPress={loading || disabled ? null : onPress}
      activeOpacity={loading || disabled ? 1 : 0.7}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={getTextColor()} 
            style={styles.spinner}
          />
        ) : icon ? (
          <Ionicons 
            name={icon} 
            size={getTextSize()} 
            color={getTextColor()} 
            style={styles.icon}
          />
        ) : null}
        
        <Text style={[
          styles.text,
          { 
            color: getTextColor(),
            fontSize: getTextSize()
          },
          textStyle
        ]}>
          {loading ? 'Loading...' : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontWeight: '600',
    textAlign: 'center'
  },
  spinner: {
    marginRight: 8
  },
  icon: {
    marginRight: 8
  },
  disabled: {
    opacity: 0.6
  }
});

export default LoadingButton;
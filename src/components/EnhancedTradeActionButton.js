import React from 'react';
import { View, StyleSheet } from 'react-native';
import LoadingButton from './LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

const EnhancedTradeActionButton = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  size = 'medium',
  style = {},
  successMessage,
  errorMessage,
  confirmationRequired = false,
  confirmationTitle = 'Confirm Action',
  confirmationMessage = 'Are you sure you want to proceed?',
  disabled = false
}) => {
  const { loading, withLoading } = useLoadingState();
  const { showNotification } = useNotification();

  const handlePress = async () => {
    if (confirmationRequired) {
      showNotification({
        type: 'warning',
        title: confirmationTitle,
        message: confirmationMessage,
        autoHide: false,
        actions: [
          {
            title: 'Cancel',
            onPress: () => {},
            style: 'secondary'
          },
          {
            title: 'Confirm',
            onPress: () => executeAction(),
            style: 'primary'
          }
        ]
      });
    } else {
      executeAction();
    }
  };

  const executeAction = async () => {
    await withLoading(onPress, {
      successMessage,
      errorMessage,
      showSuccessNotification: !!successMessage,
      showErrorNotification: true
    });
  };

  return (
    <LoadingButton
      title={title}
      onPress={handlePress}
      loading={loading}
      disabled={disabled}
      variant={variant}
      icon={icon}
      size={size}
      style={style}
    />
  );
};

export default EnhancedTradeActionButton;
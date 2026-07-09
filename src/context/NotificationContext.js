import React, { createContext, useContext, useState } from 'react';
import NotificationCard from '../components/NotificationCard';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = ({
    type = 'info',
    title,
    message,
    autoHide = true,
    duration = 4000,
    actions = [],
    position = 'top'
  }) => {
    const id = Date.now().toString();
    const notification = {
      id,
      type,
      title,
      message,
      autoHide,
      duration,
      actions,
      position,
      visible: true
    };

    setNotifications(prev => [...prev, notification]);

    // Auto remove after duration + animation time
    if (autoHide) {
      setTimeout(() => {
        removeNotification(id);
      }, duration + 500);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, visible: false }
          : notification
      )
    );

    // Remove from array after animation
    setTimeout(() => {
      setNotifications(prev => 
        prev.filter(notification => notification.id !== id)
      );
    }, 300);
  };

  const showSuccess = (title, message, options = {}) => {
    return showNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  };

  const showError = (title, message, options = {}) => {
    return showNotification({
      type: 'error',
      title,
      message,
      autoHide: false, // Errors should be manually dismissed
      ...options
    });
  };

  const showWarning = (title, message, options = {}) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  };

  const showInfo = (title, message, options = {}) => {
    return showNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.map(notification => (
        <NotificationCard
          key={notification.id}
          visible={notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          autoHide={notification.autoHide}
          duration={notification.duration}
          actions={notification.actions}
          position={notification.position}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
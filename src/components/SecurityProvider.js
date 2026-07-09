import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { EnhancedSecurityService } from '../services/EnhancedSecurityService';
import { AntiFraudService } from '../services/AntiFraudService';
import { TradeStateMachine } from '../services/TradeStateMachine';

const SecurityContext = createContext();

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const { user } = useAuth();
  const [securityStatus, setSecurityStatus] = useState({
    deviceIntegrity: null,
    riskLevel: 'unknown',
    isSecure: false,
    flags: [],
    lastCheck: null
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize security checks when user logs in
  useEffect(() => {
    if (user && !isInitialized) {
      initializeSecurity();
    }
  }, [user, isInitialized]);

  const initializeSecurity = async () => {
    try {
      console.log('🔒 Initializing comprehensive security system');
      
      // Perform device integrity check
      const deviceCheck = await EnhancedSecurityService.performDeviceIntegrityCheck(user.uid);
      
      // Update security status
      const newStatus = {
        deviceIntegrity: deviceCheck,
        riskLevel: deviceCheck.riskAssessment?.level || 'unknown',
        isSecure: deviceCheck.riskAssessment?.level !== 'critical',
        flags: deviceCheck.riskAssessment?.flags || [],
        lastCheck: new Date().toISOString()
      };
      
      setSecurityStatus(newStatus);
      setIsInitialized(true);
      
      // Handle high-risk devices
      if (newStatus.riskLevel === 'critical') {
        handleHighRiskDevice(deviceCheck);
      } else if (newStatus.riskLevel === 'high') {
        handleMediumRiskDevice(deviceCheck);
      }
      
      console.log('✅ Security system initialized');
      
    } catch (error) {
      console.error('❌ Security initialization failed:', error);
      setSecurityStatus({
        deviceIntegrity: null,
        riskLevel: 'critical',
        isSecure: false,
        flags: ['initialization_failed'],
        lastCheck: new Date().toISOString()
      });
    }
  };

  const handleHighRiskDevice = (deviceCheck) => {
    Alert.alert(
      '🚨 Security Alert',
      'Your device has been flagged for security concerns. Some features may be limited to protect other users.',
      [
        {
          text: 'Learn More',
          onPress: () => showSecurityDetails(deviceCheck)
        },
        {
          text: 'Continue',
          style: 'default'
        }
      ]
    );
  };

  const handleMediumRiskDevice = (deviceCheck) => {
    Alert.alert(
      '⚠️ Security Notice',
      'We\'ve detected some security concerns with your device. Please ensure you\'re using the official app.',
      [{ text: 'OK' }]
    );
  };

  const showSecurityDetails = (deviceCheck) => {
    const flags = deviceCheck.riskAssessment?.flags || [];
    const flagDescriptions = {
      'emulator_detected': 'Running on emulator/simulator',
      'device_rooted': 'Device appears to be rooted/jailbroken',
      'suspicious_behavior': 'Unusual app behavior detected',
      'api_tampering': 'API tampering detected'
    };
    
    const details = flags.map(flag => flagDescriptions[flag] || flag).join('\n');
    
    Alert.alert(
      'Security Details',
      `The following security concerns were detected:\n\n${details}\n\nFor the safety of all users, some features may be restricted.`,
      [{ text: 'Understood' }]
    );
  };

  // Validate user action with security checks
  const validateAction = async (action, metadata = {}) => {
    try {
      console.log(`🔍 Validating action: ${action}`);
      
      if (!securityStatus.isSecure) {
        throw new Error('Action blocked due to security concerns');
      }
      
      // Behavioral analysis
      const behaviorCheck = await EnhancedSecurityService.analyzeBehavioralPatterns(
        user.uid,
        action,
        metadata
      );
      
      if (!behaviorCheck.isAllowed) {
        throw new Error('Action blocked due to suspicious behavior patterns');
      }
      
      // Location validation for location-sensitive actions
      if (metadata.location && ['trade_accept', 'exchange_start'].includes(action)) {
        const locationCheck = await AntiFraudService.validateLocation(
          metadata.location,
          user.uid
        );
        
        if (!locationCheck.isValid) {
          throw new Error('Action blocked due to location concerns');
        }
      }
      
      return {
        allowed: true,
        securityChecks: {
          behavior: behaviorCheck,
          location: metadata.location ? 'validated' : 'not_required'
        }
      };
      
    } catch (error) {
      console.error(`❌ Action validation failed for ${action}:`, error);
      return {
        allowed: false,
        error: error.message,
        securityChecks: null
      };
    }
  };

  // Secure state transition wrapper
  const secureStateTransition = async (itemId, fromState, toState, metadata = {}) => {
    try {
      console.log(`🔒 Secure state transition: ${fromState} → ${toState}`);
      
      // Validate action first
      const actionValidation = await validateAction('state_transition', {
        ...metadata,
        itemId,
        fromState,
        toState
      });
      
      if (!actionValidation.allowed) {
        throw new Error(actionValidation.error);
      }
      
      // Perform state transition with security context
      const result = await TradeStateMachine.transitionState(
        itemId,
        fromState,
        toState,
        user.uid,
        {
          ...metadata,
          securityContext: {
            deviceIntegrity: securityStatus.deviceIntegrity,
            riskLevel: securityStatus.riskLevel,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      return result;
      
    } catch (error) {
      console.error('❌ Secure state transition failed:', error);
      throw error;
    }
  };

  // Process secure image with fraud prevention
  const processSecureImage = async (imageUri, options = {}) => {
    try {
      console.log('🖼️ Processing image with security checks');
      
      // Validate action
      const actionValidation = await validateAction('image_upload', { imageUri });
      
      if (!actionValidation.allowed) {
        throw new Error(actionValidation.error);
      }
      
      // Process image securely
      const result = await EnhancedSecurityService.processSecureImage(imageUri, options);
      
      return result;
      
    } catch (error) {
      console.error('❌ Secure image processing failed:', error);
      throw error;
    }
  };

  // Generate secure QR code
  const generateSecureQR = async (tradeId, location) => {
    try {
      console.log('🔐 Generating secure QR code');
      
      // Validate action
      const actionValidation = await validateAction('qr_generation', { tradeId, location });
      
      if (!actionValidation.allowed) {
        throw new Error(actionValidation.error);
      }
      
      // Generate secure QR
      const qrResult = AntiFraudService.generateSecureQR(tradeId, user.uid, location);
      
      return qrResult;
      
    } catch (error) {
      console.error('❌ Secure QR generation failed:', error);
      throw error;
    }
  };

  // Validate QR code with security checks
  const validateSecureQR = async (qrData, userLocation) => {
    try {
      console.log('🔍 Validating QR code with security checks');
      
      // Validate action
      const actionValidation = await validateAction('qr_validation', { qrData, userLocation });
      
      if (!actionValidation.allowed) {
        throw new Error(actionValidation.error);
      }
      
      // Validate QR code
      const qrResult = await EnhancedSecurityService.validateSecureQR(
        qrData,
        userLocation,
        user.uid
      );
      
      return qrResult;
      
    } catch (error) {
      console.error('❌ QR validation failed:', error);
      throw error;
    }
  };

  // Check if user can perform action
  const canPerformAction = (action, currentState = null) => {
    // Basic security check
    if (!securityStatus.isSecure) {
      return {
        allowed: false,
        reason: 'Device security concerns'
      };
    }
    
    // State-based action check
    if (currentState && !TradeStateMachine.isActionAllowed(currentState, action)) {
      return {
        allowed: false,
        reason: `Action '${action}' not allowed in state '${currentState}'`
      };
    }
    
    return {
      allowed: true,
      reason: null
    };
  };

  // Refresh security status
  const refreshSecurityStatus = async () => {
    if (user) {
      await initializeSecurity();
    }
  };

  const contextValue = {
    // Security status
    securityStatus,
    isInitialized,
    
    // Action validation
    validateAction,
    canPerformAction,
    
    // Secure operations
    secureStateTransition,
    processSecureImage,
    generateSecureQR,
    validateSecureQR,
    
    // Utility functions
    refreshSecurityStatus,
    showSecurityDetails: () => showSecurityDetails(securityStatus.deviceIntegrity)
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityProvider;
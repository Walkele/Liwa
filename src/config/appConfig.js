// App Configuration System
// Centralized configuration for different environments and features

export const APP_CONFIG = {
  // Environment Configuration
  ENVIRONMENT: process.env.EXPO_PUBLIC_APP_ENV || 'development',
  
  // App Information
  APP_NAME: 'SwipeIt',
  APP_VERSION: '1.0.0',
  APP_BUILD: '1',
  
  // Feature Flags
  FEATURES: {
    // Core Features
    CASH_OFFERS: true,
    TRADE_PROPOSALS: true,
    BARTER_PROPOSALS: true,
    COUNTER_OFFERS: true,
    BUNDLE_OFFERS: true,
    
    // Advanced Features
    ITEM_VERIFICATION: true,
    USER_RATINGS: true,
    PUSH_NOTIFICATIONS: true,
    OFFLINE_SUPPORT: true,
    
    // Development Features
    DEV_TOOLS: process.env.EXPO_PUBLIC_APP_ENV === 'development',
    TEST_DATA_CREATION: process.env.EXPO_PUBLIC_APP_ENV === 'development',
    DEBUG_LOGGING: process.env.EXPO_PUBLIC_APP_ENV !== 'production',
    
    // Experimental Features
    AI_PRICE_SUGGESTIONS: false,
    SOCIAL_SHARING: false,
    VIDEO_CALLS: false,
    AUGMENTED_REALITY: false
  },
  
  // Business Rules
  BUSINESS_RULES: {
    // Trade Limits
    MAX_ACTIVE_TRADES_PER_USER: 10,
    MAX_ITEMS_PER_USER: 50,
    MAX_OFFERS_PER_ITEM: 20,
    
    // Time Limits
    OFFER_EXPIRY_HOURS: 72, // 3 days
    TRADE_COMPLETION_HOURS: 168, // 7 days
    VERIFICATION_CODE_EXPIRY_MINUTES: 30,
    
    // Value Limits
    MIN_ITEM_VALUE: 1,
    MAX_ITEM_VALUE: 10000,
    MIN_OFFER_PERCENTAGE: 10, // 10% of original price
    MAX_OFFER_PERCENTAGE: 150, // 150% of original price
    
    // Content Limits
    MAX_ITEM_TITLE_LENGTH: 100,
    MAX_ITEM_DESCRIPTION_LENGTH: 1000,
    MAX_MESSAGE_LENGTH: 500,
    MAX_IMAGES_PER_ITEM: 10
  },
  
  // UI Configuration
  UI_CONFIG: {
    // Colors
    COLORS: {
      PRIMARY: '#FF6B6B',
      SECONDARY: '#4ECDC4',
      SUCCESS: '#4CAF50',
      WARNING: '#FF9500',
      ERROR: '#F44336',
      INFO: '#2196F3',
      BACKGROUND: '#F8F9FA',
      SURFACE: '#FFFFFF',
      TEXT_PRIMARY: '#333333',
      TEXT_SECONDARY: '#666666'
    },
    
    // Animations
    ANIMATIONS: {
      DURATION_SHORT: 200,
      DURATION_MEDIUM: 300,
      DURATION_LONG: 500,
      EASING: 'ease-in-out'
    },
    
    // Layout
    LAYOUT: {
      HEADER_HEIGHT: 60,
      TAB_BAR_HEIGHT: 80,
      BORDER_RADIUS: 8,
      PADDING_SMALL: 8,
      PADDING_MEDIUM: 16,
      PADDING_LARGE: 24
    }
  },
  
  // API Configuration
  API_CONFIG: {
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
    UPLOAD_TIMEOUT: 120000, // 2 minutes
    
    // Retry Configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    
    // Cache Configuration
    CACHE_DURATION: 300000, // 5 minutes
    MAX_CACHE_SIZE: 50 // MB
  },
  
  // Firebase Configuration
  FIREBASE_CONFIG: {
    // Firestore
    ENABLE_OFFLINE_PERSISTENCE: true,
    CACHE_SIZE_BYTES: 40 * 1024 * 1024, // 40 MB
    
    // Storage
    MAX_UPLOAD_SIZE_MB: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    
    // Analytics
    ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_APP_ENV === 'production',
    ENABLE_CRASHLYTICS: process.env.EXPO_PUBLIC_APP_ENV === 'production'
  },
  
  // Security Configuration
  SECURITY_CONFIG: {
    // Authentication
    PASSWORD_MIN_LENGTH: 8,
    REQUIRE_EMAIL_VERIFICATION: true,
    SESSION_TIMEOUT_MINUTES: 60,
    
    // Content Moderation
    ENABLE_PROFANITY_FILTER: true,
    ENABLE_SPAM_DETECTION: true,
    MAX_REPORTS_BEFORE_REVIEW: 3,
    
    // Rate Limiting
    MAX_MESSAGES_PER_MINUTE: 10,
    MAX_OFFERS_PER_HOUR: 20,
    MAX_ITEMS_PER_DAY: 10
  },
  
  // Notification Configuration
  NOTIFICATION_CONFIG: {
    // Types
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_EMAIL_NOTIFICATIONS: true,
    ENABLE_IN_APP_NOTIFICATIONS: true,
    
    // Timing
    QUIET_HOURS_START: 22, // 10 PM
    QUIET_HOURS_END: 8,    // 8 AM
    
    // Frequency
    MAX_NOTIFICATIONS_PER_DAY: 20,
    BATCH_NOTIFICATION_DELAY: 300000 // 5 minutes
  },
  
  // Performance Configuration
  PERFORMANCE_CONFIG: {
    // List Pagination
    ITEMS_PER_PAGE: 20,
    MESSAGES_PER_PAGE: 50,
    CONVERSATIONS_PER_PAGE: 30,
    
    // Image Optimization
    IMAGE_QUALITY: 0.8,
    MAX_IMAGE_WIDTH: 1200,
    MAX_IMAGE_HEIGHT: 1200,
    
    // Preloading
    PRELOAD_NEXT_PAGE: true,
    PRELOAD_IMAGES: true
  }
};

// Environment-specific overrides
if (APP_CONFIG.ENVIRONMENT === 'development') {
  // Development overrides
  APP_CONFIG.BUSINESS_RULES.MAX_ACTIVE_TRADES_PER_USER = 100;
  APP_CONFIG.SECURITY_CONFIG.MAX_MESSAGES_PER_MINUTE = 100;
  APP_CONFIG.API_CONFIG.REQUEST_TIMEOUT = 60000;
}

if (APP_CONFIG.ENVIRONMENT === 'production') {
  // Production overrides
  APP_CONFIG.FEATURES.DEBUG_LOGGING = false;
  APP_CONFIG.FEATURES.DEV_TOOLS = false;
  APP_CONFIG.FEATURES.TEST_DATA_CREATION = false;
}

// Utility functions for configuration
export const getFeatureFlag = (featureName) => {
  return APP_CONFIG.FEATURES[featureName] || false;
};

export const getBusinessRule = (ruleName) => {
  return APP_CONFIG.BUSINESS_RULES[ruleName];
};

export const getUIConfig = (configPath) => {
  const paths = configPath.split('.');
  let config = APP_CONFIG.UI_CONFIG;
  
  for (const path of paths) {
    config = config[path];
    if (!config) return null;
  }
  
  return config;
};

export const isProduction = () => {
  return APP_CONFIG.ENVIRONMENT === 'production';
};

export const isDevelopment = () => {
  return APP_CONFIG.ENVIRONMENT === 'development';
};

export const isFeatureEnabled = (featureName) => {
  return getFeatureFlag(featureName);
};

// Configuration validation
export const validateConfig = () => {
  const errors = [];
  
  // Validate required environment variables
  if (!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
    errors.push('Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  }
  
  // Validate business rules
  if (APP_CONFIG.BUSINESS_RULES.MIN_ITEM_VALUE >= APP_CONFIG.BUSINESS_RULES.MAX_ITEM_VALUE) {
    errors.push('MIN_ITEM_VALUE must be less than MAX_ITEM_VALUE');
  }
  
  // Validate time limits
  if (APP_CONFIG.BUSINESS_RULES.VERIFICATION_CODE_EXPIRY_MINUTES <= 0) {
    errors.push('VERIFICATION_CODE_EXPIRY_MINUTES must be positive');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export default configuration
export default APP_CONFIG;
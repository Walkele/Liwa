// Safe component rendering utility to prevent React errors
export const SafeComponentRenderer = {
  // Safely render a component with error boundary
  safeRender: (Component, props = {}, fallback = null) => {
    try {
      if (!Component) {
        console.warn('SafeComponentRenderer: Component is undefined');
        return fallback;
      }
      
      if (typeof Component !== 'function' && typeof Component !== 'object') {
        console.warn('SafeComponentRenderer: Invalid component type');
        return fallback;
      }
      
      return Component;
    } catch (error) {
      console.error('SafeComponentRenderer: Error rendering component:', error);
      return fallback;
    }
  },

  // Safely access component props
  safeProps: (props, defaultProps = {}) => {
    if (!props || typeof props !== 'object') {
      return defaultProps;
    }
    
    return { ...defaultProps, ...props };
  },

  // Check if user data is valid
  isValidUser: (user) => {
    return user && 
           typeof user === 'object' && 
           user.uid && 
           typeof user.uid === 'string';
  },

  // Get safe user data with defaults
  getSafeUserData: (user) => {
    if (!user) {
      return {
        uid: 'unknown',
        displayName: 'Unknown User',
        email: 'unknown@example.com',
        trustScore: 0
      };
    }
    
    return {
      uid: user.uid || 'unknown',
      displayName: user.displayName || 'Unknown User',
      email: user.email || 'unknown@example.com',
      trustScore: user.trustScore || 0,
      ...user
    };
  }
};
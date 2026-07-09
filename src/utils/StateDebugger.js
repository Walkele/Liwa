import { useEffect, useRef } from 'react';

// State change logger for development
export const useStateLogger = (stateName, state) => {
  const prevState = useRef();

  useEffect(() => {
    if (__DEV__) {
      if (prevState.current !== undefined) {
        console.group(`🔄 ${stateName} State Change`);
        console.log('Previous:', prevState.current);
        console.log('Current:', state);
        console.log('Changed:', getChangedProperties(prevState.current, state));
        console.groupEnd();
      }
      prevState.current = state;
    }
  }, [stateName, state]);
};

// Performance monitor for context re-renders
export const useRenderLogger = (componentName) => {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());

  useEffect(() => {
    if (__DEV__) {
      renderCount.current += 1;
      const now = Date.now();
      const timeSinceLastRender = now - lastRender.current;
      
      console.log(`🎨 ${componentName} rendered #${renderCount.current} (${timeSinceLastRender}ms since last)`);
      
      if (timeSinceLastRender < 100 && renderCount.current > 1) {
        console.warn(`⚠️ ${componentName} is re-rendering frequently! Consider optimization.`);
      }
      
      lastRender.current = now;
    }
  });
};

// Context value change detector
export const useContextChangeDetector = (contextName, contextValue) => {
  const prevValue = useRef();

  useEffect(() => {
    if (__DEV__ && prevValue.current !== undefined) {
      const changes = getChangedProperties(prevValue.current, contextValue);
      if (Object.keys(changes).length > 0) {
        console.group(`🔄 ${contextName} Context Changed`);
        console.table(changes);
        console.groupEnd();
      }
    }
    prevValue.current = contextValue;
  }, [contextName, contextValue]);
};

// Helper function to detect changed properties
const getChangedProperties = (prev, current) => {
  const changes = {};
  
  if (typeof prev !== 'object' || typeof current !== 'object') {
    return prev !== current ? { value: { from: prev, to: current } } : {};
  }

  // Check for changed properties
  const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(current || {})]);
  
  allKeys.forEach(key => {
    if (prev?.[key] !== current?.[key]) {
      changes[key] = {
        from: prev?.[key],
        to: current?.[key]
      };
    }
  });

  return changes;
};

// State validation helper
export const validateState = (stateName, state, schema) => {
  if (!__DEV__) return true;

  try {
    // Simple validation - you can extend this with a proper schema validator
    const isValid = Object.keys(schema).every(key => {
      const expectedType = schema[key];
      const actualValue = state[key];
      
      if (expectedType === 'required' && (actualValue === undefined || actualValue === null)) {
        console.error(`❌ ${stateName}: Required field '${key}' is missing`);
        return false;
      }
      
      if (typeof expectedType === 'string' && typeof actualValue !== expectedType) {
        console.error(`❌ ${stateName}: Field '${key}' should be ${expectedType}, got ${typeof actualValue}`);
        return false;
      }
      
      return true;
    });

    if (isValid) {
      console.log(`✅ ${stateName}: State validation passed`);
    }

    return isValid;
  } catch (error) {
    console.error(`❌ ${stateName}: State validation error:`, error);
    return false;
  }
};

// Development-only state inspector component
export const StateInspector = ({ states = {} }) => {
  if (!__DEV__) return null;

  useEffect(() => {
    // Add global state inspector to window for debugging
    if (typeof window !== 'undefined') {
      window.inspectState = () => {
        console.group('🔍 Current App State');
        Object.entries(states).forEach(([name, state]) => {
          console.group(name);
          console.log(state);
          console.groupEnd();
        });
        console.groupEnd();
      };
    }
  }, [states]);

  return null;
};

export default {
  useStateLogger,
  useRenderLogger,
  useContextChangeDetector,
  validateState,
  StateInspector
};
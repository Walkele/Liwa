import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePersistedState = (key, initialValue) => {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(true);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, [key]);

  const loadPersistedState = async () => {
    try {
      const persistedState = await AsyncStorage.getItem(key);
      if (persistedState !== null) {
        setState(JSON.parse(persistedState));
      }
    } catch (error) {
      console.error(`Error loading persisted state for ${key}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const setPersistedState = async (newState) => {
    try {
      setState(newState);
      await AsyncStorage.setItem(key, JSON.stringify(newState));
    } catch (error) {
      console.error(`Error persisting state for ${key}:`, error);
    }
  };

  const clearPersistedState = async () => {
    try {
      setState(initialValue);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing persisted state for ${key}:`, error);
    }
  };

  return [state, setPersistedState, clearPersistedState, loading];
};

// Enhanced version with automatic persistence
export const useAutoPersistedState = (key, initialValue, persistDelay = 1000) => {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(true);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, [key]);

  // Auto-persist state changes with debouncing
  useEffect(() => {
    if (!loading) {
      const timeoutId = setTimeout(() => {
        persistState(state);
      }, persistDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [state, loading, persistDelay]);

  const loadPersistedState = async () => {
    try {
      const persistedState = await AsyncStorage.getItem(key);
      if (persistedState !== null) {
        setState(JSON.parse(persistedState));
      }
    } catch (error) {
      console.error(`Error loading persisted state for ${key}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const persistState = async (stateToSave) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(stateToSave));
    } catch (error) {
      console.error(`Error persisting state for ${key}:`, error);
    }
  };

  const clearPersistedState = async () => {
    try {
      setState(initialValue);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing persisted state for ${key}:`, error);
    }
  };

  return [state, setState, clearPersistedState, loading];
};

export default usePersistedState;
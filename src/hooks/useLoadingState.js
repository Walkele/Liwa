import { useState, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const { showError, showSuccess } = useNotification();

  const withLoading = useCallback(async (asyncFunction, options = {}) => {
    const {
      successMessage,
      errorMessage = 'An error occurred',
      showSuccessNotification = false,
      showErrorNotification = true
    } = options;

    try {
      setLoading(true);
      const result = await asyncFunction();
      
      if (showSuccessNotification && successMessage) {
        showSuccess('Success', successMessage);
      }
      
      return result;
    } catch (error) {
      console.error('Loading state error:', error);
      
      if (showErrorNotification) {
        const message = error.message || errorMessage;
        showError('Error', message);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess]);

  const setLoadingState = useCallback((state) => {
    setLoading(state);
  }, []);

  return {
    loading,
    setLoading: setLoadingState,
    withLoading
  };
};

export default useLoadingState;
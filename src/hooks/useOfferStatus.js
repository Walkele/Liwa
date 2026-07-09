import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { OfferStateSyncService } from '../services/OfferStateSyncService';

export const useOfferStatus = (itemId, itemOwnerId) => {
  const { user } = useContext(AuthContext);
  const [offerStatus, setOfferStatus] = useState(null);
  const [uiState, setUiState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwner = user?.uid === itemOwnerId;

  useEffect(() => {
    if (!user?.uid || !itemId) return;

    loadOfferStatus();
  }, [user?.uid, itemId]);

  const loadOfferStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sync offer states first to ensure consistency
      await OfferStateSyncService.syncOfferStates(itemId);

      // Get current offer status for this user
      const status = await OfferStateSyncService.getUserOfferStatus(user.uid, itemId);
      setOfferStatus(status);

      // Get UI state based on offer status
      const ui = OfferStateSyncService.getUIState(status, isOwner);
      setUiState(ui);

    } catch (err) {
      console.error('Error loading offer status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    await loadOfferStatus();
  };

  return {
    offerStatus,
    uiState,
    loading,
    error,
    isOwner,
    refreshStatus
  };
};
import { useState, useEffect, useCallback } from 'react';
import { VotingStatus, checkVotingStatus } from '../lib/supabase';

export const useVotingSchedule = () => {
  const [votingStatus, setVotingStatus] = useState<VotingStatus>({
    isOpen: false,
    isActive: false,
    timeRemaining: 0,
    status: 'inactive',
    settings: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVotingStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await checkVotingStatus();
      setVotingStatus(status);
    } catch (err) {
      console.error('Error fetching voting status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchVotingStatus();

    // Set up interval to update voting status every 30 seconds
    const interval = setInterval(fetchVotingStatus, 30000);

    return () => clearInterval(interval);
  }, [fetchVotingStatus]);

  // Format time remaining for display
  const formatTimeRemaining = useCallback((timeRemaining: number): string => {
    if (timeRemaining <= 0) return 'Voting telah berakhir';

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}h ${hours}j ${minutes}m ${seconds}d`;
    } else if (hours > 0) {
      return `${hours}j ${minutes}m ${seconds}d`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}d`;
    } else {
      return `${seconds}d`;
    }
  }, []);

  // Get status display text
  const getStatusDisplayText = useCallback((): string => {
    switch (votingStatus.status) {
      case 'inactive':
        return 'Voting tidak aktif';
      case 'not-started':
        return 'Voting belum dimulai';
      case 'active':
        return 'Voting sedang berlangsung';
      case 'ended':
        return 'Voting telah berakhir';
      default:
        return 'Status tidak diketahui';
    }
  }, [votingStatus.status]);

  // Get status color for UI
  const getStatusColor = useCallback((): string => {
    switch (votingStatus.status) {
      case 'inactive':
        return 'text-gray-500';
      case 'not-started':
        return 'text-blue-500';
      case 'active':
        return 'text-green-500';
      case 'ended':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }, [votingStatus.status]);


  return {
    votingStatus,
    loading,
    error,
    refreshStatus: fetchVotingStatus,
    formatTimeRemaining,
    getStatusDisplayText,
    getStatusColor
  };
};

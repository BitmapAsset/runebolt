'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Channel, Transfer, ClaimLink, FeeStatus, Stats } from '@/lib/types';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const authenticate = useCallback(
    async (pubkey: string, signFn: (msg: string) => Promise<string | null>) => {
      return withLoading(async () => {
        const { challengeId, message } = await api.challenge(pubkey);
        const signature = await signFn(message);
        if (!signature) throw new Error('User rejected signature');
        return api.verify(challengeId, signature);
      });
    },
    [withLoading]
  );

  const getChannels = useCallback(
    () => withLoading(() => api.getChannels()) as Promise<Channel[] | null>,
    [withLoading]
  );

  const openChannel = useCallback(
    (amount: number) =>
      withLoading(() => api.openChannel(amount)) as Promise<Channel | null>,
    [withLoading]
  );

  const closeChannel = useCallback(
    (channelId: string) => withLoading(() => api.closeChannel(channelId)),
    [withLoading]
  );

  const sendTransfer = useCallback(
    (to: string, amount: number, memo?: string) =>
      withLoading(() => api.transfer(to, amount, memo)) as Promise<Transfer | null>,
    [withLoading]
  );

  const getTransfers = useCallback(
    (limit?: number) => withLoading(() => api.getTransfers(limit)),
    [withLoading]
  );

  const getFeeStatus = useCallback(
    (pubkey: string) =>
      withLoading(() => api.getFeeStatus(pubkey)) as Promise<FeeStatus | null>,
    [withLoading]
  );

  const getStats = useCallback(
    () => withLoading(() => api.getStats()) as Promise<Stats | null>,
    [withLoading]
  );

  const createClaimLink = useCallback(
    (amount: number) =>
      withLoading(() => api.createClaimLink(amount)) as Promise<ClaimLink | null>,
    [withLoading]
  );

  const claimLink = useCallback(
    (claimId: string) => withLoading(() => api.claimLink(claimId)),
    [withLoading]
  );

  const getClaimLink = useCallback(
    (claimId: string) =>
      withLoading(() => api.getClaimLink(claimId)) as Promise<ClaimLink | null>,
    [withLoading]
  );

  return {
    loading,
    error,
    authenticate,
    getChannels,
    openChannel,
    closeChannel,
    sendTransfer,
    getTransfers,
    getFeeStatus,
    getStats,
    createClaimLink,
    claimLink,
    getClaimLink,
  };
}

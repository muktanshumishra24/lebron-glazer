import { useState, useCallback, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import type { Address } from 'viem';
import {
  createOrLoadApiKey,
  getApiKey,
  removeApiKey,
} from '../lib/api-key';
import type { ApiKeyResult } from '../lib/api-key';
import type { ApiKeyCreds } from '../types';

/**
 * Hook for managing API keys
 * @param address - The address (proxy or EOA) to manage API key for
 * @returns API key state and operations
 */
export function useApiKey(address: Address | undefined) {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiKey, setApiKey] = useState<ApiKeyCreds | null>(null);
  const [isNew, setIsNew] = useState(false);

  /**
   * Load existing API key
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const key = await getApiKey();
      setApiKey(key);
      setIsNew(false);
      return key;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create or load API key
   */
  const create = useCallback(
    async (forceRegenerate: boolean = false) => {
      console.log('[useApiKey] create called:', { address, forceRegenerate, hasWalletClient: !!walletClient });

      if (!address) {
        const error = new Error('Address is required');
        console.error('[useApiKey] ❌', error.message);
        setError(error);
        return;
      }

      if (!walletClient || !walletClient.account) {
        const error = new Error('Wallet client is required. Please connect your wallet.');
        console.error('[useApiKey] ❌', error.message);
        setError(error);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('[useApiKey] Calling createOrLoadApiKey with walletClient');
        const result: ApiKeyResult = await createOrLoadApiKey(
          walletClient,
          address as `0x${string}`,
          forceRegenerate
        );
        console.log('[useApiKey] ✅ API key result:', { isNew: result.isNew, hasKey: !!result.apiKey?.key });
        setApiKey(result.apiKey);
        setIsNew(result.isNew);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[useApiKey] ❌ Error:', error);
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, walletClient],
  );

  /**
   * Delete API key
   */
  const remove = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await removeApiKey();
      setApiKey(null);
      setIsNew(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load API key on mount if address is available
  useEffect(() => {
    if (address) {
      load();
    }
  }, [address, load]);

  return {
    apiKey,
    isNew,
    loading,
    error,
    load,
    create,
    remove,
  };
}

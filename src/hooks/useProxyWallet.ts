import { useState, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import type { Address } from 'viem';
import { checkProxyWallet, createProxyWallet, ensureProxyWallet } from '../lib/wallet';
import type { ProxyWalletResult } from '../lib/wallet';

/**
 * Hook for managing proxy wallet operations
 * @param userAddress - The EOA address
 * @returns Proxy wallet state and operations
 */
export function useProxyWallet(userAddress: Address | undefined) {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [proxyWallet, setProxyWallet] = useState<ProxyWalletResult | null>(null);

  /**
   * Check if proxy wallet exists
   */
  const check = useCallback(async () => {
    if (!userAddress) {
      setError(new Error('User address is required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await checkProxyWallet(userAddress as `0x${string}`);
      setProxyWallet(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  /**
   * Create a new proxy wallet
   */
  const create = useCallback(async () => {
    if (!userAddress) {
      setError(new Error('User address is required'));
      return;
    }

    setLoading(true);
    setError(null);

    if (!walletClient || !walletClient.account) {
      throw new Error('Wallet client and account are required to create proxy wallet');
    }

    try {
      const result = await createProxyWallet(userAddress as `0x${string}`, walletClient, walletClient.account);
      setProxyWallet(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  /**
   * Ensure proxy wallet exists (check first, create if needed)
   */
  const ensure = useCallback(async () => {
    if (!userAddress) {
      setError(new Error('User address is required'));
      return;
    }

    setLoading(true);
    setError(null);

    if (!walletClient || !walletClient.account) {
      throw new Error('Wallet client and account are required to ensure proxy wallet');
    }

    try {
      const result = await ensureProxyWallet(userAddress as `0x${string}`, walletClient, walletClient.account);
      setProxyWallet(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  return {
    proxyWallet,
    loading,
    error,
    check,
    create,
    ensure,
  };
}

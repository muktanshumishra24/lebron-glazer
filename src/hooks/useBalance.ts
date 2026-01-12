import { useState, useCallback, useEffect } from 'react';
import type { Address } from 'viem';
import { checkUSDTBalance } from '../lib/balance';
import type { USDTBalance } from '../lib/balance';

/**
 * Hook for checking USDT balance
 * @param address - The address (proxy or EOA) to check balance for
 * @param minimumRequired - Minimum required balance in USDT (default: 1)
 * @param autoRefresh - Whether to automatically refresh balance (default: false)
 * @param refreshInterval - Refresh interval in milliseconds (default: 30000)
 * @returns Balance state and operations
 */
export function useBalance(
  address: Address | undefined,
  minimumRequired: number = 1,
  autoRefresh: boolean = false,
  refreshInterval: number = 30000,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [balance, setBalance] = useState<USDTBalance | null>(null);

  /**
   * Check USDT balance
   */
  const check = useCallback(async () => {
    if (!address) {
      setError(new Error('Address is required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await checkUSDTBalance(address as `0x${string}`, minimumRequired);
      setBalance(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [address, minimumRequired]);

  // Auto-refresh effect
  useEffect(() => {
    if (!address || !autoRefresh) return;

    // Initial check
    check();

    // Set up interval
    const interval = setInterval(() => {
      check();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [address, autoRefresh, refreshInterval, check]);

  return {
    balance,
    loading,
    error,
    check,
  };
}

import { useState, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import type { Address } from 'viem';
import {
  checkApprovals,
  approveTokensForProxy,
  approveTokensForEOA,
} from '../lib/approvals';
import type { ApprovalStatus, ApprovalResult } from '../lib/approvals';

/**
 * Hook for managing token approvals
 * @param address - The address (proxy or EOA) to manage approvals for
 * @param useEOA - Whether to use EOA directly (true) or proxy wallet (false)
 * @returns Approval state and operations
 */
export function useApprovals(
  address: Address | undefined,
  useEOA: boolean = false,
) {
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null);

  /**
   * Check current approval status
   */
  const check = useCallback(async () => {
    if (!address) {
      setError(new Error('Address is required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const status = await checkApprovals(address as `0x${string}`);
      setApprovalStatus(status);
      return status;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [address]);

  /**
   * Approve tokens
   */
  const approve = useCallback(async () => {
    if (!address) {
      setError(new Error('Address is required'));
      return;
    }

    setLoading(true);
    setError(null);

    if (!walletClient) {
      const error = new Error('Wallet client is required. Please connect your wallet.');
      setError(error);
      setLoading(false);
      throw error;
    }

    try {
      const result = useEOA
        ? await approveTokensForEOA(address as `0x${string}`, walletClient)
        : await approveTokensForProxy(address as `0x${string}`, walletClient);
      setApprovalResult(result);
      
      // Refresh approval status after approval
      if (result.success) {
        await check();
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [address, useEOA, check, walletClient]);

  return {
    approvalStatus,
    approvalResult,
    loading,
    error,
    check,
    approve,
  };
}

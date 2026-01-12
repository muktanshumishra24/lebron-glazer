import { useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import type { Address } from 'viem';
import {
  getOpenOrders,
  getOpenOrdersWithApiKey,
  cancelOrder,
  cancelOrders,
  placeOrder,
  placeOrderWithApiKey,
} from '../lib/orders';
import type {
  ApiOrder,
  OrdersResult,
  PlaceOrderParams,
  PlaceOrderResult,
} from '../lib/orders';
import type { ApiKeyCreds } from '../types';

/**
 * Hook for managing orders
 * @param address - The address (proxy or EOA) to manage orders for
 * @param apiKey - API key credentials (optional, will be fetched automatically if not provided)
 * @param accountType - 'eoa' for EOA accounts, undefined/null for proxy wallet accounts
 * @returns Order state and operations
 */
export function useOrders(
  address: Address | undefined,
  apiKey?: ApiKeyCreds | null,
  accountType?: 'eoa',
) {
  const { address: eoaAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [total, setTotal] = useState(0);

  /**
   * Fetch open orders
   */
  const fetchOrders = useCallback(
    async (page: number = 1, limit: number = 20) => {
      if (!address) {
        setError(new Error('Address is required'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let result: OrdersResult;

        if (apiKey) {
          if (!eoaAddress) {
            throw new Error('EOA address is required for getOpenOrders');
          }
          result = await getOpenOrders(address as `0x${string}`, apiKey, eoaAddress as `0x${string}`, accountType, page, limit);
        } else {
          if (!walletClient || !eoaAddress) {
            throw new Error('Wallet client and EOA address are required for getOpenOrdersWithApiKey');
          }
          result = await getOpenOrdersWithApiKey(address as `0x${string}`, eoaAddress as `0x${string}`, walletClient, accountType, page, limit);
        }

        setOrders(result.orders);
        setTotal(result.total);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, apiKey, accountType],
  );

  /**
   * Cancel a single order
   */
  const cancel = useCallback(
    async (order: ApiOrder) => {
      if (!address || !apiKey) {
        setError(new Error('Address and API key are required'));
        return;
      }

      setLoading(true);
      setError(null);

      if (!eoaAddress) {
        throw new Error('EOA address is required for cancelOrder');
      }

      try {
        const success = await cancelOrder(apiKey, order, eoaAddress as `0x${string}`, accountType);
        if (success) {
          // Refresh orders after cancellation
          await fetchOrders();
        }
        return success;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, apiKey, accountType, fetchOrders],
  );

  /**
   * Cancel multiple orders
   */
  const cancelMultiple = useCallback(
    async (ordersToCancel: ApiOrder[]) => {
      if (!address || !apiKey) {
        setError(new Error('Address and API key are required'));
        return;
      }

      if (!eoaAddress) {
        throw new Error('EOA address is required for cancelOrders');
      }

      setLoading(true);
      setError(null);

      try {
        const result = await cancelOrders(address as `0x${string}`, apiKey, ordersToCancel, eoaAddress as `0x${string}`, accountType);
        
        // Refresh orders after cancellation
        await fetchOrders();
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, apiKey, accountType, fetchOrders],
  );

  /**
   * Place an order
   */
  const place = useCallback(
    async (params: PlaceOrderParams, useEOA: boolean = false) => {
      if (!address) {
        setError(new Error('Address is required'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let result: PlaceOrderResult;

        if (apiKey) {
          result = await placeOrder(address as `0x${string}`, apiKey, params, useEOA);
        } else {
          result = await placeOrderWithApiKey(address as `0x${string}`, params, useEOA);
        }

        // Refresh orders after placing
        await fetchOrders();

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, apiKey, fetchOrders],
  );

  return {
    orders,
    total,
    loading,
    error,
    fetchOrders,
    cancel,
    cancelMultiple,
    place,
  };
}

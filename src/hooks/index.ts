/**
 * React hooks for Probable Markets integration
 * 
 * These hooks provide a convenient way to interact with Probable Markets
 * from React components. They handle state management, loading states,
 * and error handling automatically.
 */

export { useProxyWallet } from './useProxyWallet';
export { useApprovals } from './useApprovals';
export { useBalance } from './useBalance';
export { useApiKey } from './useApiKey';
export { useOrders } from './useOrders';

export type { ProxyWalletResult } from '../lib/wallet';
export type { ApprovalStatus, ApprovalResult } from '../lib/approvals';
export type { USDTBalance } from '../lib/balance';
export type { ApiKeyResult } from '../lib/api-key';
export type {
  ApiOrder,
  OrdersResult,
  PlaceOrderParams,
  PlaceOrderResult,
} from '../lib/orders';

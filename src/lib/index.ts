/**
 * Consolidated library exports
 * All utilities consolidated from helpers/ and utils/ folders
 */

// Wallet operations
export { checkProxyWallet, createProxyWallet, ensureProxyWallet } from './wallet';
export type { ProxyWalletResult } from './wallet';

// API Key management
export { createOrLoadApiKey, getApiKey, removeApiKey } from './api-key';
export type { ApiKeyResult } from './api-key';

// Token approvals
export { checkApprovals, approveTokensForProxy, approveTokensForEOA } from './approvals';
export type { ApprovalStatus, ApprovalResult } from './approvals';

// Balance checking
export { checkUSDTBalance } from './balance';
export type { USDTBalance } from './balance';

// Market operations
export {
  fetchMarkets,
  fetchAllMarkets,
  filterMarketsByDescription,
  parseOutcomes,
  getTokenIdForOutcome,
  getOutcomeTokenMap,
  isLALMarket,
  sortMarketsWithLALFirst,
  isTeamMarket,
  findTeamMarkets,
  getTeamsInMarket,
  getBothTeamsBetterThanLAL,
} from './markets';
export type { Market, MarketToken, MarketsResponse } from './markets';

// Order operations
export {
  getOpenOrders,
  getOpenOrdersWithApiKey,
  cancelOrder,
  cancelOrders,
  placeOrder,
  placeOrderWithApiKey,
} from './orders';
export type { ApiOrder, OrdersResult, PlaceOrderParams, PlaceOrderResult } from './orders';

// Utilities
export { generateOrderSalt, roundDown, roundUp, roundNormal, decimalPlaces, resolveAddress, isWalletClient } from './utils';

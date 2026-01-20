/**
 * Consolidated library exports
 * All utilities consolidated from helpers/ and utils/ folders
 */

// Wallet operations
export { checkProxyWallet, createProxyWallet, ensureProxyWallet } from './wallet';
export type { ProxyWalletResult } from '../types';

// API Key management
export { createOrLoadApiKey, getApiKey, removeApiKey } from './api';
export type { ApiKeyResult } from '../types';

// Token approvals
export { checkApprovals, approveTokensForProxy, approveTokensForEOA } from './wallet';
export type { ApprovalStatus, ApprovalResult } from '../types';

// Balance checking
export { checkUSDTBalance, transferUSDT } from './wallet';
export type { USDTBalance } from '../types';

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
export type { Market, MarketToken, MarketsResponse } from '../types';

// Order operations
export {
  getOpenOrders,
  getOpenOrdersWithApiKey,
  cancelOrder,
  cancelOrders,
  placeOrder,
  placeOrderWithApiKey,
} from './orders';
export type { ApiOrder, OrdersResult, PlaceOrderParams, PlaceOrderResult } from '../types';

// Utilities
export { generateOrderSalt, roundDown, roundUp, roundNormal, decimalPlaces, resolveAddress, isWalletClient } from './utils';

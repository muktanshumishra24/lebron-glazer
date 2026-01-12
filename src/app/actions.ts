'use server'

import {
  ensureProxyWallet,
  checkProxyWallet,
  createProxyWallet,
} from '../lib/wallet'
import {
  checkApprovals,
  approveTokensForProxy,
  approveTokensForEOA,
} from '../lib/approvals'
import { checkUSDTBalance } from '../lib/balance'
import {
  getApiKey,
  removeApiKey,
  createOrLoadApiKey,
} from '../lib/api-key'
import {
  getOpenOrders,
  getOpenOrdersWithApiKey,
  cancelOrder,
  cancelOrders,
  placeOrder,
  placeOrderWithApiKey,
} from '../lib/orders'
import { fetchMarkets, fetchAllMarkets } from '../lib/markets'
import type { PlaceOrderParams } from '../lib/orders'
import type { ApiKeyCreds } from '../types'
import type { MarketsResponse, Market } from '../lib/markets'

/**
 * Server Actions for blockchain operations
 * Note: Wallet operations are now handled client-side using wagmi
 * These server actions only handle operations that don't require wallet signing
 */

export async function checkProxyWalletAction(userAddress: `0x${string}`) {
  return await checkProxyWallet(userAddress)
}

export async function createProxyWalletAction(userAddress: `0x${string}`) {
  throw new Error('createProxyWalletAction requires walletClient. Use createProxyWallet directly from client-side with wagmi useWalletClient hook.')
}

export async function ensureProxyWalletAction(userAddress: `0x${string}`) {
  // ensureProxyWallet requires walletClient and account which must come from client-side
  throw new Error('ensureProxyWalletAction requires walletClient. Use ensureProxyWallet directly from client-side with wagmi useWalletClient hook.')
}

// Approval Actions
export async function checkApprovalsAction(address: `0x${string}`) {
  return await checkApprovals(address)
}

export async function approveTokensForProxyAction(proxyAddress: `0x${string}`) {
  // approveTokensForProxy requires walletClient which must come from client-side
  throw new Error('approveTokensForProxyAction requires walletClient. Use approveTokensForProxy directly from client-side with wagmi useWalletClient hook.')
}

export async function approveTokensForEOAAction(eoaAddress: `0x${string}`) {
  // approveTokensForEOA requires walletClient which must come from client-side
  throw new Error('approveTokensForEOAAction requires walletClient. Use approveTokensForEOA directly from client-side with wagmi useWalletClient hook.')
}

// Balance Actions
export async function checkBalanceAction(
  address: `0x${string}`,
  minimumRequired: number = 1,
) {
  return await checkUSDTBalance(address, minimumRequired)
}

// API Key Actions
// Note: createOrLoadApiKey now requires walletClient from wagmi
// This action should be called from client-side with walletClient
// For now, this is a placeholder - API key creation should be done client-side
export async function createOrLoadApiKeyAction(
  address: `0x${string}`,
  forceRegenerate: boolean = false,
) {
  // This function now requires walletClient which must come from client-side
  // API key creation should be handled directly in client components using wagmi hooks
  throw new Error('createOrLoadApiKeyAction requires walletClient. Use createOrLoadApiKey directly from client-side with wagmi useWalletClient hook.')
}

export async function getApiKeyAction() {
  return await getApiKey()
}

export async function removeApiKeyAction() {
  return await removeApiKey()
}

// Order Actions
export async function getOpenOrdersAction(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
  page: number = 1,
  limit: number = 20,
) {
  return await getOpenOrders(address, apiKey, eoaAddress, accountType, page, limit)
}

export async function getOpenOrdersWithApiKeyAction(
  address: `0x${string}`,
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
  page: number = 1,
  limit: number = 20,
) {
  throw new Error('getOpenOrdersWithApiKeyAction requires walletClient. Use getOpenOrdersWithApiKey directly from client-side with wagmi useWalletClient hook.')
}

export async function cancelOrderAction(
  apiKey: ApiKeyCreds,
  order: any,
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
) {
  return await cancelOrder(apiKey, order, eoaAddress, accountType)
}

export async function cancelOrdersAction(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  orders: any[],
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
) {
  return await cancelOrders(address, apiKey, orders, eoaAddress, accountType)
}

export async function placeOrderAction(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  params: PlaceOrderParams,
  useEOA: boolean = false,
) {
  throw new Error('placeOrderAction requires walletClient. Use placeOrderWithApiKey directly from client-side with wagmi useWalletClient hook.')
}

export async function placeOrderWithApiKeyAction(
  address: `0x${string}`,
  params: PlaceOrderParams,
  useEOA: boolean = false,
) {
  throw new Error('placeOrderWithApiKeyAction requires walletClient. Use placeOrderWithApiKey directly from client-side with wagmi useWalletClient hook.')
}

// Market Actions
export async function fetchMarketsAction(active: boolean = true): Promise<MarketsResponse> {
  return await fetchMarkets(active)
}

export async function fetchAllMarketsAction(active: boolean = true): Promise<Market[]> {
  return await fetchAllMarkets(active)
}

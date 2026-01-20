'use server'

import {
  checkProxyWallet,
  checkApprovals,
  checkUSDTBalance,
} from './wallet'
import {
  getApiKey,
  removeApiKey,
} from './api'
import {
  getOpenOrders,
  cancelOrder,
  cancelOrders,
  getPositions,
  getPnL,
} from './orders'
import { fetchMarkets, fetchAllMarkets } from './markets'
import type { PlaceOrderParams, ApiOrder } from '../types'
import type { ApiKeyCreds } from '../types'
import type { MarketsResponse, Market, Position, PnLData } from '../types'

export async function checkProxyWalletAction(userAddress: `0x${string}`) {
  return await checkProxyWallet(userAddress)
}


// Approval Actions
export async function checkApprovalsAction(address: `0x${string}`) {
  return await checkApprovals(address)
}

// Balance Actions
export async function checkBalanceAction(
  address: `0x${string}`,
  minimumRequired: number = 1,
) {
  return await checkUSDTBalance(address, minimumRequired)
}

// API Key Actions
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
  try {
    return await getOpenOrders(address, apiKey, eoaAddress, accountType, page, limit)
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    console.error(`Error fetching open orders (server action): ${errorMessage}`)
    return { orders: [], total: 0, page, limit }
  }
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

// Market Actions
export async function fetchMarketsAction(active: boolean = true): Promise<MarketsResponse> {
  return await fetchMarkets(active)
}

export async function fetchAllMarketsAction(active: boolean = true): Promise<Market[]> {
  return await fetchAllMarkets(active)
}

// Portfolio Actions
export async function getPositionsAction(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
): Promise<Position[]> {
  try {
    // Fetch markets internally to avoid passing large payload from client (avoids 1MB limit)
    const markets = await fetchAllMarkets(false)
    return await getPositions(address, apiKey, markets)
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    console.error(`Error fetching positions (server action): ${errorMessage}`)
    return []
  }
}

export async function getPnLAction(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
): Promise<PnLData> {
  return await getPnL(address, apiKey)
}


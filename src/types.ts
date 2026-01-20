import type { Account, Chain, Transport, WalletClient } from "viem"
import type { AxiosRequestHeaders } from "axios"

// EIP712 Types
export declare type EIP712ObjectValue = string | number | EIP712Object

export interface Position {
  id: string
  marketId: string
  tokenId: string
  outcome: string
  balance: number
  price: number
  value: number
}

export interface PnLData {
  totalPnl: number
  realizedPnl: number
  unrealizedPnl: number
  totalVolume: number
  totalFees: number
}


export interface EIP712Object {
  [key: string]: EIP712ObjectValue
}

// Signer Types
export type SupportedWalletClient = WalletClient<Transport, Chain, Account>
export type SupportedSigner = SupportedWalletClient

export enum SignatureType {
  /**
   * ECDSA EIP712 signatures signed by EOAs
   */
  EOA,

  /**
   * EIP712 signatures signed by EOAs that own Proxy wallets
   */
  PROB_PROXY,

  /**
   * EIP712 signatures signed by EOAs that own Gnosis safes
   */
  PROB_GNOSIS_SAFE,
}

// API Types
export interface ApiKeyCreds {
  key: string
  secret: string
  passphrase: string
}

export interface L1ProbHeader extends AxiosRequestHeaders {
  PROB_ADDRESS: string
  PROB_SIGNATURE: string
  PROB_TIMESTAMP: string
  PROB_NONCE: string
}

export interface ApiKeyRaw {
  apiKey: string
  secret: string
  passphrase: string
}

// Order Types
export type TickSize = '0.1' | '0.01' | '0.001' | '0.0001'

export type CreateOrderOptions = {
  tickSize: TickSize
  negRisk?: boolean
}

export enum Side {
  BUY,
  SELL,
}

// User-facing order structure
export interface UserOrder {
  tokenID: string        // Conditional token asset id
  price: number          // Order price
  size: number           // ConditionalToken amount
  side: Side             // BUY or SELL
  feeRateBps?: number    // (bps) Fee rate for order maker
  nonce?: number         // On-chain cancellation nonce
  expiration?: number    // Expiry time (seconds)
  taker?: string         // Zero address = public order
}

export interface Order extends EIP712Object {
  readonly salt: string
  readonly maker: string        // Funds source
  readonly signer: string       // Order signer
  readonly taker: string        // Zero address = public
  readonly tokenId: string      // Asset tokenId BUY=sell asset, SELL=buy asset
  readonly makerAmount: string  // Max tokens to sell
  readonly takerAmount: string  // Min tokens to receive
  readonly expiration: string   // Expiry timestamp
  readonly nonce: string        // Nonce for cancellation
  readonly feeRateBps: string   // (bps) Maker fee rate
  readonly side: Side           // BUY or SELL
  readonly signatureType: SignatureType // SignatureType (e.g. EOA)
}

export type OrderSignature = string

export interface SignedOrder extends Order {
  readonly signature: OrderSignature
}

// API-/internal-oriented shape for order creation
export interface OrderData {
  maker: string
  taker: string
  tokenId: string
  makerAmount: string
  takerAmount: string
  side: Side
  feeRateBps: string
  nonce: string
  signer?: string
  expiration?: string
  signatureType?: SignatureType
}

export interface RoundConfig {
  readonly price: number
  readonly size: number
  readonly amount: number
}


// --- Consolidated Types from Lib & Config ---

// From src/lib/wallet.ts
export interface ProxyWalletResult {
  address: `0x${string}`;
  exists: boolean;
  transactionHash?: `0x${string}`;
}

export interface USDTBalance {
  balance: bigint;
  balanceFormatted: number;
  decimals: number;
  hasMinimumBalance: boolean;
  minimumRequired: number;
}

export interface ApprovalStatus {
  needsUSDTForCTFToken: boolean;
  needsUSDTForExchange: boolean;
  needsCTFTokenForExchange: boolean;
}

export interface ApprovalResult {
  success: boolean;
  transactionHash?: `0x${string}`;
  approvalsExecuted: number;
  error?: string;
}

// From src/lib/api.ts
export interface ApiKeyResult {
  apiKey: ApiKeyCreds;
  isNew: boolean;
  error?: string;
}

// From src/lib/markets.ts
export interface MarketToken {
  token_id: string;
  outcome: string;
}

export interface Market {
  id: string;
  condition_id: string;
  question: string;
  question_id: string;
  market_slug: string;
  outcomes: string; // JSON string array
  volume24hr: string;
  liquidity: string;
  clobTokenIds: string; // JSON string array
  active: boolean;
  closed: boolean;
  archived: boolean;
  startDate: string;
  endDate: string;
  tokens: MarketToken[];
  icon?: string;
  description: string;
  tags: string[];
  groupItemTitle: string;
  resolved: boolean;
  liveness: string;
  disputed: boolean;
}

export interface MarketsResponse {
  markets: Market[];
  pagination?: {
    page: number;
    limit: number;
    totalResults: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevPage: boolean;
  };
}

// From src/lib/orders.ts
export interface ApiOrder {
  orderId: number;
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  timeInForce: string;
  price: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  status: string;
  time: number;
  updateTime: number;
  avgPrice: string;
  origType: string;
  tokenId: string;
  ctfTokenId: string;
  stopPrice: string;
  orderListId: number;
  // Fallback for fields that might be used elsewhere or in different API versions
  id?: string;
  market_id?: string;
  created_at?: string;
  outcome?: string;
}

export interface OrdersResult {
  orders: ApiOrder[];
  total: number;
  error?: string;
}

export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
  tickSize?: '0.1' | '0.01' | '0.001' | '0.0001';
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
  taker?: string;
}

export interface PlaceOrderResult {
  orderId?: string;
  success: boolean;
  order?: any;
  error?: string;
}

// From src/config/network.ts
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  proxyFactoryAddress: `0x${string}`;
  usdtAddress: `0x${string}`;
  ctfTokenAddress: `0x${string}`;
  ctfExchangeAddress: `0x${string}`;
  entryService: string;
  collateralTokenDecimals: number;
  orderSignerAddress?: `0x${string}`;
  proxyImplementationAddress?: `0x${string}`;
  conditionalTokensAddress?: `0x${string}`;
}

// From src/config/nba-standings.ts
export interface TeamStanding {
  rank: number;
  code: string;
  name: string;
  wins: number;
  losses: number;
  winPct: string;
}


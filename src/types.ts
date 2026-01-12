import type { Account, Chain, Transport, WalletClient } from "viem"
import type { AxiosRequestHeaders } from "axios"

// EIP712 Types
export declare type EIP712ObjectValue = string | number | EIP712Object

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

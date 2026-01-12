import type { WalletClient, Transport, Chain, Account } from "viem"
import * as crypto from 'crypto';
import { buildClobEip712Signature } from "./signatures"
import type { L1ProbHeader } from "../types"

/**
 * L1 Headers - EIP-712 signature based authentication
 */
export const createL1Headers = async (
  wallet: WalletClient<Transport, Chain, Account>,
  chainId: number,
  nonce?: number,
  timestamp?: number,
): Promise<L1ProbHeader> => {
  let ts = Math.floor(Date.now() / 1000)
  if (timestamp !== undefined) {
    ts = timestamp
  }
  let n = 0
  if (nonce !== undefined) {
    n = nonce
  }
  const sig = await buildClobEip712Signature(wallet, chainId, ts, n)
  const address = wallet.account?.address
  if (!address) {
    throw new Error('Wallet address is not defined')
  }

  const headers = {
    PROB_ADDRESS: address,
    PROB_SIGNATURE: sig,
    PROB_TIMESTAMP: `${ts}`,
    PROB_NONCE: `${n}`,
  }

  return headers as L1ProbHeader
}

/**
 * L2 Headers - HMAC signature based authentication
 */
function replaceAll(s: string, search: string, replace: string) {
  return s.split(search).join(replace);
}

/**
 * Build HMAC signature for L2 headers
 */
export const buildHmacSignature = (
  secret: string,
  timestamp: number,
  method: string,
  requestPath: string,
  body?: string,
): string => {
  let message = timestamp + method + requestPath;
  if (body !== undefined) {
    message += body;
  }
  const base64Secret = Buffer.from(secret, "base64");
  const hmac = crypto.createHmac("sha256", base64Secret);
  const sig = hmac.update(message).digest("base64");

  // NOTE: Must be url safe base64 encoding, but keep base64 "=" suffix
  // Convert '+' to '-'
  // Convert '/' to '_'
  const sigUrlSafe = replaceAll(replaceAll(sig, "+", "-"), "/", "_");
  return sigUrlSafe;
};

/**
 * Create L2 headers for authenticated API requests
 * @param accountType - 'eoa' for EOA accounts, undefined/null for proxy wallet accounts
 */
export function createL2Headers(
  address: string,
  apiKey: string,
  secret: string,
  passphrase: string,
  method: string,
  path: string,
  body: any,
  accountType?: 'eoa'
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyString = body ? JSON.stringify(body) : '';
  const signature = buildHmacSignature(secret, timestamp, method, path, bodyString);

  const headers: Record<string, string> = {
    'prob_address': address,
    'prob_signature': signature,
    'prob_timestamp': timestamp.toString(),
    'prob_api_key': apiKey,
    'prob_passphrase': passphrase,
    'Content-Type': 'application/json'
  };

  // Add PROB_ACCOUNT_TYPE header for EOA accounts
  if (accountType === 'eoa') {
    headers['PROB_ACCOUNT_TYPE'] = 'eoa';
  }

  return headers;
}

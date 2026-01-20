import axios from "axios";
import * as crypto from 'crypto';
import type { ApiKeyCreds, ApiKeyRaw, L1ProbHeader, ApiKeyResult } from "../types";
import { NETWORK_CONFIG } from "../config/index";
import { buildClobEip712Signature } from "./wallet"; // Import from new consolidated wallet
import type { WalletClient, Transport, Chain, Account } from "viem";

// --- Types ---

// Imported from ../types

// --- Headers ---

export const createL1Headers = async (
  wallet: WalletClient<Transport, Chain, Account>,
  chainId: number,
  nonce?: number,
  timestamp?: number,
): Promise<L1ProbHeader> => {
  const ts = timestamp ?? Math.floor(Date.now() / 1000)
  const n = nonce ?? 0
  
  const sig = await buildClobEip712Signature(wallet, chainId, ts, n)
  const address = wallet.account?.address
  
  if (!address) throw new Error('Wallet address is not defined')

  return {
    PROB_ADDRESS: address,
    PROB_SIGNATURE: sig,
    PROB_TIMESTAMP: `${ts}`,
    PROB_NONCE: `${n}`,
  } as L1ProbHeader
}

function replaceAll(s: string, search: string, replace: string) {
  return s.split(search).join(replace);
}

export const buildHmacSignature = (
  secret: string,
  timestamp: number,
  method: string,
  requestPath: string,
  body?: string,
): string => {
  let message = timestamp + method + requestPath;
  if (body !== undefined) message += body;
  
  const base64Secret = Buffer.from(secret, "base64");
  const hmac = crypto.createHmac("sha256", base64Secret);
  const sig = hmac.update(message).digest("base64");

  return replaceAll(replaceAll(sig, "+", "-"), "/", "_");
};

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

  if (accountType === 'eoa') {
    headers['PROB_ACCOUNT_TYPE'] = 'eoa';
  }

  return headers;
}

// --- API Key Storage (Client Side) ---

async function loadApiKey(): Promise<ApiKeyCreds | null> {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('api-key');
    return stored ? JSON.parse(stored) as ApiKeyCreds : null;
  } catch (error) {
    return null;
  }
}

async function saveApiKey(apiKey: ApiKeyCreds): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('API key storage is only available on the client side. Use localStorage.');
  }
  localStorage.setItem('api-key', JSON.stringify(apiKey));
}

async function deleteApiKey(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api-key');
  }
}

// --- API Key Creation ---

export async function createApiKey(
  wallet: WalletClient<Transport, Chain, Account>,
  nonce?: number,
): Promise<ApiKeyCreds> {
  if (!NETWORK_CONFIG.entryService) throw new Error('ENTRY_SERVICE environment variable is not set')

  const ts = Math.floor(Date.now() / 1000);
  const headers = await createL1Headers(wallet, NETWORK_CONFIG.chainId, nonce, ts);

  try {
    const url = `/api/create-api-key`
    const response = await axios.post(url, { headers }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const apiKeyRaw = response.data as ApiKeyRaw;
    return {
      key: apiKeyRaw.apiKey,
      secret: apiKeyRaw.secret,
      passphrase: apiKeyRaw.passphrase,
    };
  } catch (error) {
    console.error(`[API_KEY] ❌ Error creating API key:`, error);
    throw new Error('Failed to create API key');
  }
}

export async function createOrLoadApiKey(
  walletClient: WalletClient<Transport, Chain, Account>,
  address: `0x${string}`,
  forceRegenerate: boolean = false,
): Promise<ApiKeyResult> {
  if (forceRegenerate) {
    await deleteApiKey();
  }

  const existingApiKey = await loadApiKey();
  if (existingApiKey && !forceRegenerate) {
    return { apiKey: existingApiKey, isNew: false };
  }

  if (!walletClient || !walletClient.account) {
    throw new Error('Wallet client not provided or not connected.');
  }

  const apiKey = await createApiKey(walletClient);
  await saveApiKey(apiKey);

  return { apiKey, isNew: true };
}

export async function getApiKey(): Promise<ApiKeyCreds | null> {
  return await loadApiKey();
}

export async function removeApiKey(): Promise<void> {
  await deleteApiKey();
}

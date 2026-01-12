import { createApiKey } from './api';
import type { ApiKeyCreds } from '../types';
import type { WalletClient, Transport, Chain, Account } from 'viem';

/**
 * Result of API key operation
 */
export interface ApiKeyResult {
  apiKey: ApiKeyCreds;
  isNew: boolean;
}

/**
 * Load API key from storage (localStorage only - client-side)
 */
async function loadApiKey(): Promise<ApiKeyCreds | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem('api-key');
    if (stored) {
      return JSON.parse(stored) as ApiKeyCreds;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Save API key to storage (localStorage only - client-side)
 */
async function saveApiKey(apiKey: ApiKeyCreds): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('API key storage is only available on the client side. Use localStorage.');
    }

    localStorage.setItem('api-key', JSON.stringify(apiKey));
  } catch (error) {
    console.error('Error saving API key:', error);
    throw error;
  }
}

/**
 * Delete API key from storage (localStorage only - client-side)
 */
async function deleteApiKey(): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem('api-key');
  } catch (error) {
    // Ignore errors when deleting
  }
}

/**
 * Create or load API key
 */
export async function createOrLoadApiKey(
  walletClient: WalletClient<Transport, Chain, Account>,
  address: `0x${string}`,
  forceRegenerate: boolean = false,
): Promise<ApiKeyResult> {
  console.log('[API_KEY] createOrLoadApiKey called:', {
    address,
    forceRegenerate,
    hasWalletClient: !!walletClient,
    hasAccount: !!walletClient?.account
  })

  if (forceRegenerate) {
    console.log('[API_KEY] Force regenerating - deleting existing key')
    await deleteApiKey();
  }

  const existingApiKey = await loadApiKey();
  console.log('[API_KEY] Existing API key check:', {
    exists: !!existingApiKey,
    hasKey: !!existingApiKey?.key
  })

  if (existingApiKey && !forceRegenerate) {
    console.log('[API_KEY] ✅ Returning existing API key')
    return {
      apiKey: existingApiKey,
      isNew: false,
    };
  }

  if (!walletClient || !walletClient.account) {
    console.error('[API_KEY] ❌ Wallet client not provided or not connected')
    throw new Error('Wallet client not provided or not connected.');
  }

  console.log('[API_KEY] Creating new API key...')
  console.log('[API_KEY] Wallet client details:', {
    account: walletClient.account.address,
    chainId: walletClient.chain?.id
  })

  try {
    const apiKey = await createApiKey(walletClient);
    console.log('[API_KEY] ✅ API key created successfully')
    await saveApiKey(apiKey);
    console.log('[API_KEY] ✅ API key saved to localStorage')

    return {
      apiKey,
      isNew: true,
    };
  } catch (error) {
    console.error('[API_KEY] ❌ Error creating API key:', error)
    throw error
  }
}

/**
 * Get existing API key if available
 */
export async function getApiKey(): Promise<ApiKeyCreds | null> {
  return await loadApiKey();
}

/**
 * Delete API key
 */
export async function removeApiKey(): Promise<void> {
  await deleteApiKey();
}

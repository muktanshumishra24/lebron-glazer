import axios from "axios";
import { createL1Headers } from "./headers";
import type { ApiKeyCreds, ApiKeyRaw } from "../types";
import { CHAIN_ID, ENTRY_SERVICE } from "../config/index";
import type { WalletClient, Transport, Chain, Account } from "viem";

/**
 * Creates a new API key for a user
 */
export async function createApiKey(
  wallet: WalletClient<Transport, Chain, Account>,
  nonce?: number,
): Promise<ApiKeyCreds> {
  console.log('[API_KEY] createApiKey called:', {
    hasWallet: !!wallet,
    hasAccount: !!wallet?.account,
    account: wallet?.account?.address,
    chainId: wallet?.chain?.id,
    nonce
  })

  if (!ENTRY_SERVICE) {
    console.error('[API_KEY] ❌ ENTRY_SERVICE not set')
    throw new Error('ENTRY_SERVICE environment variable is not set')
  }

  const endpoint = ENTRY_SERVICE;
  const t = Math.floor(Date.now() / 1000);
  console.log('[API_KEY] Creating L1 headers...', { endpoint, chainId: CHAIN_ID, timestamp: t })

  const headers = await createL1Headers(wallet, CHAIN_ID, nonce, t);
  console.log('[API_KEY] ✅ Headers created, making API request...')

  try {
    const url = `${endpoint}/public/api/v1/auth/api-key/${CHAIN_ID}`
    console.log('[API_KEY] POST request to:', url)
    const response = await axios.post(url, {}, { headers });
    console.log('[API_KEY] ✅ API response received:', {
      status: response.status,
      hasData: !!response.data
    })
    
    const apiKeyRaw = response.data as ApiKeyRaw;
    const apiKey: ApiKeyCreds = {
      key: apiKeyRaw.apiKey,
      secret: apiKeyRaw.secret,
      passphrase: apiKeyRaw.passphrase,
    };
    console.log('[API_KEY] ✅ API key parsed successfully:', {
      hasKey: !!apiKey.key,
      hasSecret: !!apiKey.secret,
      hasPassphrase: !!apiKey.passphrase
    })
    return apiKey;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error?.message || errorData?.message || error.message;
      const errorCode = errorData?.error?.code || errorData?.code;
      
      console.error('[API_KEY] ❌ API Error (createApiKey):');
      if (errorCode) {
        console.error(`   Code: ${errorCode}`);
      }
      console.error(`   Message: ${errorMessage}`);
      if (error.response?.status) {
        console.error(`   Status: ${error.response.status}`);
      }
      if (error.response?.data) {
        console.error(`   Response Data:`, error.response.data);
      }
      console.error('');
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[API_KEY] ❌ Error creating API key: ${errorMessage}`);
    }
    throw new Error('Failed to create API key');
  }
}

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { NETWORK_CONFIG } from './index';

/**
 * Setup and initialize blockchain public client
 * Note: Wallet operations are now handled client-side using wagmi
 * This only provides a public client for read operations
 */

// Use BSC Mainnet chain
const chain = bsc;

// Lazy initialization to avoid errors during build
let _publicClient: ReturnType<typeof createPublicClient> | null = null;

function initializePublicClient() {
  if (_publicClient) {
    return _publicClient;
  }

  try {
    _publicClient = createPublicClient({
      chain,
      transport: http(NETWORK_CONFIG.rpcUrl),
    });

    return _publicClient;
  } catch (error) {
    console.warn('Public client not initialized:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Export getter for public client (read-only operations)
export function getPublicClient() {
  return initializePublicClient();
}

// For backward compatibility
export const publicClient = getPublicClient();
export const walletRpcUrl = NETWORK_CONFIG.rpcUrl;

/**
 * @deprecated Wallet operations are now handled client-side using wagmi
 * These functions are stubs that throw errors to guide migration
 */
export function getWalletClient() {
  throw new Error(
    'getWalletClient() is no longer available. ' +
    'Use wagmi hooks (useWalletClient) on the client side instead. ' +
    'For server actions, pass walletClient as a parameter from the client.'
  );
}

export function getAccount() {
  throw new Error(
    'getAccount() is no longer available. ' +
    'Use wagmi hooks (useAccount) on the client side instead. ' +
    'For server actions, pass account information as a parameter from the client.'
  );
}

export function getPrivateKeyValue() {
  throw new Error(
    'getPrivateKeyValue() is no longer available. ' +
    'Private keys are no longer stored or used. ' +
    'Use wagmi for wallet operations on the client side.'
  );
}

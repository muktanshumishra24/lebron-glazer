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

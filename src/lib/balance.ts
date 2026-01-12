import { getContract } from 'viem';
import { USDT_ADDRESS, ERC20_ABI, NETWORK_CONFIG } from '../config/index';
import { getPublicClient } from '../config/clients';

/**
 * USDT balance information
 */
export interface USDTBalance {
  balance: bigint;
  balanceFormatted: number;
  decimals: number;
  hasMinimumBalance: boolean;
  minimumRequired: number;
}

/**
 * Check USDT balance for an address
 */
export async function checkUSDTBalance(
  address: `0x${string}`,
  minimumRequired: number = 1,
): Promise<USDTBalance> {
  const publicClient = getPublicClient();

  if (!publicClient) {
    throw new Error('Blockchain clients not initialized. RPC_URL must be set.');
  }

  const usdtContract = getContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    client: { public: publicClient },
  });

  // Try to read decimals from the contract, fallback to config value if it fails
  let decimals: number;
  try {
    decimals = await usdtContract.read.decimals();
  } catch (error) {
    console.warn('Failed to read decimals from USDT contract, using config value:', error);
    decimals = NETWORK_CONFIG.collateralTokenDecimals;
  }

  const decimalsMultiplier = 10n ** BigInt(decimals);

  // Check USDT balance
  let balance: bigint;
  try {
    balance = await usdtContract.read.balanceOf([address]);
  } catch (error) {
    throw error;
  }
  
  const balanceInUSDT = Number(balance) / Number(decimalsMultiplier);

  return {
    balance,
    balanceFormatted: balanceInUSDT,
    decimals,
    hasMinimumBalance: balanceInUSDT > minimumRequired,
    minimumRequired,
  };
}

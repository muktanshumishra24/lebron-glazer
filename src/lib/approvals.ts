import { encodeFunctionData, maxUint256, getContract } from 'viem';
import type { MetaTransactionData } from '@safe-global/types-kit';
import {
  USDT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  CTF_TOKEN_ADDRESS,
  ERC20_ABI,
  ERC1155_ABI,
} from '../config/index';
import { getPublicClient } from '../config/clients';
import type { WalletClient } from 'viem';

/**
 * Approval status for all required token approvals
 */
export interface ApprovalStatus {
  needsUSDTForCTFToken: boolean;
  needsUSDTForExchange: boolean;
  needsCTFTokenForExchange: boolean;
}

/**
 * Result of approval operation
 */
export interface ApprovalResult {
  success: boolean;
  transactionHash?: `0x${string}`;
  approvalsExecuted: number;
}

/**
 * Execute Safe transaction (for proxy wallets)
 * Note: This requires walletClient to be passed from client-side
 */
async function executeSafeTransaction(
  safeAddress: `0x${string}`,
  transactions: MetaTransactionData[],
  walletClient: WalletClient,
): Promise<`0x${string}`> {
  // Note: Safe SDK integration would go here
  // For now, this is a placeholder that needs walletClient from wagmi
  throw new Error('Safe transaction execution requires Safe SDK integration with walletClient from wagmi');
}

/**
 * Check all token approvals in parallel using multicall
 */
export async function checkApprovals(address: `0x${string}`): Promise<ApprovalStatus> {
  const publicClient = getPublicClient();
  if (!publicClient) {
    throw new Error('Blockchain clients not initialized. RPC_URL must be set.');
  }

  const results = await publicClient.multicall({
    contracts: [
      {
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CTF_TOKEN_ADDRESS],
      },
      {
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CTF_EXCHANGE_ADDRESS],
      },
      {
        address: CTF_TOKEN_ADDRESS,
        abi: ERC1155_ABI,
        functionName: 'isApprovedForAll',
        args: [address, CTF_EXCHANGE_ADDRESS],
      },
    ],
  });

  return {
    needsUSDTForCTFToken: results[0].status === 'success' && results[0].result < maxUint256,
    needsUSDTForExchange: results[1].status === 'success' && results[1].result < maxUint256,
    needsCTFTokenForExchange: results[2].status === 'success' && !results[2].result,
  };
}

/**
 * Approve tokens for proxy wallet (using Safe transactions)
 * Note: Safe transaction execution requires Safe SDK integration
 * For now, this throws an error indicating it needs Safe SDK setup
 */
export async function approveTokensForProxy(
  proxyAddress: `0x${string}`,
  walletClient: WalletClient,
): Promise<ApprovalResult> {
  console.log('[PROXY] approveTokensForProxy called for:', proxyAddress)
  
  const publicClient = getPublicClient();
  if (!publicClient || !walletClient || !walletClient.account) {
    throw new Error('Blockchain clients not initialized.');
  }

  const status = await checkApprovals(proxyAddress);
  console.log('[PROXY] Approval status:', status)

  // Build contract transactions similar to EOA approvals
  // These will be executed from the EOA, setting approvals that the proxy wallet can use
  const contractTransactions: Array<{
    contract: ReturnType<typeof getContract>;
    functionName: string;
    args: any[];
  }> = [];

  if (status.needsUSDTForCTFToken) {
    const usdtContract = getContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      client: { public: publicClient, wallet: walletClient },
    });
    contractTransactions.push({
      contract: usdtContract,
      functionName: 'approve',
      args: [CTF_TOKEN_ADDRESS, maxUint256],
    });
  }

  if (status.needsUSDTForExchange) {
    const usdtContract = getContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      client: { public: publicClient, wallet: walletClient },
    });
    contractTransactions.push({
      contract: usdtContract,
      functionName: 'approve',
      args: [CTF_EXCHANGE_ADDRESS, maxUint256],
    });
  }

  if (status.needsCTFTokenForExchange) {
    const ctfTokenContract = getContract({
      address: CTF_TOKEN_ADDRESS,
      abi: ERC1155_ABI,
      client: { public: publicClient, wallet: walletClient },
    });
    contractTransactions.push({
      contract: ctfTokenContract,
      functionName: 'setApprovalForAll',
      args: [CTF_EXCHANGE_ADDRESS, true],
    });
  }

  if (contractTransactions.length === 0) {
    console.log('[PROXY] ✅ No approvals needed')
    return {
      success: true,
      approvalsExecuted: 0,
    };
  }

  console.log('[PROXY] Executing', contractTransactions.length, 'approval transactions for proxy wallet:', proxyAddress)
  console.warn('[PROXY] ⚠️ IMPORTANT: Approvals must be executed FROM the proxy address, not the EOA.')
  console.warn('[PROXY] ⚠️ Current implementation executes from EOA - this may not work correctly.')
  console.warn('[PROXY] ⚠️ Proxy wallet requires execution mechanism to properly set approvals.')
  
  // IMPORTANT: Approvals need to be executed FROM the proxy address, not the EOA
  // The current implementation executes from EOA, which means approvals are set for EOA, not proxy
  // This is a limitation - proper implementation requires the proxy's execution mechanism
  // For now, we'll attempt to execute but this may not work correctly
  
  // TODO: Implement proper proxy execution mechanism
  // The proxy wallet likely has an execute() or execTransaction() function
  // that allows the EOA owner to execute transactions on behalf of the proxy
  
  let lastHash: `0x${string}` | undefined;
  for (const tx of contractTransactions) {
    console.log('[PROXY] Executing:', tx.functionName, 'with args:', tx.args)
    console.warn('[PROXY] ⚠️ Executing from EOA - approvals will be set for EOA, not proxy!')
    try {
      // This executes from EOA - NOT CORRECT for proxy wallets
      // Approvals will be set for the EOA address, not the proxy address
      const hash = await (tx.contract as any).write[tx.functionName](tx.args as any);
      console.log('[PROXY] Transaction submitted:', hash)
      await publicClient.waitForTransactionReceipt({ hash });
      console.log('[PROXY] ✅ Transaction confirmed:', hash)
      console.warn('[PROXY] ⚠️ WARNING: Approval was set for EOA, not proxy. This may not work for proxy wallet trading.')
      lastHash = hash;
    } catch (error: any) {
      console.error('[PROXY] ❌ Error executing approval:', error)
      throw new Error(`Failed to execute proxy wallet approval for ${tx.functionName}. The proxy wallet requires a proper execution mechanism. Error: ${error.message}`);
    }
  }

  console.log('[PROXY] ✅ All approval transactions completed:', {
    approvalsExecuted: contractTransactions.length,
    lastHash
  })

  return {
    success: true,
    transactionHash: lastHash,
    approvalsExecuted: contractTransactions.length,
  };
}

/**
 * Approve tokens for EOA (using direct transactions)
 */
export async function approveTokensForEOA(
  eoaAddress: `0x${string}`,
  walletClient: WalletClient,
): Promise<ApprovalResult> {
  const publicClient = getPublicClient();
  
  if (!publicClient || !walletClient) {
    throw new Error('Blockchain clients not initialized.');
  }

  const status = await checkApprovals(eoaAddress);

  const transactions: Array<{
    contract: ReturnType<typeof getContract>;
    functionName: string;
    args: any[];
  }> = [];

  if (status.needsUSDTForCTFToken) {
    const usdtContract = getContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      client: { public: publicClient, wallet: walletClient },
    });
    transactions.push({
      contract: usdtContract,
      functionName: 'approve',
      args: [CTF_TOKEN_ADDRESS, maxUint256],
    });
  }

  if (status.needsUSDTForExchange) {
    const usdtContract = getContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      client: { public: publicClient, wallet: walletClient },
    });
    transactions.push({
      contract: usdtContract,
      functionName: 'approve',
      args: [CTF_EXCHANGE_ADDRESS, maxUint256],
    });
  }

  if (status.needsCTFTokenForExchange) {
    const ctfTokenContract = getContract({
      address: CTF_TOKEN_ADDRESS,
      abi: ERC1155_ABI,
      client: { public: publicClient, wallet: walletClient },
    });
    transactions.push({
      contract: ctfTokenContract,
      functionName: 'setApprovalForAll',
      args: [CTF_EXCHANGE_ADDRESS, true],
    });
  }

  if (transactions.length === 0) {
    return {
      success: true,
      approvalsExecuted: 0,
    };
  }

  // Execute all approvals sequentially
  let lastHash: `0x${string}` | undefined;
  for (const tx of transactions) {
    const hash = await (tx.contract as any).write[tx.functionName](tx.args as any);
    await publicClient.waitForTransactionReceipt({ hash });
    lastHash = hash;
  }

  return {
    success: true,
    transactionHash: lastHash,
    approvalsExecuted: transactions.length,
  };
}

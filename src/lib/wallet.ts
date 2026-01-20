import { getContract, isAddress, encodeFunctionData, maxUint256 } from 'viem';
import { NETWORK_CONFIG, PROXY_FACTORY_ABI, ERC20_ABI, ERC1155_ABI, MSG_TO_SIGN } from '../config/index';
import { getPublicClient } from '../config/clients';
import { resolveAddress } from "./utils";
import type { WalletClient, Account } from 'viem';
import type { SupportedSigner, ProxyWalletResult, USDTBalance, ApprovalStatus, ApprovalResult } from "../types";

// --- Types ---

// --- Types ---

// Imported from ../types

// --- Signatures ---

export const buildClobEip712Signature = async (
  signer: SupportedSigner,
  chainId: number,
  timestamp: number,
  nonce: number,
): Promise<string> => {
  const address = await resolveAddress(signer)
  return signer.signTypedData({
    domain: {
        name: 'ClobAuthDomain',
        version: '1',
        chainId,
    },
    primaryType: 'ClobAuth',
    types: {
        ClobAuth: [
        { name: 'address', type: 'address' },
        { name: 'timestamp', type: 'string' },
        { name: 'nonce', type: 'uint256' },
        { name: 'message', type: 'string' },
        ],
    },
    message: {
        address: address as `0x${string}`,
        timestamp: `${timestamp}`,
        nonce: BigInt(nonce),
        message: MSG_TO_SIGN,
    },
  })
}

// --- Proxy Wallet ---

async function checkProxyExists(userAddress: `0x${string}`): Promise<{ exists: boolean; address: `0x${string}` }> {
  try {
    const publicClient = getPublicClient();
    if (!publicClient) throw new Error('Public client not initialized.');

    const proxyFactory = getContract({
      address: NETWORK_CONFIG.proxyFactoryAddress,
      abi: PROXY_FACTORY_ABI,
      client: { public: publicClient },
    });

    const proxyAddress = (await proxyFactory.read.computeProxyAddress([userAddress])) as `0x${string}`;
    if (!isAddress(proxyAddress)) return { exists: false, address: proxyAddress };

    const code = await publicClient.getBytecode({ address: proxyAddress });
    return { exists: code !== '0x' && code !== undefined, address: proxyAddress };
  } catch (error) {
    console.error('Error checking proxy existence:', error);
    throw error;
  }
}

async function generateCreateProxySignature(
  paymentToken: `0x${string}`,
  payment: bigint,
  paymentReceiver: `0x${string}`,
  walletClient: WalletClient,
  account: Account,
): Promise<{ v: number; r: `0x${string}`; s: `0x${string}` }> {
  const publicClient = getPublicClient();
  if (!publicClient) throw new Error('Blockchain clients not initialized.');

  const chainId = await publicClient.getChainId();
  const signature = await walletClient.signTypedData({
    account,
    domain: {
        name: 'Probable Contract Proxy Factory',
        chainId: chainId,
        verifyingContract: NETWORK_CONFIG.proxyFactoryAddress,
    },
    types: {
        CreateProxy: [
        { name: 'paymentToken', type: 'address' },
        { name: 'payment', type: 'uint256' },
        { name: 'paymentReceiver', type: 'address' },
        ],
    },
    primaryType: 'CreateProxy',
    message: { paymentToken, payment, paymentReceiver },
  });

  const r = (`0x${signature.slice(2, 66)}`) as `0x${string}`;
  const s = (`0x${signature.slice(66, 130)}`) as `0x${string}`;
  let v = parseInt(signature.slice(130, 132), 16);
  if (v < 27) v += 27;

  return { v, r, s };
}

export async function checkProxyWallet(userAddress: `0x${string}`): Promise<ProxyWalletResult> {
  const { exists, address } = await checkProxyExists(userAddress);
  return { address, exists };
}

export async function createProxyWallet(
  userAddress: `0x${string}`,
  walletClient: WalletClient,
  account: Account,
): Promise<ProxyWalletResult> {
  const publicClient = getPublicClient();
  if (!publicClient || !walletClient || !account) throw new Error('Blockchain clients not initialized.');

  const proxyFactory = getContract({
    address: NETWORK_CONFIG.proxyFactoryAddress,
    abi: PROXY_FACTORY_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  const paymentToken = '0x0000000000000000000000000000000000000000' as `0x${string}`;
  const payment = 0n;
  const paymentReceiver = '0x0000000000000000000000000000000000000000' as `0x${string}`;

  const proxyAddress = (await proxyFactory.read.computeProxyAddress([userAddress])) as `0x${string}`;
  const createSig = await generateCreateProxySignature(paymentToken, payment, paymentReceiver, walletClient, account);
  const gasEstimate = await publicClient.estimateContractGas({
    address: NETWORK_CONFIG.proxyFactoryAddress,
    abi: PROXY_FACTORY_ABI,
    functionName: 'createProxy',
    args: [paymentToken, payment, paymentReceiver, createSig],
    account: account.address,
  });

  const gasLimit = (gasEstimate * 110n) / 100n;
  const gasPrice = await publicClient.getGasPrice();

  const hash = await proxyFactory.write.createProxy(
    [paymentToken, payment, paymentReceiver, createSig],
    { gas: gasLimit, maxFeePerGas: gasPrice } as any,
  );
  
  await publicClient.waitForTransactionReceipt({ hash });

  return { address: proxyAddress, exists: true, transactionHash: hash };
}

export async function ensureProxyWallet(
  userAddress: `0x${string}`,
  walletClient: any,
  account: any,
): Promise<ProxyWalletResult> {
  const existing = await checkProxyWallet(userAddress);
  if (existing.exists) return existing;
  return await createProxyWallet(userAddress, walletClient, account);
}

// --- Balances ---

export async function checkUSDTBalance(
  address: `0x${string}`,
  minimumRequired: number = 1,
): Promise<USDTBalance> {
  const publicClient = getPublicClient();
  if (!publicClient) throw new Error('Blockchain clients not initialized.');

  const usdtContract = getContract({
    address: NETWORK_CONFIG.usdtAddress,
    abi: ERC20_ABI,
    client: { public: publicClient },
  });

  let decimals: number;
  try {
    decimals = await usdtContract.read.decimals();
  } catch {
    decimals = NETWORK_CONFIG.collateralTokenDecimals;
  }

  const decimalsMultiplier = 10n ** BigInt(decimals);
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

export async function transferUSDT(
  fromAddress: `0x${string}`,
  toAddress: `0x${string}`,
  amount: number,
  walletClient: WalletClient,
  account: Account,
): Promise<{ hash: `0x${string}` }> {
  const publicClient = getPublicClient();
  if (!publicClient || !walletClient || !account) throw new Error('Blockchain clients not initialized.');

  const usdtContract = getContract({
    address: NETWORK_CONFIG.usdtAddress,
    abi: ERC20_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  let decimals: number;
  try {
    decimals = await usdtContract.read.decimals();
  } catch {
    decimals = NETWORK_CONFIG.collateralTokenDecimals;
  }

  const decimalsMultiplier = 10n ** BigInt(decimals);
  const amountInWei = BigInt(Math.floor(amount * Number(decimalsMultiplier)));

  const hash = await usdtContract.write.transfer([toAddress, amountInWei], { account, chain: walletClient.chain });
  return { hash };
}

// --- Approvals ---

export async function checkApprovals(address: `0x${string}`): Promise<ApprovalStatus> {
  const publicClient = getPublicClient();
  if (!publicClient) throw new Error('Blockchain clients not initialized.');

  const results = await publicClient.multicall({
    contracts: [
      {
        address: NETWORK_CONFIG.usdtAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, NETWORK_CONFIG.ctfTokenAddress],
      },
      {
        address: NETWORK_CONFIG.usdtAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, NETWORK_CONFIG.ctfExchangeAddress],
      },
      {
        address: NETWORK_CONFIG.ctfTokenAddress,
        abi: ERC1155_ABI,
        functionName: 'isApprovedForAll',
        args: [address, NETWORK_CONFIG.ctfExchangeAddress],
      },
    ],
  });

  return {
    needsUSDTForCTFToken: results[0].status === 'success' && results[0].result < maxUint256,
    needsUSDTForExchange: results[1].status === 'success' && results[1].result < maxUint256,
    needsCTFTokenForExchange: results[2].status === 'success' && !results[2].result,
  };
}

export async function approveTokensForProxy(
  proxyAddress: `0x${string}`,
  walletClient: WalletClient,
): Promise<ApprovalResult> {
  const publicClient = getPublicClient();
  if (!publicClient || !walletClient || !walletClient.account) throw new Error('Blockchain clients not initialized.');

  const status = await checkApprovals(proxyAddress);
  const contractTransactions: Array<{ contract: ReturnType<typeof getContract>; functionName: string; args: any[]; }> = [];

  if (status.needsUSDTForCTFToken) {
    contractTransactions.push({
      contract: getContract({ address: NETWORK_CONFIG.usdtAddress, abi: ERC20_ABI, client: { public: publicClient, wallet: walletClient } }),
      functionName: 'approve',
      args: [NETWORK_CONFIG.ctfTokenAddress, maxUint256],
    });
  }

  if (status.needsUSDTForExchange) {
    contractTransactions.push({
      contract: getContract({ address: NETWORK_CONFIG.usdtAddress, abi: ERC20_ABI, client: { public: publicClient, wallet: walletClient } }),
      functionName: 'approve',
      args: [NETWORK_CONFIG.ctfExchangeAddress, maxUint256],
    });
  }

  if (status.needsCTFTokenForExchange) {
    contractTransactions.push({
      contract: getContract({ address: NETWORK_CONFIG.ctfTokenAddress, abi: ERC1155_ABI, client: { public: publicClient, wallet: walletClient } }),
      functionName: 'setApprovalForAll',
      args: [NETWORK_CONFIG.ctfExchangeAddress, true],
    });
  }

  if (contractTransactions.length === 0) return { success: true, approvalsExecuted: 0 };

  let lastHash: `0x${string}` | undefined;
  for (const tx of contractTransactions) {
    try {
      const hash = await (tx.contract as any).write[tx.functionName](tx.args as any);
      await publicClient.waitForTransactionReceipt({ hash });
      lastHash = hash;
    } catch (error: any) {
      throw new Error(`Failed to execute proxy approval: ${error.message}`);
    }
  }

  return { success: true, transactionHash: lastHash, approvalsExecuted: contractTransactions.length };
}

export async function approveTokensForEOA(
  eoaAddress: `0x${string}`,
  walletClient: WalletClient,
): Promise<ApprovalResult> {
  const publicClient = getPublicClient();
  if (!publicClient || !walletClient) throw new Error('Blockchain clients not initialized.');

  const status = await checkApprovals(eoaAddress);
  const transactions: Array<{ contract: ReturnType<typeof getContract>; functionName: string; args: any[]; }> = [];

  if (status.needsUSDTForCTFToken) {
    transactions.push({
      contract: getContract({ address: NETWORK_CONFIG.usdtAddress, abi: ERC20_ABI, client: { public: publicClient, wallet: walletClient } }),
      functionName: 'approve',
      args: [NETWORK_CONFIG.ctfTokenAddress, maxUint256],
    });
  }

  if (status.needsUSDTForExchange) {
    transactions.push({
      contract: getContract({ address: NETWORK_CONFIG.usdtAddress, abi: ERC20_ABI, client: { public: publicClient, wallet: walletClient } }),
      functionName: 'approve',
      args: [NETWORK_CONFIG.ctfExchangeAddress, maxUint256],
    });
  }

  if (status.needsCTFTokenForExchange) {
    transactions.push({
      contract: getContract({ address: NETWORK_CONFIG.ctfTokenAddress, abi: ERC1155_ABI, client: { public: publicClient, wallet: walletClient } }),
      functionName: 'setApprovalForAll',
      args: [NETWORK_CONFIG.ctfExchangeAddress, true],
    });
  }

  if (transactions.length === 0) return { success: true, approvalsExecuted: 0 };

  let lastHash: `0x${string}` | undefined;
  for (const tx of transactions) {
    const hash = await (tx.contract as any).write[tx.functionName](tx.args as any);
    await publicClient.waitForTransactionReceipt({ hash });
    lastHash = hash;
  }

  return { success: true, transactionHash: lastHash, approvalsExecuted: transactions.length };
}
// ... (existing functions)

// End of wallet.ts

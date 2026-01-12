import { getContract, isAddress } from 'viem';
import { PROXY_FACTORY_ADDRESS, PROXY_FACTORY_ABI } from '../config/index';
import { getPublicClient } from '../config/clients';
import type { WalletClient, Account } from 'viem';

/**
 * Result of proxy wallet creation/checking
 */
export interface ProxyWalletResult {
  address: `0x${string}`;
  exists: boolean;
  transactionHash?: `0x${string}`;
}

/**
 * Check if proxy wallet exists for the given account
 */
async function checkProxyExists(
  userAddress: `0x${string}`,
): Promise<{ exists: boolean; address: `0x${string}` }> {
  try {
    const publicClient = getPublicClient();
    if (!publicClient) {
      throw new Error('Public client not initialized. RPC_URL must be set.');
    }

    const proxyFactory = getContract({
      address: PROXY_FACTORY_ADDRESS,
      abi: PROXY_FACTORY_ABI,
      client: { public: publicClient },
    });

    const proxyAddress = (await proxyFactory.read.computeProxyAddress([userAddress])) as `0x${string}`;

    if (!isAddress(proxyAddress)) {
      return { exists: false, address: proxyAddress };
    }

    const code = await publicClient.getBytecode({ address: proxyAddress });
    const exists = code !== '0x' && code !== undefined;

    return { exists, address: proxyAddress };
  } catch (error) {
    console.error('Error checking proxy existence:', error);
    throw error;
  }
}

/**
 * Generate EIP-712 signature for CreateProxy
 */
async function generateCreateProxySignature(
  paymentToken: `0x${string}`,
  payment: bigint,
  paymentReceiver: `0x${string}`,
  walletClient: WalletClient,
  account: Account,
): Promise<{ v: number; r: `0x${string}`; s: `0x${string}` }> {
  const publicClient = getPublicClient();

  if (!publicClient || !walletClient || !account) {
    throw new Error('Blockchain clients not initialized.');
  }

  const chainId = await publicClient.getChainId();

  const domain = {
    name: 'Probable Contract Proxy Factory',
    chainId: chainId,
    verifyingContract: PROXY_FACTORY_ADDRESS,
  } as const;

  const types = {
    CreateProxy: [
      { name: 'paymentToken', type: 'address' },
      { name: 'payment', type: 'uint256' },
      { name: 'paymentReceiver', type: 'address' },
    ],
  } as const;

  const message = {
    paymentToken,
    payment,
    paymentReceiver,
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: 'CreateProxy',
    message,
  });

  const r = (`0x${signature.slice(2, 66)}`) as `0x${string}`;
  const s = (`0x${signature.slice(66, 130)}`) as `0x${string}`;
  let v = parseInt(signature.slice(130, 132), 16);

  if (v < 27) {
    v += 27;
  }

  return { v, r, s };
}

/**
 * Check if proxy wallet exists for the given account
 */
export async function checkProxyWallet(
  userAddress: `0x${string}`,
): Promise<ProxyWalletResult> {
  console.log('[PROXY] Checking proxy wallet for:', userAddress)
  const { exists, address } = await checkProxyExists(userAddress);
  console.log('[PROXY] Proxy wallet check result:', {
    address: address as `0x${string}`,
    exists
  })
  return {
    address: address as `0x${string}`,
    exists,
  };
}

/**
 * Create a proxy wallet for the given account
 */
export async function createProxyWallet(
  userAddress: `0x${string}`,
  walletClient: WalletClient,
  account: Account,
): Promise<ProxyWalletResult> {
  console.log('[PROXY] Creating proxy wallet for:', userAddress)
  const publicClient = getPublicClient();

  if (!publicClient || !walletClient || !account) {
    console.error('[PROXY] ❌ Blockchain clients not initialized')
    throw new Error('Blockchain clients not initialized.');
  }

  console.log('[PROXY] Initializing proxy factory contract...')
  const proxyFactory = getContract({
    address: PROXY_FACTORY_ADDRESS,
    abi: PROXY_FACTORY_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  const paymentToken = '0x0000000000000000000000000000000000000000' as `0x${string}`;
  const payment = 0n;
  const paymentReceiver = '0x0000000000000000000000000000000000000000' as `0x${string}`;

  console.log('[PROXY] Computing proxy address...')
  const proxyAddress = (await proxyFactory.read.computeProxyAddress([userAddress])) as `0x${string}`;
  console.log('[PROXY] Proxy address:', proxyAddress)

  console.log('[PROXY] Generating EIP-712 signature...')
  const createSig = await generateCreateProxySignature(paymentToken, payment, paymentReceiver, walletClient, account);
  console.log('[PROXY] ✅ Signature generated')

  console.log('[PROXY] Estimating gas...')
  const gasEstimate = await publicClient.estimateContractGas({
    address: PROXY_FACTORY_ADDRESS,
    abi: PROXY_FACTORY_ABI,
    functionName: 'createProxy',
    args: [paymentToken, payment, paymentReceiver, createSig],
    account: account.address,
  });
  console.log('[PROXY] Gas estimate:', gasEstimate.toString())

  const gasLimit = (gasEstimate * 110n) / 100n;
  const gasPrice = await publicClient.getGasPrice();
  console.log('[PROXY] Gas limit:', gasLimit.toString(), 'Gas price:', gasPrice.toString())

  console.log('[PROXY] Submitting createProxy transaction...')
  const hash = await proxyFactory.write.createProxy(
    [paymentToken, payment, paymentReceiver, createSig],
    { gas: gasLimit, maxFeePerGas: gasPrice } as any,
  );
  console.log('[PROXY] Transaction submitted:', hash)

  console.log('[PROXY] Waiting for transaction receipt...')
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('[PROXY] ✅ Proxy wallet created successfully:', {
    address: proxyAddress,
    txHash: hash
  })

  return {
    address: proxyAddress,
    exists: true,
    transactionHash: hash,
  };
}

/**
 * Ensure proxy wallet exists, creating it if necessary
 */
export async function ensureProxyWallet(
  userAddress: `0x${string}`,
  walletClient: any,
  account: any,
): Promise<ProxyWalletResult> {
  const existing = await checkProxyWallet(userAddress);
  
  if (existing.exists) {
    return existing;
  }

  return await createProxyWallet(userAddress, walletClient, account);
}

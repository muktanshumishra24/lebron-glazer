import axios from 'axios';
import { type WalletClient, type Transport, type Chain, type Account, type TypedDataDefinition, type Hex, type TypedData, hashTypedData, parseUnits } from 'viem';
import { ORDER_STRUCTURE, NETWORK_CONFIG, ENV_PROTOCOL_VERSION, ROUNDING_CONFIG, EIP712_DOMAIN } from '../config/index';
import { createL2Headers } from './api';
import type { ApiKeyCreds, UserOrder, Order, OrderData, RoundConfig, SignedOrder, CreateOrderOptions, ApiOrder, OrdersResult, PlaceOrderParams, PlaceOrderResult, Position, Market } from '../types';
import { Side, SignatureType } from '../types';
import { createOrLoadApiKey, getApiKey } from './api';
import { checkApprovals, approveTokensForProxy, approveTokensForEOA } from './wallet';
import { generateOrderSalt, roundNormal, roundDown, decimalPlaces, roundUp } from './utils';

// --- Types ---
// Imported from ../types

// ============================================================================
// Order Building Functions (from orders/ folder)
// ============================================================================

function getOrderRawAmounts(
  side: Side,
  size: number,
  price: number,
  roundConfig: RoundConfig,
): { side: Side; rawMakerAmt: number; rawTakerAmt: number } {
  const rawPrice = roundNormal(price, roundConfig.price);

  if (side === Side.BUY) {
    const rawTakerAmt = roundDown(size, roundConfig.size);
    let rawMakerAmt = rawTakerAmt * rawPrice;
    if (decimalPlaces(rawMakerAmt) > roundConfig.amount) {
      rawMakerAmt = roundUp(rawMakerAmt, roundConfig.amount + 4);
      if (decimalPlaces(rawMakerAmt) > roundConfig.amount) {
        rawMakerAmt = roundDown(rawMakerAmt, roundConfig.amount);
      }
    }
    return { side: Side.BUY, rawMakerAmt, rawTakerAmt };
  } else {
    const rawMakerAmt = roundDown(size, roundConfig.size);
    let rawTakerAmt = rawMakerAmt * rawPrice;
    if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
      rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
      if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
        rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
      }
    }
    return { side: Side.SELL, rawMakerAmt, rawTakerAmt };
  }
}

async function buildOrderCreationArgs(
  signer: string,
  maker: string,
  signatureType: SignatureType,
  userOrder: UserOrder,
  roundConfig: RoundConfig,
): Promise<OrderData> {
  const { side, rawMakerAmt, rawTakerAmt } = getOrderRawAmounts(
    userOrder.side,
    userOrder.size,
    userOrder.price,
    roundConfig,
  );

  const makerAmount = parseUnits(
    rawMakerAmt.toString(),
    NETWORK_CONFIG.collateralTokenDecimals,
  ).toString();
  const takerAmount = parseUnits(
    rawTakerAmt.toString(),
    NETWORK_CONFIG.collateralTokenDecimals,
  ).toString();

  let taker: string;
  if (typeof userOrder.taker !== 'undefined' && userOrder.taker) {
    taker = userOrder.taker;
  } else {
    taker = '0x0000000000000000000000000000000000000000';
  }

  let feeRateBps: string;
  if (typeof userOrder.feeRateBps !== 'undefined' && userOrder.feeRateBps) {
    feeRateBps = userOrder.feeRateBps.toString();
  } else {
    feeRateBps = '0';
  }

  let nonce: string;
  if (typeof userOrder.nonce !== 'undefined' && userOrder.nonce) {
    nonce = userOrder.nonce.toString();
  } else {
    nonce = '0';
  }

  return {
    maker,
    taker,
    tokenId: userOrder.tokenID,
    makerAmount,
    takerAmount,
    side,
    feeRateBps,
    nonce,
    signer,
    expiration: (userOrder.expiration || 0).toString(),
    signatureType,
  } as OrderData;
}

class ExchangeOrderBuilder {
  constructor(
    private readonly contractAddress: string,
    private readonly chainId: number,
    private readonly wallet: WalletClient<Transport, Chain, Account>,
    private readonly generateSalt = generateOrderSalt,
  ) {}

  async buildSignedOrder(orderData: OrderData): Promise<SignedOrder> {
    const order = await this.buildOrder(orderData);
    const orderTypedData = this.buildOrderTypedData(order);
    const orderSignature = await this.buildOrderSignature(orderTypedData);

    return {
      ...order,
      signature: orderSignature,
    } as SignedOrder;
  }

  async buildOrder({
    maker,
    taker,
    tokenId,
    makerAmount,
    takerAmount,
    side,
    feeRateBps,
    nonce,
    signer,
    expiration,
    signatureType,
  }: OrderData): Promise<Order> {
    if (signer === undefined || signer === null) {
      signer = maker;
    }

    const signerAddress = this.wallet.account?.address;
    if (signer !== signerAddress) {
      throw new Error('signer does not match');
    }

    if (expiration === undefined || expiration === null) {
      expiration = '0';
    }

    if (signatureType === undefined || signatureType === null) {
      signatureType = SignatureType.EOA;
    }

    return {
      salt: this.generateSalt(),
      maker,
      signer,
      taker,
      tokenId,
      makerAmount,
      takerAmount,
      expiration,
      nonce,
      feeRateBps,
      side,
      signatureType,
    };
  }

  buildOrderTypedData(order: Order): TypedDataDefinition {
    return {
      primaryType: 'Order',
      types: {
        EIP712Domain: EIP712_DOMAIN,
        Order: ORDER_STRUCTURE,
      },
      domain: {
        name: 'Probable CTF Exchange',
        version: ENV_PROTOCOL_VERSION,
        chainId: this.chainId,
        verifyingContract: this.contractAddress as `0x${string}`,
      },
      message: {
        salt: order.salt,
        maker: order.maker,
        signer: order.signer,
        taker: order.taker,
        tokenId: order.tokenId,
        makerAmount: order.makerAmount,
        takerAmount: order.takerAmount,
        expiration: order.expiration,
        nonce: order.nonce,
        feeRateBps: order.feeRateBps,
        side: order.side,
        signatureType: order.signatureType,
      },
    };
  }

  buildOrderSignature(typedData: TypedDataDefinition): Promise<Hex> {
    delete typedData.types.EIP712Domain;
    return this.wallet.signTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });
  }
}

async function buildOrder(
  wallet: WalletClient<Transport, Chain, Account>,
  exchangeAddress: string,
  chainId: number,
  orderData: OrderData,
): Promise<SignedOrder> {
  const builder = new ExchangeOrderBuilder(exchangeAddress, chainId, wallet);
  return builder.buildSignedOrder(orderData);
}

async function createOrder(
  wallet: WalletClient<Transport, Chain, Account>,
  chainId: number,
  signatureType: SignatureType,
  funderAddress: string | undefined,
  userOrder: UserOrder,
  options: CreateOrderOptions,
): Promise<SignedOrder> {
  const eoaSignerAddress = wallet.account?.address;
  const maker = funderAddress === undefined ? eoaSignerAddress : funderAddress;

  const orderData = await buildOrderCreationArgs(
    eoaSignerAddress!,
    maker!,
    signatureType,
    userOrder,
    ROUNDING_CONFIG[options.tickSize],
  );

  return buildOrder(wallet, NETWORK_CONFIG.ctfExchangeAddress, chainId, orderData);
}

async function submitOrder(
  orderData: any,
  owner: string,
  apiKey: string,
  secret: string,
  passphrase: string,
  accountType?: 'eoa',
): Promise<any> {
  const endpoint = NETWORK_CONFIG.entryService;
  const path = '/public/api/v1/order/' + NETWORK_CONFIG.chainId;
  const method = 'POST';

  const requestBody = {
    deferExec: true,
    order: {
      salt: orderData.salt,
      maker: orderData.maker,
      signer: orderData.signer,
      taker: orderData.taker,
      tokenId: orderData.tokenId,
      makerAmount: orderData.makerAmount,
      takerAmount: orderData.takerAmount,
      side: orderData.side === 0 ? 'BUY' : 'SELL',
      expiration: orderData.expiration,
      nonce: orderData.nonce,
      feeRateBps: orderData.feeRateBps,
      signatureType: orderData.signatureType,
      signature: orderData.signature,
    },
    owner: owner,
    orderType: 'GTC',
  };

  const headers = createL2Headers(
    owner,
    apiKey,
    secret,
    passphrase,
    method,
    path,
    requestBody,
    accountType,
  );

  try {
    const response = await axios.post(`${endpoint}${path}`, requestBody, { headers });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error?.message || errorData?.message || error.message;
      const errorCode = errorData?.error?.code || errorData?.code;

      const apiError: any = new Error(`Failed to submit order: ${errorMessage}`);
      apiError.originalError = error;
      apiError.response = error.response;
      throw apiError;
    }
    throw error;
  }
}

async function createAndSubmitOrder(
  wallet: WalletClient<Transport, Chain, Account>,
  makerAddress: `0x${string}`,
  apiKey: ApiKeyCreds,
  tokenID: string,
  side: Side,
  price: number = 0.5,
  size: number = 1,
  walletName: string = 'Wallet',
  useEOA: boolean = false,
) {
  const order: UserOrder = {
    tokenID: tokenID,
    price: price,
    size: size,
    side: side,
    feeRateBps: 0,
    nonce: 0,
  };

  const signatureType = useEOA ? SignatureType.EOA : SignatureType.PROB_GNOSIS_SAFE;
  const funderAddress = useEOA ? undefined : makerAddress;

  const createdOrder = await createOrder(
    wallet,
    NETWORK_CONFIG.chainId,
    signatureType,
    funderAddress,
    order,
    { tickSize: '0.01' },
  );

  const submittedOrder = await submitOrder(
    createdOrder,
    createdOrder.signer,
    apiKey.key,
    apiKey.secret,
    apiKey.passphrase,
    useEOA ? 'eoa' : undefined,
  );

  return { createdOrder, submittedOrder };
}

// ============================================================================
// API Key Error Handling (from helpers/api-key-error.ts)
// ============================================================================

function isApiKeyError(error: any): boolean {
  if (error?.response?.data?.error?.code === 'PAS-4008') {
    return true;
  }
  const errorMessage = error?.message || '';
  if (
    errorMessage.includes('Invalid API key') ||
    errorMessage.includes('API key has expired') ||
    errorMessage.includes('PAS-4008')
  ) {
    return true;
  }
  if (error?.originalError?.response?.data?.error?.code === 'PAS-4008') {
    return true;
  }
  return false;
}

async function handleApiKeyError<T>(
  address: `0x${string}`,
  error: any,
  operation: (apiKey: ApiKeyCreds) => Promise<T>,
  operationName: string,
  walletClient: any,
): Promise<T> {
  if (!isApiKeyError(error)) {
    throw error;
  }

  try {
    const apiKeyResult = await createOrLoadApiKey(walletClient, address, true);
    const newApiKey = apiKeyResult.apiKey;
    const result = await operation(newApiKey);
    return result;
  } catch (retryError) {
    throw retryError;
  }
}

// ============================================================================
// Order Operations (from utils/orders.ts)
// ============================================================================

/**
 * Get open orders
 */
export async function getOpenOrders(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
  page: number = 1,
  limit: number = 20,
): Promise<OrdersResult> {
  const endpoint = NETWORK_CONFIG.entryService;
  const basePath = `/public/api/v1/orders/${NETWORK_CONFIG.chainId}/open`;
  const method = 'GET';

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const queryString = queryParams.toString();
  const pathWithQuery = queryString ? `${basePath}?${queryString}` : basePath;
  const url = `${endpoint}${pathWithQuery}`;

  const headers = createL2Headers(
    eoaAddress,
    apiKey.key,
    apiKey.secret,
    apiKey.passphrase,
    method,
    pathWithQuery,
    undefined,
    accountType,
  );

  const response = await axios.get(url, { headers });
  const orders = (response.data?.orders || response.data || []) as ApiOrder[];

  return {
    orders,
    total: orders.length,
  };
}

/**
 * Cancel a single order
 */
export async function cancelOrder(
  apiKey: ApiKeyCreds,
  order: ApiOrder,
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
): Promise<boolean> {
  const endpoint = NETWORK_CONFIG.entryService;
  const basePath = `/public/api/v1/order/${NETWORK_CONFIG.chainId}/${order.orderId}`;
  const method = 'DELETE';

  const queryParams = new URLSearchParams({
    tokenId: order.ctfTokenId || order.tokenId,
  });

  if (order.clientOrderId) {
    queryParams.append('origClientOrderId', order.clientOrderId);
  }

  const queryString = queryParams.toString();
  const pathWithQuery = queryString ? `${basePath}?${queryString}` : basePath;
  const url = `${endpoint}${pathWithQuery}`;

  const headers = createL2Headers(
    eoaAddress,
    apiKey.key,
    apiKey.secret,
    apiKey.passphrase,
    method,
    pathWithQuery,
    undefined,
    accountType,
  );

  await axios.delete(url, { headers });
  return true;
}

/**
 * Cancel multiple orders
 */
export async function cancelOrders(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  orders: ApiOrder[],
  eoaAddress: `0x${string}`,
  accountType?: 'eoa',
): Promise<{ success: number; failed: number; errors: Array<{ orderId: number; error: string }> }> {
  if (orders.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  let success = 0;
  let failed = 0;
  const errors: Array<{ orderId: number; error: string }> = [];

  for (const order of orders) {
    try {
      await cancelOrder(apiKey, order, eoaAddress, accountType);
      success++;
    } catch (error) {
      failed++;
      const errorMessage =
        error instanceof Error
          ? error.message
          : axios.isAxiosError(error)
            ? error.response?.data?.error?.message || error.response?.data?.message || error.message
            : String(error);
      errors.push({ orderId: order.orderId, error: errorMessage });
    }
  }

  return { success, failed, errors };
}

/**
 * Place an order
 */
export async function placeOrder(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  params: PlaceOrderParams,
  walletClient: any,
  useEOA: boolean = false,
): Promise<PlaceOrderResult> {
  const userOrder: UserOrder = {
    tokenID: params.tokenId,
    price: params.price,
    size: params.size,
    side: params.side,
    feeRateBps: params.feeRateBps ?? 0,
    nonce: params.nonce ?? 0,
    expiration: params.expiration,
    taker: params.taker,
  };

  if (!walletClient || !walletClient.account) {
    throw new Error('Wallet client and account are required.');
  }

  const walletName = useEOA ? 'EOA' : 'Proxy Wallet';
  const { submittedOrder } = await createAndSubmitOrder(
    walletClient as any,
    address,
    apiKey,
    params.tokenId,
    params.side,
    params.price,
    params.size,
    walletName,
    useEOA,
  );

  return {
    success: true,
    orderId: submittedOrder?.id,
    order: submittedOrder,
  };
}

/**
 * Get open orders with automatic API key handling
 */
export async function getOpenOrdersWithApiKey(
  address: `0x${string}`,
  eoaAddress: `0x${string}`,
  walletClient: any,
  accountType?: 'eoa',
  page: number = 1,
  limit: number = 20,
): Promise<OrdersResult> {
  let apiKey = await getApiKey();
  if (!apiKey) {
    const result = await createOrLoadApiKey(walletClient, address);
    apiKey = result.apiKey;
  }

  try {
    return await getOpenOrders(address, apiKey, eoaAddress, accountType, page, limit);
  } catch (error) {
    return await handleApiKeyError(
      address,
      error,
      async (newApiKey: ApiKeyCreds) => {
        return await getOpenOrders(address, newApiKey, eoaAddress, accountType, page, limit);
      },
      'fetching open orders',
      walletClient,
    );
  }
}

/**
 * Place order with automatic API key handling and approval checks
 */
export async function placeOrderWithApiKey(
  address: `0x${string}`,
  params: PlaceOrderParams,
  walletClient: any,
  useEOA: boolean = false,
): Promise<PlaceOrderResult> {
  let apiKey = await getApiKey();
  if (!apiKey) {
    const result = await createOrLoadApiKey(walletClient, address);
    apiKey = result.apiKey;
  }

  // Check and approve tokens before placing order
  try {
    const approvalStatus = await checkApprovals(address);
    
    if (approvalStatus.needsUSDTForExchange || approvalStatus.needsUSDTForCTFToken || approvalStatus.needsCTFTokenForExchange) {
      console.log('⚠️  Token approvals needed. Approving tokens...');
      
      if (useEOA) {
        await approveTokensForEOA(address, walletClient);
      } else {
        await approveTokensForProxy(address, walletClient);
      }
      
      console.log('✅ Token approvals completed');
    }
  } catch (approvalError) {
    console.warn('⚠️  Failed to check/approve tokens:', approvalError instanceof Error ? approvalError.message : String(approvalError));
  }

  // Check balance before placing order (for BUY orders, need price * size in USDT)
  // For proxy wallets, check both EOA and proxy balances
  try {
    const { checkUSDTBalance } = await import('./wallet');
    const requiredCollateral = params.side === Side.BUY ? params.price * params.size : 0;
    
    if (requiredCollateral > 0) {
      // Get the EOA address (the original wallet address)
      const eoaAddress = walletClient?.account?.address as `0x${string}` | undefined;
      
      // Check balance on the trading address (proxy or EOA)
      const balanceInfo = await checkUSDTBalance(address, requiredCollateral);
      console.log(`[BALANCE] Trading address (${address}) balance: ${balanceInfo.balanceFormatted.toFixed(4)} USDT, Required: ${requiredCollateral.toFixed(4)} USDT`);
      
      // If using proxy and balance is insufficient, check EOA balance
      if (!useEOA && !balanceInfo.hasMinimumBalance && eoaAddress && eoaAddress.toLowerCase() !== address.toLowerCase()) {
        const eoaBalanceInfo = await checkUSDTBalance(eoaAddress, 0);
        console.log(`[BALANCE] EOA address (${eoaAddress}) balance: ${eoaBalanceInfo.balanceFormatted.toFixed(4)} USDT`);
        
        if (eoaBalanceInfo.balanceFormatted >= requiredCollateral) {
          const errorMessage = `Insufficient balance in proxy wallet. You have ${eoaBalanceInfo.balanceFormatted.toFixed(4)} USDT in your main wallet but ${balanceInfo.balanceFormatted.toFixed(4)} USDT in your proxy wallet. You need to transfer ${requiredCollateral.toFixed(4)} USDT to your proxy wallet to place this order.`;
          console.error(`[BALANCE] ❌ ${errorMessage}`);
          throw new Error(errorMessage);
        }
      }
      
      if (!balanceInfo.hasMinimumBalance) {
        const errorMessage = `Insufficient balance. You have ${balanceInfo.balanceFormatted.toFixed(4)} USDT but need ${requiredCollateral.toFixed(4)} USDT to place this order.`;
        console.error(`[BALANCE] ❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      console.log('[BALANCE] ✅ Sufficient balance available');
    }
  } catch (balanceError) {
    // If balance check fails, still try to place order (API will reject if insufficient)
    // But if it's our own validation error, throw it
    if (balanceError instanceof Error && balanceError.message.includes('Insufficient balance')) {
      throw balanceError;
    }
    console.warn('⚠️  Failed to check balance:', balanceError instanceof Error ? balanceError.message : String(balanceError));
  }

  try {
    return await placeOrder(address, apiKey, params, walletClient, useEOA);
  } catch (error) {
    // Improve error message for insufficient balance
    if (error instanceof Error && error.message.includes('Insufficient collateral balance')) {
      const { checkUSDTBalance } = await import('./wallet');
      try {
        const balanceInfo = await checkUSDTBalance(address, 0);
        const requiredCollateral = params.side === Side.BUY ? params.price * params.size : 0;
        const improvedError = new Error(
          `Insufficient balance. You have ${balanceInfo.balanceFormatted.toFixed(4)} USDT but need ${requiredCollateral.toFixed(4)} USDT to place this order. Please deposit more USDT.`
        );
        throw improvedError;
      } catch (balanceCheckError) {
        // If balance check fails, use original error
        throw error;
      }
    }
    
    return await handleApiKeyError(
      address,
      error,
      async (newApiKey: ApiKeyCreds) => {
        return await placeOrder(address, newApiKey, params, walletClient, useEOA);
      },
      'placing order',
      walletClient,
    );
  }
}

/**
 * Get positions
 */
export async function getPositions(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
  markets: Market[] = [],
): Promise<Position[]> {
  const endpoint = NETWORK_CONFIG.entryService;
  const path = '/public/api/v1/position/current';
  const method = 'GET';

  const queryParams = new URLSearchParams({
    user: address,
  });
  const queryString = queryParams.toString();
  const pathWithQuery = queryString ? `${path}?${queryString}` : path;
  const url = `${endpoint}${pathWithQuery}`;

  const headers = createL2Headers(
    address,
    apiKey.key,
    apiKey.secret,
    apiKey.passphrase,
    method,
    pathWithQuery,
    undefined,
  );

  const response = await axios.get(url, { headers });
  const rawPositions = (response.data?.positions || response.data || []) as any[];

  const positions: Position[] = [];

  for (const raw of rawPositions) {
    const size = Number(raw.size || raw.balance || 0);
    // Determine tokenId. API may return it as `tokenId` or `assetId` or `instrumentId`
    const tokenId = raw.tokenId || raw.tokenID || raw.instrumentId || raw.ctfTokenId;
    
    if (size > 0 && tokenId) {
      let marketId = raw.marketId;
      let outcome = raw.outcome;

      // If we have markets and missing info, try to find it
      if (markets.length > 0 && (!marketId || !outcome)) {
        for (const market of markets) {
          if (!market.tokens) continue;
          const token = market.tokens.find(t => t.token_id === tokenId);
          if (token) {
            marketId = market.id;
            outcome = token.outcome;
            break;
          }
        }
      }

      positions.push({
        id: raw.id || String(Math.random()),
        marketId: marketId || 'unknown',
        tokenId: tokenId,
        outcome: outcome || 'Unknown',
        balance: size,
        price: Number(raw.price || raw.averagePrice || 0),
        value: Number(raw.value || 0),
      });
    }
  }

  return positions;
}

/**
 * Get user PnL (Profit and Loss) data
 * @param address - User's trading address (proxy or EOA)
 * @param apiKey - API credentials
 * @returns PnL data including total, realized, and unrealized PnL
 */
export async function getPnL(
  address: `0x${string}`,
  apiKey: ApiKeyCreds,
): Promise<import('../types').PnLData> {
  const endpoint = NETWORK_CONFIG.entryService;
  const path = '/public/api/v1/pnl';
  const method = 'GET';

  const queryParams = new URLSearchParams({
    user_address: address,
  });
  const queryString = queryParams.toString();
  const pathWithQuery = queryString ? `${path}?${queryString}` : path;
  const url = `${endpoint}${pathWithQuery}`;

  const headers = createL2Headers(
    address,
    apiKey.key,
    apiKey.secret,
    apiKey.passphrase,
    method,
    pathWithQuery,
    undefined,
  );

  const response = await axios.get(url, { headers });
  const data = response.data || {};

  return {
    totalPnl: Number(data.total_pnl || data.totalPnl || 0),
    realizedPnl: Number(data.realized_pnl || data.realizedPnl || 0),
    unrealizedPnl: Number(data.unrealized_pnl || data.unrealizedPnl || 0),
    totalVolume: Number(data.total_volume || data.totalVolume || 0),
    totalFees: Number(data.total_fees || data.totalFees || 0),
  };
}


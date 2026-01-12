import axios from 'axios';
import { type WalletClient, type Transport, type Chain, type Account, type TypedDataDefinition, type Hex, type TypedData, hashTypedData, parseUnits } from 'viem';
import { ENTRY_SERVICE, CHAIN_ID, EIP712_DOMAIN, ORDER_STRUCTURE, NETWORK_CONFIG, ENV_PROTOCOL_VERSION, CTF_EXCHANGE_ADDRESS, ROUNDING_CONFIG } from '../config/index';
import { createL2Headers } from './headers';
import type { ApiKeyCreds, UserOrder, Order, OrderData, RoundConfig, SignedOrder, CreateOrderOptions } from '../types';
import { Side } from '../types';
import { SignatureType } from '../types';
import { createOrLoadApiKey, getApiKey } from './api-key';
import { checkApprovals, approveTokensForProxy, approveTokensForEOA } from './approvals';
import { generateOrderSalt, roundNormal, roundDown, decimalPlaces, roundUp } from './utils';

/**
 * Order format from the API
 */
export interface ApiOrder {
  orderId: number;
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  timeInForce: string;
  price: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  status: string;
  time: number;
  updateTime: number;
  avgPrice: string;
  origType: string;
  tokenId: string;
  ctfTokenId: string;
  stopPrice: string;
  orderListId: number;
}

/**
 * Result of fetching orders
 */
export interface OrdersResult {
  orders: ApiOrder[];
  total: number;
}

/**
 * Parameters for placing an order
 */
export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
  tickSize?: '0.1' | '0.01' | '0.001' | '0.0001';
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
  taker?: string;
}

/**
 * Result of placing an order
 */
export interface PlaceOrderResult {
  orderId?: string;
  success: boolean;
  order?: any;
}

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

  return buildOrder(wallet, CTF_EXCHANGE_ADDRESS, chainId, orderData);
}

async function submitOrder(
  orderData: any,
  owner: string,
  apiKey: string,
  secret: string,
  passphrase: string,
  accountType?: 'eoa',
): Promise<any> {
  const endpoint = ENTRY_SERVICE;
  const path = '/public/api/v1/order/' + CHAIN_ID;
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
    CHAIN_ID,
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
  const endpoint = ENTRY_SERVICE;
  const basePath = `/public/api/v1/orders/${CHAIN_ID}/open`;
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
  const endpoint = ENTRY_SERVICE;
  const basePath = `/public/api/v1/order/${CHAIN_ID}/${order.orderId}`;
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

  try {
    return await placeOrder(address, apiKey, params, walletClient, useEOA);
  } catch (error) {
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

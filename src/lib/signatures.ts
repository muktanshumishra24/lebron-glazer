import { MSG_TO_SIGN } from "../config/index"
import type { SupportedSigner } from "../types"
import { resolveAddress } from "./utils"

/**
 * Builds the canonical CLOB EIP712 signature
 */
export const buildClobEip712Signature = async (
  signer: SupportedSigner,
  chainId: number,
  timestamp: number,
  nonce: number,
): Promise<string> => {
  const address = await resolveAddress(signer)
  const ts = `${timestamp}`

  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId,
  }

  const types = {
    ClobAuth: [
      { name: 'address', type: 'address' },
      { name: 'timestamp', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
  }
  const value = {
    address,
    timestamp: ts,
    nonce,
    message: MSG_TO_SIGN,
  }

  return signer.signTypedData({
    domain,
    primaryType: 'ClobAuth',
    types,
    message: value,
  })
}

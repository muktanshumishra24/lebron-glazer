import type { SupportedSigner, SupportedWalletClient } from "../types"

export const isWalletClient = (
  signer: SupportedSigner,
): signer is SupportedWalletClient =>
  typeof (signer as SupportedWalletClient).signTypedData === 'function'

export function generateOrderSalt(): string {
  return `${Math.round(Math.random() * Date.now())}`
}

export const resolveAddress = async (signer: SupportedSigner): Promise<string> => {
  const address = signer.account?.address
  if (!address) {
    throw new Error('Wallet address is not defined')
  }
  return address
}

export const roundDown = (num: number, decimals: number): number => {
  if (decimalPlaces(num) <= decimals) {
    return num
  }
  return Math.floor(num * 10 ** decimals) / 10 ** decimals
}

export const roundUp = (num: number, decimals: number): number => {
  if (decimalPlaces(num) <= decimals) {
    return num
  }
  return Math.ceil(num * 10 ** decimals) / 10 ** decimals
}

export const decimalPlaces = (num: number): number => {
  if (Number.isInteger(num)) {
    return 0
  }

  const arr = num.toString().split('.')
  if (arr.length <= 1) {
    return 0
  }

  return arr[1]!.length
}

export const roundNormal = (num: number, decimals: number): number => {
  if (decimalPlaces(num) <= decimals) {
    return num
  }
  return Math.round((num + Number.EPSILON) * 10 ** decimals) / 10 ** decimals
}

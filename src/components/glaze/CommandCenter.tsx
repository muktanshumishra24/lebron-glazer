'use client'

import type { PlaceOrderParams } from '../../lib/orders'

interface CommandCenterProps {
  orderForm: PlaceOrderParams
  setOrderForm: (form: PlaceOrderParams) => void
  onPlaceOrder: () => void
  apiKey: any
  loading: boolean
  theme: 'enemy-red' | 'lakers-gold'
}

export function CommandCenter({
  orderForm,
  setOrderForm,
  onPlaceOrder,
  apiKey,
  loading,
  theme,
}: CommandCenterProps) {
  if (!orderForm.tokenId) return null

  const borderColor = theme === 'enemy-red' ? 'border-enemy-red/40' : 'border-lakers-gold/30'
  const textColor = theme === 'enemy-red' ? 'text-enemy-red' : 'text-lakers-gold'
  const bgColor = theme === 'enemy-red' ? 'bg-enemy-red' : 'bg-lakers-gold'
  const textColorDark = theme === 'enemy-red' ? 'text-white' : 'text-black'

  const inputBorderColor = theme === 'enemy-red' ? 'border-enemy-red/50 focus:border-enemy-red' : 'border-lakers-gold/50 focus:border-lakers-gold'
  const inputBgColor = theme === 'enemy-red' ? 'bg-black/40 focus:bg-black/60' : 'bg-black/40 focus:bg-black/60'
  const inputTextColor = theme === 'enemy-red' ? 'text-white placeholder:text-gray-500' : 'text-lakers-gold placeholder:text-gray-500'
  const labelColor = theme === 'enemy-red' ? 'text-gray-300' : 'text-gray-300'

  return (
    <div className={`mt-6 pt-6 border-t ${borderColor}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-black uppercase ${textColor}`}>COMMAND CENTER</span>
          <span className={`text-xs ${textColor}/70 ml-auto`}>LEBRON'S SIDE (BUY)</span>
        </div>
        <div className="w-full">
          <label className={`block text-xs font-medium ${labelColor} mb-1.5 uppercase tracking-wide`}>
            Price
          </label>
          <input
            type="text"
            value={orderForm.price.toString()}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                setOrderForm({
                  ...orderForm,
                  price: value === '' ? 0 : parseFloat(value) || 0,
                })
              }
            }}
            className={`
              w-full px-4 py-2.5 rounded-lg border-2 transition-all
              ${inputBgColor} ${inputBorderColor} ${inputTextColor}
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${theme === 'enemy-red' ? 'focus:ring-enemy-red/50' : 'focus:ring-lakers-gold/50'}
              font-mono text-sm
            `}
            placeholder="0.00"
          />
        </div>
        <div className="w-full">
          <label className={`block text-xs font-medium ${labelColor} mb-1.5 uppercase tracking-wide`}>
            Size
          </label>
          <input
            type="text"
            value={orderForm.size.toString()}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                setOrderForm({
                  ...orderForm,
                  size: value === '' ? 0 : parseFloat(value) || 0,
                })
              }
            }}
            className={`
              w-full px-4 py-2.5 rounded-lg border-2 transition-all
              ${inputBgColor} ${inputBorderColor} ${inputTextColor}
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${theme === 'enemy-red' ? 'focus:ring-enemy-red/50' : 'focus:ring-lakers-gold/50'}
              font-mono text-sm
            `}
            placeholder="0"
          />
        </div>
        <button
          onClick={onPlaceOrder}
          disabled={!apiKey || !orderForm.tokenId || loading}
          className={`w-full py-2.5 px-4 rounded font-medium uppercase text-xs transition-colors ${
            !apiKey || !orderForm.tokenId || loading
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : theme === 'enemy-red'
              ? 'bg-enemy-red text-white hover:bg-enemy-red/90'
              : 'bg-lakers-gold text-black hover:bg-lakers-gold/90'
          }`}
        >
          {loading ? 'CALCULATING...' : 'EXECUTE ORDER'}
        </button>
      </div>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { NETWORK_CONFIG } from '../../../config'

/**
 * Proxy API route to create API key
 * This avoids CORS issues by making the request server-side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { headers } = body

    if (!headers) {
      return NextResponse.json(
        { error: 'Headers are required' },
        { status: 400 }
      )
    }

    // Validate required headers
    const requiredHeaders = ['PROB_ADDRESS', 'PROB_SIGNATURE', 'PROB_TIMESTAMP', 'PROB_NONCE']
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        return NextResponse.json(
          { error: `Missing required header: ${header}` },
          { status: 400 }
        )
      }
    }

    // Forward the request to the API server
    const url = `${NETWORK_CONFIG.entryService}/public/api/v1/auth/api-key/${NETWORK_CONFIG.chainId}`
    
    const response = await axios.post(url, {}, { 
      headers: {
        'PROB_ADDRESS': headers.PROB_ADDRESS,
        'PROB_SIGNATURE': headers.PROB_SIGNATURE,
        'PROB_TIMESTAMP': headers.PROB_TIMESTAMP,
        'PROB_NONCE': headers.PROB_NONCE,
      }
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('[API_ROUTE] Error creating API key:', error)
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500
      const errorData = error.response?.data || { error: error.message }
      return NextResponse.json(errorData, { status })
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 500 }
    )
  }
}

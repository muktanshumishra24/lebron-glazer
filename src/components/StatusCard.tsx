'use client'

import React from 'react'

interface StatusCardProps {
  title: string
  status: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message: string
  children?: React.ReactNode
}

export function StatusCard({ title, status, message, children }: StatusCardProps) {
  const statusColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    loading: 'bg-gray-50 border-gray-200 text-gray-800',
  }

  const statusIcons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    loading: '⟳',
  }

  return (
    <div className={`border rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{statusIcons[status]}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm mb-2">{message}</p>
      {children}
    </div>
  )
}

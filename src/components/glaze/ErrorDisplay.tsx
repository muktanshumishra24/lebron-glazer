'use client'

interface ErrorDisplayProps {
  error: string | null
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null

  return (
    <div className="mt-6 bg-enemy-red/10 border-2 border-enemy-red rounded-lg p-4">
      <h3 className="text-lg font-black uppercase tracking-tighter text-enemy-red mb-2">
        REFEREES ARE REVIEWING...
      </h3>
      <p className="text-gray-300 text-sm">{error}</p>
    </div>
  )
}

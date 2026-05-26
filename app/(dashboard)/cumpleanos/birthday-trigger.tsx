'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, RefreshCw } from 'lucide-react'

export function BirthdayTrigger() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function handleTrigger() {
    setStatus('loading')
    setResult(null)

    try {
      const res = await fetch('/api/cumpleanos/trigger', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setResult(data.error ?? 'Error al ejecutar')
        return
      }

      setStatus('success')
      const msg = data.total === 0
        ? 'No hay cumpleaños hoy'
        : `Enviados: ${data.sent} · Fallidos: ${data.failed} · Ya enviados antes: ${data.skipped}`
      setResult(msg)
    } catch {
      setStatus('error')
      setResult('Error de conexión')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTrigger}
        disabled={status === 'loading'}
        className="gap-2 w-fit"
      >
        {status === 'loading' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : status === 'success' ? (
          <RefreshCw size={14} />
        ) : (
          <Send size={14} />
        )}
        {status === 'loading' ? 'Enviando...' : 'Ejecutar ahora (hoy)'}
      </Button>

      {result && (
        <p
          className={`text-xs px-3 py-1.5 rounded-md w-fit ${
            status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {result}
        </p>
      )}
    </div>
  )
}

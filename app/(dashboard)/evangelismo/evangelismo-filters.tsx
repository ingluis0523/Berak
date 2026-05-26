'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

const ESTADOS = [
  { value: 'todos',          label: 'Todos' },
  { value: 'evangelizada',   label: 'Evangelizada' },
  { value: 'en seguimiento', label: 'En seguimiento' },
  { value: 'consolidada',    label: 'Consolidada' },
  { value: 'integrada',      label: 'Integrada' },
]

interface Props {
  currentEstado?: string
  currentQ?: string
  totalFiltrado: number
}

export function EvangelismoFilters({ currentEstado, currentQ, totalFiltrado }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(currentQ ?? '')

  const navigate = useCallback((nextEstado: string | undefined, nextQ: string | undefined) => {
    const params = new URLSearchParams()
    if (nextEstado && nextEstado !== 'todos') params.set('estado', nextEstado)
    if (nextQ) params.set('q', nextQ)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [pathname, router])

  const handleEstado = (val: string) => navigate(val, q || undefined)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(currentEstado, q || undefined)
  }

  const activeEstado = currentEstado ?? 'todos'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px] max-w-xs">
        <Input
          placeholder="Buscar persona..."
          value={q}
          onChange={e => setQ(e.target.value)}
          leftIcon={<Search size={14} />}
        />
        <Button type="submit" variant="outline" size="sm">Buscar</Button>
      </form>

      <div className="flex items-center gap-1.5 flex-wrap">
        {ESTADOS.map(e => (
          <Button
            key={e.value}
            variant={activeEstado === e.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleEstado(e.value)}
          >
            {e.label}
          </Button>
        ))}
      </div>

      {(currentQ || (currentEstado && currentEstado !== 'todos')) && (
        <p className="text-xs text-gray-400 ml-auto">{totalFiltrado} resultado{totalFiltrado !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import type { SelectOption } from '@/types'
import { TIPO_PERSONA_LABELS } from '@/lib/utils'
import { useDebouncedCallback } from './use-debounced-callback'

interface Props {
  estados: SelectOption[]
  defaultSearch: string
  defaultEstado: string
  defaultTipo: string
}

const TIPO_OPTIONS: SelectOption[] = Object.entries(TIPO_PERSONA_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function PersonasFilters({ estados, defaultSearch, defaultEstado, defaultTipo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const push = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v) })
      startTransition(() => {
        router.push(`${pathname}?${sp.toString()}`)
      })
    },
    [router, pathname]
  )

  const handleSearch = useDebouncedCallback((value: string) => {
    push({ search: value, estado: defaultEstado, tipo: defaultTipo, page: '1' })
  }, 400)

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 max-w-sm">
        <Input
          placeholder="Buscar por nombre o teléfono..."
          defaultValue={defaultSearch}
          leftIcon={<Search size={16} />}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <Select
        defaultValue={defaultEstado || '_all'}
        onValueChange={(v) =>
          push({ search: defaultSearch, estado: v === '_all' ? '' : v, tipo: defaultTipo, page: '1' })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los estados</SelectItem>
          {estados.map((e) => (
            <SelectItem key={e.value} value={e.value}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={defaultTipo || '_all'}
        onValueChange={(v) =>
          push({ search: defaultSearch, estado: defaultEstado, tipo: v === '_all' ? '' : v, page: '1' })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los tipos</SelectItem>
          {TIPO_OPTIONS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

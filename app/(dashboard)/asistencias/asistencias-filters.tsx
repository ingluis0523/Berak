'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import type { Grupo } from '@/types'

interface Props {
  grupos: Pick<Grupo, 'id' | 'nombre'>[]
  defaultSearch: string
  defaultGrupo: string
  defaultFecha: string
}

export function AsistenciasFilters({ grupos, defaultSearch, defaultGrupo, defaultFecha }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const update = useCallback(
    (updates: Record<string, string>) => {
      const sp = new URLSearchParams()
      const merged = {
        search: defaultSearch,
        grupo_id: defaultGrupo,
        fecha: defaultFecha,
        ...updates,
      }
      Object.entries(merged).forEach(([k, v]) => {
        if (v) sp.set(k, v)
      })
      router.push(`${pathname}?${sp.toString()}`)
    },
    [router, pathname, defaultSearch, defaultGrupo, defaultFecha]
  )

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre de evento..."
          defaultValue={defaultSearch}
          onChange={(e) => update({ search: e.target.value })}
        />
      </div>

      <Select
        value={defaultGrupo || 'todos'}
        onValueChange={(v) => update({ grupo_id: v === 'todos' ? '' : v })}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Todos los grupos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los grupos</SelectItem>
          {grupos.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="sm:w-44"
        defaultValue={defaultFecha}
        onChange={(e) => update({ fecha: e.target.value })}
      />
    </div>
  )
}

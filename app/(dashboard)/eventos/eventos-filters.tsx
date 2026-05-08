'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Props {
  defaultSearch: string
  defaultFecha: string
  defaultTab: string
}

export function EventosFilters({ defaultSearch, defaultFecha, defaultTab }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const update = useCallback(
    (key: string, value: string) => {
      const sp = new URLSearchParams()
      sp.set('tab', defaultTab)
      if (key !== 'search' && defaultSearch) sp.set('search', defaultSearch)
      if (key !== 'fecha' && defaultFecha) sp.set('fecha', defaultFecha)
      if (value) sp.set(key, value)
      router.push(`${pathname}?${sp.toString()}`)
    },
    [router, pathname, defaultSearch, defaultFecha, defaultTab]
  )

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre..."
          defaultValue={defaultSearch}
          onChange={(e) => update('search', e.target.value)}
        />
      </div>
      <Input
        type="date"
        className="sm:w-44"
        defaultValue={defaultFecha}
        onChange={(e) => update('fecha', e.target.value)}
      />
    </div>
  )
}

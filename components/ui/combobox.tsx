'use client'

import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  error?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  disabled,
  error,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selectedLabel = value ? options.find((o) => o.value === value)?.label : null

  return (
    <Popover.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch('') }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 hover:border-gray-400 focus:ring-blue-500',
            className,
          )}
        >
          <span className={cn('truncate text-left', !selectedLabel && 'text-gray-400')}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-gray-200 bg-white shadow-lg outline-none"
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">{emptyText}</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onValueChange?.(opt.value)
                    setSearch('')
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors text-left',
                    value === opt.value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && (
                    <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

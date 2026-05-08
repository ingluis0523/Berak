'use client'

import { useRef, useCallback, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fnRef = useRef<T>(fn)

  useEffect(() => {
    fnRef.current = fn
  })

  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fnRef.current(...args), delay)
    },
    // delay is stable; fnRef is a stable ref object — intentionally omitting fn
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay]
  ) as T
}

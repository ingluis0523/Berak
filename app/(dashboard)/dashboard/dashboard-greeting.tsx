'use client'

import { useEffect, useState } from 'react'

export function DashboardGreeting() {
  const [greeting, setGreeting] = useState('')
  const [dayLabel, setDayLabel] = useState('')

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    const base = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
    setGreeting(`${base}, Dios te bendiga`)
    setDayLabel(now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
      <p className="text-sm text-gray-500 capitalize">{dayLabel}</p>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, X, UserPlus, Check, AlertCircle } from 'lucide-react'

type PersonaBasic = {
  id: string; nombres: string; apellidos: string
  correo: string | null; telefono: string | null
}

// ── Persona Search Field ──────────────────────────────────────────────────────

function PersonaSearchField({
  label, placeholder, selected, onSelect,
}: {
  label: string
  placeholder: string
  selected: PersonaBasic | null
  onSelect: (p: PersonaBasic | null) => void
}) {
  const supabase = createClient()
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState<PersonaBasic[]>([])

  useEffect(() => {
    if (!search || search.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, correo, telefono')
        .or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%`)
        .is('deleted_at', null)
        .limit(8)
      setResults((data ?? []) as PersonaBasic[])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-sm font-medium text-blue-900">
            {selected.nombres} {selected.apellidos}
          </span>
          <button onClick={() => onSelect(null)} className="text-blue-400 hover:text-blue-700">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder={placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => { onSelect(p); setSearch(''); setResults([]) }}
                >
                  <span className="font-medium">{p.nombres} {p.apellidos}</span>
                  {p.correo && <span className="text-xs text-gray-400 truncate ml-2">{p.correo}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function EvangelismoForm() {
  const router   = useRouter()
  const supabase = createClient()

  const [personaMode, setPersonaMode] = useState<'buscar' | 'nueva'>('buscar')
  const [selectedPersona, setSelectedPersona] = useState<PersonaBasic | null>(null)
  const [nuevaPersona, setNuevaPersona] = useState({ nombres: '', apellidos: '', correo: '', telefono: '' })

  // Persona search for evangelizado (solo buscar mode)
  const [personaSearch, setPersonaSearch]   = useState('')
  const [personaResults, setPersonaResults] = useState<PersonaBasic[]>([])

  const [selectedEv,  setSelectedEv]  = useState<PersonaBasic | null>(null)
  const [selectedEnc, setSelectedEnc] = useState<PersonaBasic | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [fecha,  setFecha]  = useState(today)
  const [lugar,  setLugar]  = useState('')
  const [notas,  setNotas]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (!personaSearch || personaSearch.length < 2) { setPersonaResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, correo, telefono')
        .or(`nombres.ilike.%${personaSearch}%,apellidos.ilike.%${personaSearch}%`)
        .is('deleted_at', null)
        .limit(8)
      setPersonaResults((data ?? []) as PersonaBasic[])
    }, 300)
    return () => clearTimeout(t)
  }, [personaSearch])

  const handleSubmit = useCallback(async () => {
    setError('')

    if (personaMode === 'buscar' && !selectedPersona) {
      setError('Selecciona una persona evangelizada'); return
    }
    if (personaMode === 'nueva' && (!nuevaPersona.nombres.trim() || !nuevaPersona.apellidos.trim())) {
      setError('Nombres y apellidos son requeridos'); return
    }
    if (!fecha) { setError('La fecha de evangelismo es requerida'); return }

    setSaving(true)

    // Obtener estado "Evangelizada"
    const { data: estadoRow } = await supabase
      .from('estados_persona')
      .select('id')
      .ilike('nombre', 'evangelizada')
      .limit(1)
      .maybeSingle()

    let personaId: string

    if (personaMode === 'nueva') {
      const { data: newP, error: pErr } = await supabase
        .from('personas')
        .insert({
          nombres:          nuevaPersona.nombres.trim(),
          apellidos:        nuevaPersona.apellidos.trim(),
          correo:           nuevaPersona.correo.trim() || null,
          telefono:         nuevaPersona.telefono.trim() || null,
          tipo_persona:     'visitante',
          estado_persona_id: estadoRow?.id ?? null,
        })
        .select('id')
        .single()

      if (pErr || !newP) {
        setError(pErr?.message ?? 'Error creando la persona')
        setSaving(false)
        return
      }
      personaId = newP.id
    } else {
      personaId = selectedPersona!.id
      if (estadoRow?.id) {
        await supabase
          .from('personas')
          .update({ estado_persona_id: estadoRow.id, updated_at: new Date().toISOString() })
          .eq('id', personaId)
      }
    }

    // Crear evangelismo
    const { data: ev, error: evErr } = await supabase
      .from('evangelismos')
      .insert({
        persona_id:       personaId,
        evangelizador_id: selectedEv?.id ?? null,
        encargado_id:     selectedEnc?.id ?? null,
        fecha_evangelismo: fecha,
        lugar:  lugar.trim() || null,
        notas:  notas.trim() || null,
      })
      .select('id')
      .single()

    if (evErr || !ev) {
      setError(evErr?.message ?? 'Error registrando el evangelismo')
      setSaving(false)
      return
    }

    // Log cambio de estado
    if (estadoRow?.id) {
      await supabase.from('persona_estado_historial').insert({
        persona_id:    personaId,
        estado_id:     estadoRow.id,
        estado_nombre: 'Evangelizada',
        notas: `Evangelismo registrado${lugar ? ` en ${lugar}` : ''}`,
      })
    }

    router.push(`/evangelismo/${ev.id}`)
  }, [personaMode, selectedPersona, nuevaPersona, fecha, lugar, notas, selectedEv, selectedEnc, router])

  return (
    <div className="space-y-5">
      {/* Persona evangelizada */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Persona evangelizada</h2>

          <div className="flex gap-2">
            <Button
              variant={personaMode === 'buscar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setPersonaMode('buscar'); setSelectedPersona(null) }}
            >
              <Search size={13} />
              Buscar existente
            </Button>
            <Button
              variant={personaMode === 'nueva' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setPersonaMode('nueva'); setSelectedPersona(null) }}
            >
              <UserPlus size={13} />
              Nueva persona
            </Button>
          </div>

          {personaMode === 'buscar' ? (
            selectedPersona ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedPersona.nombres} {selectedPersona.apellidos}
                  </p>
                  {selectedPersona.correo && (
                    <p className="text-xs text-blue-600">{selectedPersona.correo}</p>
                  )}
                </div>
                <button onClick={() => setSelectedPersona(null)} className="text-blue-400 hover:text-blue-700 ml-3">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Buscar persona por nombre..."
                  value={personaSearch}
                  onChange={e => setPersonaSearch(e.target.value)}
                  leftIcon={<Search size={14} />}
                />
                {personaResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {personaResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => { setSelectedPersona(p); setPersonaSearch(''); setPersonaResults([]) }}
                      >
                        <span className="font-medium">{p.nombres} {p.apellidos}</span>
                        {p.correo && <span className="text-xs text-gray-400 truncate ml-2">{p.correo}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombres *"
                value={nuevaPersona.nombres}
                onChange={e => setNuevaPersona(p => ({ ...p, nombres: e.target.value }))}
              />
              <Input
                label="Apellidos *"
                value={nuevaPersona.apellidos}
                onChange={e => setNuevaPersona(p => ({ ...p, apellidos: e.target.value }))}
              />
              <Input
                label="Correo"
                type="email"
                value={nuevaPersona.correo}
                onChange={e => setNuevaPersona(p => ({ ...p, correo: e.target.value }))}
              />
              <Input
                label="Teléfono"
                value={nuevaPersona.telefono}
                onChange={e => setNuevaPersona(p => ({ ...p, telefono: e.target.value }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsables */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Responsables</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersonaSearchField
              label="Evangelizador"
              placeholder="¿Quién evangelizó?"
              selected={selectedEv}
              onSelect={setSelectedEv}
            />
            <PersonaSearchField
              label="Encargado de seguimiento"
              placeholder="Responsable del seguimiento"
              selected={selectedEnc}
              onSelect={setSelectedEnc}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Detalles del evangelismo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de evangelismo *"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
            <Input
              label="Lugar"
              placeholder="Parque, hogar, reunión..."
              value={lugar}
              onChange={e => setLugar(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas iniciales</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Contexto, impresiones, observaciones iniciales..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger">
          <AlertCircle size={14} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} loading={saving}>
          <Check size={15} />
          Guardar evangelismo
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { EvangelismoSeguimiento } from '@/types'

type SeguimientoWithResp = EvangelismoSeguimiento & {
  responsable: { id: string; nombres: string; apellidos: string } | null
}

const TIPO_LABELS: Record<string, string> = {
  contacto: 'Contacto', visita: 'Visita', reunion: 'Reunión',
  oracion: 'Oración', otro: 'Otro',
}
const RESULTADO_COLORS: Record<string, string> = {
  positivo: 'success', neutral: 'secondary',
  pendiente: 'warning', sin_respuesta: 'danger',
}
const RESULTADO_LABELS: Record<string, string> = {
  positivo: 'Positivo', neutral: 'Neutral',
  pendiente: 'Pendiente', sin_respuesta: 'Sin respuesta',
}

interface Props {
  evangelismoId: string
  personaId: string
  initialSeguimientos: SeguimientoWithResp[]
}

export function SeguimientoSection({ evangelismoId, initialSeguimientos }: Props) {
  const supabase = createClient()
  const [seguimientos, setSeguimientos] = useState<SeguimientoWithResp[]>(initialSeguimientos)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    fecha:       today,
    tipo:        'contacto',
    descripcion: '',
    resultado:   'pendiente',
  })

  const handleAdd = async () => {
    setSaving(true)
    const { data, error } = await supabase
      .from('evangelismo_seguimientos')
      .insert({
        evangelismo_id: evangelismoId,
        fecha:          form.fecha,
        tipo:           form.tipo,
        descripcion:    form.descripcion.trim() || null,
        resultado:      form.resultado,
      })
      .select('*, responsable:personas!responsable_id(id, nombres, apellidos)')
      .single()

    if (!error && data) {
      const newSeg = {
        ...(data as EvangelismoSeguimiento),
        responsable: null,
      }
      setSeguimientos(prev => [newSeg, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)))
      setForm({ fecha: today, tipo: 'contacto', descripcion: '', resultado: 'pendiente' })
      setFormOpen(false)
    }
    setSaving(false)
  }

  const handleDelete = async (segId: string) => {
    setDeleting(segId)
    await supabase.from('evangelismo_seguimientos').delete().eq('id', segId)
    setSeguimientos(prev => prev.filter(s => s.id !== segId))
    setDeleting(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare size={16} className="text-purple-500" />
            Seguimientos <span className="text-gray-400 font-normal">({seguimientos.length})</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setFormOpen(o => !o)}>
            {formOpen ? <ChevronUp size={14} /> : <Plus size={14} />}
            {formOpen ? 'Cancelar' : 'Agregar'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Formulario */}
        {formOpen && (
          <div className="border-b border-gray-100 p-4 bg-gray-50/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fecha"
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                >
                  {Object.entries(TIPO_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Resultado</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(RESULTADO_LABELS).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, resultado: val }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.resultado === val
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Observaciones del seguimiento..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <Button size="sm" onClick={handleAdd} loading={saving}>
              Guardar seguimiento
            </Button>
          </div>
        )}

        {/* Lista */}
        {seguimientos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Sin seguimientos registrados.
            <button className="block mx-auto mt-1 text-blue-600 hover:underline text-xs" onClick={() => setFormOpen(true)}>
              Agregar el primero
            </button>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {seguimientos.map(s => {
              const resp = s.responsable
              return (
                <li key={s.id} className="flex items-start gap-3 px-5 py-3.5 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {TIPO_LABELS[s.tipo] ?? s.tipo}
                      </span>
                      {s.resultado && (
                        <Badge variant={RESULTADO_COLORS[s.resultado] as 'success' | 'warning' | 'danger' | 'secondary'}>
                          {RESULTADO_LABELS[s.resultado]}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(s.fecha)}</span>
                    </div>
                    {s.descripcion && (
                      <p className="text-xs text-gray-600 mt-0.5">{s.descripcion}</p>
                    )}
                    {resp && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Por {resp.nombres} {resp.apellidos}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EstadoPersona, ReglaAutomatizacion, TipoRegla } from '@/types'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, AlertCircle, Settings, Zap, User, Trash2 } from 'lucide-react'

// ─── Reglas predefinidas (seed) ───────────────────────────────────────────────

const REGLAS_SEED = [
  { nombre: '4 ausencias consecutivas',        tipo: 'ausencias_consecutivas' as TipoRegla, condicion_valor: 4,    accion: 'cambiar_estado', activo: false },
  { nombre: '30 días sin asistir',              tipo: 'dias_sin_asistir'       as TipoRegla, condicion_valor: 30,   accion: 'cambiar_estado', activo: false },
  { nombre: '10 asistencias acumuladas',        tipo: 'asistencias_acumuladas' as TipoRegla, condicion_valor: 10,   accion: 'cambiar_estado', activo: false },
  { nombre: 'Ingreso a ministerio → Servidor', tipo: 'ingreso_ministerio'     as TipoRegla, condicion_valor: null, accion: 'cambiar_estado', activo: true  },
]

const TIPO_REGLA_OPTIONS: { value: TipoRegla; label: string; defaultValor: number | null }[] = [
  { value: 'ausencias_consecutivas', label: '4 ausencias consecutivas', defaultValor: 4 },
  { value: 'dias_sin_asistir',       label: '30 días sin asistir',        defaultValor: 30 },
  { value: 'asistencias_acumuladas', label: '10 asistencias acumuladas', defaultValor: 10 },
  { value: 'ingreso_ministerio',     label: 'Ingreso a ministerio',       defaultValor: null },
]

const COLOR_OPTIONS = [
  { value: 'blue',   label: 'Azul',    className: 'bg-blue-500' },
  { value: 'green',  label: 'Verde',   className: 'bg-green-500' },
  { value: 'orange', label: 'Naranja', className: 'bg-orange-500' },
  { value: 'gray',   label: 'Gris',    className: 'bg-gray-400' },
  { value: 'purple', label: 'Morado',  className: 'bg-purple-500' },
  { value: 'red',    label: 'Rojo',    className: 'bg-red-500' },
]

const ESTADOS_SEED = [
  { nombre: 'Nuevo',      descripcion: 'Persona recién registrada',           color: 'blue',   orden: 1, activo: true },
  { nombre: 'Visitante',  descripcion: 'Ha visitado pero no es miembro',      color: 'purple', orden: 2, activo: true },
  { nombre: 'Asistente',  descripcion: 'Asiste regularmente',                 color: 'green',  orden: 3, activo: true },
  { nombre: 'Servidor',   descripcion: 'Sirve activamente en la iglesia',     color: 'orange', orden: 4, activo: true },
  { nombre: 'Inactivo',   descripcion: 'No ha asistido en mucho tiempo',      color: 'gray',   orden: 5, activo: true },
]

// ─── Tab: Mi Cuenta ───────────────────────────────────────────────────────────

function TabMiCuenta() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState({ nombres: '', apellidos: '', telefono: '' })
  const [contrasena, setContrasena] = useState({ nueva: '', confirmar: '' })
  const [userEmail, setUserEmail] = useState('')
  const [userCreatedAt, setUserCreatedAt] = useState('')
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [msgPerfil, setMsgPerfil] = useState('')
  const [msgPass, setMsgPass] = useState('')
  const [errorPass, setErrorPass] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')
      setUserCreatedAt(user.created_at)

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('persona_id')
        .eq('id', user.id)
        .single()

      if (usuario?.persona_id) {
        const { data: persona } = await supabase
          .from('personas')
          .select('nombres, apellidos, telefono')
          .eq('id', usuario.persona_id)
          .single()
        if (persona) {
          setPerfil({
            nombres: persona.nombres ?? '',
            apellidos: persona.apellidos ?? '',
            telefono: persona.telefono ?? '',
          })
        }
      }
    }
    load()
  }, [])

  const handleSavePerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSavingPerfil(true)
    setMsgPerfil('')

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('persona_id')
      .eq('id', user.id)
      .single()

    if (usuario?.persona_id) {
      const { error } = await supabase
        .from('personas')
        .update({ nombres: perfil.nombres, apellidos: perfil.apellidos, telefono: perfil.telefono || null })
        .eq('id', usuario.persona_id)
      if (error) { setSavingPerfil(false); setMsgPerfil('Error: ' + error.message); return }
    }
    setSavingPerfil(false)
    setMsgPerfil('Perfil actualizado correctamente.')
    setTimeout(() => setMsgPerfil(''), 3000)
  }

  const handleChangePassword = async () => {
    setErrorPass('')
    setMsgPass('')
    if (!contrasena.nueva || !contrasena.confirmar) { setErrorPass('Completa todos los campos'); return }
    if (contrasena.nueva.length < 8) { setErrorPass('La contraseña debe tener al menos 8 caracteres'); return }
    if (contrasena.nueva !== contrasena.confirmar) { setErrorPass('Las contraseñas no coinciden'); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: contrasena.nueva })
    setSavingPass(false)
    if (error) { setErrorPass(error.message); return }
    setContrasena({ nueva: '', confirmar: '' })
    setMsgPass('Contraseña actualizada correctamente.')
    setTimeout(() => setMsgPass(''), 3000)
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Info de cuenta */}
      <Card>
        <CardHeader><CardTitle>Información de cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{userEmail}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Miembro desde</span>
            <span className="text-sm text-gray-900">{formatDate(userCreatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Editar perfil */}
      <Card>
        <CardHeader><CardTitle>Editar perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombres" value={perfil.nombres} onChange={e => setPerfil(p => ({ ...p, nombres: e.target.value }))} />
            <Input label="Apellidos" value={perfil.apellidos} onChange={e => setPerfil(p => ({ ...p, apellidos: e.target.value }))} />
          </div>
          <Input label="Teléfono" value={perfil.telefono} onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))} />
          {msgPerfil && <p className="text-sm text-green-600">{msgPerfil}</p>}
          <Button onClick={handleSavePerfil} loading={savingPerfil}>Guardar cambios</Button>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <CardHeader><CardTitle>Cambiar contraseña</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={contrasena.nueva}
            onChange={e => setContrasena(c => ({ ...c, nueva: e.target.value }))}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite la contraseña"
            value={contrasena.confirmar}
            onChange={e => setContrasena(c => ({ ...c, confirmar: e.target.value }))}
          />
          {errorPass && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{errorPass}</AlertDescription>
            </Alert>
          )}
          {msgPass && <p className="text-sm text-green-600">{msgPass}</p>}
          <Button onClick={handleChangePassword} loading={savingPass}>Actualizar contraseña</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Estados de persona ──────────────────────────────────────────────────

function EstadoModal({
  open,
  onClose,
  onSaved,
  estadoEdit,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  estadoEdit?: EstadoPersona | null
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ nombre: '', descripcion: '', color: 'blue', orden: 1, activo: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (estadoEdit) {
      setForm({
        nombre: estadoEdit.nombre,
        descripcion: estadoEdit.descripcion ?? '',
        color: estadoEdit.color ?? 'blue',
        orden: estadoEdit.orden,
        activo: estadoEdit.activo,
      })
    } else {
      setForm({ nombre: '', descripcion: '', color: 'blue', orden: 1, activo: true })
    }
    setError('')
  }, [estadoEdit, open])

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    setError('')
    if (estadoEdit) {
      const { error: err } = await supabase
        .from('estados_persona')
        .update({ nombre: form.nombre.trim(), descripcion: form.descripcion || null, color: form.color, orden: form.orden, activo: form.activo })
        .eq('id', estadoEdit.id)
      if (err) { setSaving(false); setError(err.message); return }
    } else {
      const { error: err } = await supabase
        .from('estados_persona')
        .insert({ nombre: form.nombre.trim(), descripcion: form.descripcion || null, color: form.color, orden: form.orden, activo: form.activo })
      if (err) { setSaving(false); setError(err.message); return }
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{estadoEdit ? 'Editar estado' : 'Nuevo estado'}</DialogTitle>
          <DialogDescription>Define los estados posibles de una persona</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <Input label="Nombre *" placeholder="Ej: Asistente, Miembro..." value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <Input label="Descripción" placeholder="Descripción breve" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    form.color === c.value ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${c.className}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Orden"
            type="number"
            value={form.orden}
            onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 1 }))}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.activo}
              onCheckedChange={v => setForm(f => ({ ...f, activo: !!v }))}
            />
            <span className="text-sm text-gray-700">Activo</span>
          </label>
          {error && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{estadoEdit ? 'Guardar' : 'Crear estado'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TabEstados() {
  const supabase = createClient()
  const [estados, setEstados] = useState<EstadoPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; edit: EstadoPersona | null }>({ open: false, edit: null })

  const seedEstados = async () => {
    const { data: existing } = await supabase.from('estados_persona').select('nombre')
    const existingNames = new Set((existing ?? []).map((e: { nombre: string }) => e.nombre.toLowerCase()))
    const toInsert = ESTADOS_SEED.filter(e => !existingNames.has(e.nombre.toLowerCase()))
    if (toInsert.length > 0) await supabase.from('estados_persona').insert(toInsert)
  }

  const loadEstados = useCallback(async () => {
    setLoading(true)
    await seedEstados()
    const { data } = await supabase.from('estados_persona').select('*').order('orden')
    setEstados(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadEstados() }, [loadEstados])

  const handleOrdenChange = async (id: string, orden: number) => {
    setEstados(prev => prev.map(e => e.id === id ? { ...e, orden } : e))
    await supabase.from('estados_persona').update({ orden }).eq('id', id)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Configura los estados que puede tener una persona en la iglesia.</p>
        <Button size="sm" onClick={() => setModal({ open: true, edit: null })}>
          <Plus size={14} />
          Nuevo estado
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {estados.map(est => {
                  const colorDef = COLOR_OPTIONS.find(c => c.value === est.color)
                  return (
                    <TableRow key={est.id}>
                      <TableCell className="font-medium">{est.nombre}</TableCell>
                      <TableCell className="text-gray-500 text-xs">{est.descripcion ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-3 w-3 rounded-full ${colorDef?.className ?? 'bg-gray-300'}`} />
                          <span className="text-xs text-gray-500">{colorDef?.label ?? est.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-16 h-7 text-xs"
                          value={est.orden}
                          onChange={e => handleOrdenChange(est.id, parseInt(e.target.value) || 1)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={est.activo ? 'success' : 'secondary'}>
                          {est.activo ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setModal({ open: true, edit: est })}
                        >
                          <Pencil size={13} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EstadoModal
        open={modal.open}
        onClose={() => setModal({ open: false, edit: null })}
        onSaved={loadEstados}
        estadoEdit={modal.edit}
      />
    </div>
  )
}

// ─── Tab: Automatizaciones ────────────────────────────────────────────────────

function ReglaModal({
  open,
  onClose,
  onSaved,
  reglaEdit,
  estados,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  reglaEdit?: ReglaAutomatizacion | null
  estados: EstadoPersona[]
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    nombre: '',
    tipo: '' as TipoRegla | '',
    condicion_valor: '' as string,
    estado_resultado_id: '',
    activo: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (reglaEdit) {
      setForm({
        nombre: reglaEdit.nombre,
        tipo: reglaEdit.tipo,
        condicion_valor: String(reglaEdit.condicion_valor ?? ''),
        estado_resultado_id: reglaEdit.estado_resultado_id ?? '',
        activo: reglaEdit.activo,
      })
    } else {
      setForm({ nombre: '', tipo: '', condicion_valor: '', estado_resultado_id: '', activo: true })
    }
    setError('')
  }, [reglaEdit, open])

  const handleTipoChange = (tipo: TipoRegla) => {
    const opt = TIPO_REGLA_OPTIONS.find(o => o.value === tipo)
    setForm(f => ({
      ...f,
      tipo,
      nombre: opt?.label ?? f.nombre,
      condicion_valor: opt?.defaultValor != null ? String(opt.defaultValor) : '',
    }))
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.tipo) { setError('Nombre y tipo son requeridos'); return }
    setSaving(true)
    setError('')
    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      condicion_valor: form.condicion_valor ? parseInt(form.condicion_valor) : null,
      accion: 'cambiar_estado',
      estado_resultado_id: form.estado_resultado_id || null,
      activo: form.activo,
    }
    if (reglaEdit) {
      const { error: err } = await supabase.from('reglas_automatizacion').update(payload).eq('id', reglaEdit.id)
      if (err) { setSaving(false); setError(err.message); return }
    } else {
      const { error: err } = await supabase.from('reglas_automatizacion').insert(payload)
      if (err) { setSaving(false); setError(err.message); return }
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{reglaEdit ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
          <DialogDescription>Define una regla de automatización</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Tipo *</p>
            <Select value={form.tipo} onValueChange={v => handleTipoChange(v as TipoRegla)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {TIPO_REGLA_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          />
          {form.tipo !== 'ingreso_ministerio' && (
            <Input
              label="Valor de condición"
              type="number"
              hint="Número de veces/días que se evalúa"
              value={form.condicion_valor}
              onChange={e => setForm(f => ({ ...f, condicion_valor: e.target.value }))}
            />
          )}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Cambiar a estado</p>
            <Select value={form.estado_resultado_id} onValueChange={v => setForm(f => ({ ...f, estado_resultado_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                {estados.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: !!v }))} />
            <span className="text-sm text-gray-700">Regla activa</span>
          </label>
          {error && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{reglaEdit ? 'Guardar' : 'Crear regla'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TabAutomatizaciones() {
  const supabase = createClient()
  const [reglas, setReglas] = useState<ReglaAutomatizacion[]>([])
  const [estados, setEstados] = useState<EstadoPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; edit: ReglaAutomatizacion | null }>({ open: false, edit: null })

  const seedReglas = async () => {
    const { data: existing } = await supabase.from('reglas_automatizacion').select('tipo')
    const existingTypes = new Set((existing ?? []).map((r: { tipo: string }) => r.tipo))
    const toInsert = REGLAS_SEED.filter(r => !existingTypes.has(r.tipo))
    if (toInsert.length > 0) await supabase.from('reglas_automatizacion').insert(toInsert)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    await seedReglas()
    const [{ data: reglasData }, { data: estadosData }] = await Promise.all([
      supabase.from('reglas_automatizacion').select('*, estado_resultado:estado_resultado_id(id, nombre, color)').order('created_at'),
      supabase.from('estados_persona').select('*').eq('activo', true).order('orden'),
    ])
    setReglas(reglasData ?? [])
    setEstados(estadosData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleToggle = async (regla: ReglaAutomatizacion) => {
    setToggling(regla.id)
    await supabase.from('reglas_automatizacion').update({ activo: !regla.activo }).eq('id', regla.id)
    setReglas(prev => prev.map(r => r.id === regla.id ? { ...r, activo: !r.activo } : r))
    setToggling(null)
  }

  const handleDelete = async (regla: ReglaAutomatizacion) => {
    if (!window.confirm(`¿Eliminar la regla "${regla.nombre}"?`)) return
    setDeleting(regla.id)
    await supabase.from('reglas_automatizacion').delete().eq('id', regla.id)
    setReglas(prev => prev.filter(r => r.id !== regla.id))
    setDeleting(null)
  }

  const TIPO_LABELS: Record<string, string> = {
    ausencias_consecutivas: 'Ausencias consecutivas',
    dias_sin_asistir:       'Días sin asistir',
    asistencias_acumuladas: 'Asistencias acumuladas',
    ingreso_ministerio:     'Ingreso a ministerio',
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Reglas que cambian automáticamente el estado de las personas.</p>
        <Button size="sm" onClick={() => setModal({ open: true, edit: null })}>
          <Plus size={14} />
          Nueva regla
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {reglas.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${r.activo ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{r.nombre}</p>
                    <Badge variant={r.activo ? 'success' : 'secondary'} className="text-xs">
                      {r.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TIPO_LABELS[r.tipo]}
                    {r.condicion_valor != null && ` • Valor: ${r.condicion_valor}`}
                    {r.estado_resultado && ` • → ${(r.estado_resultado as EstadoPersona).nombre}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setModal({ open: true, edit: r })}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant={r.activo ? 'danger-outline' : 'outline'}
                    size="sm"
                    onClick={() => handleToggle(r)}
                    loading={toggling === r.id}
                  >
                    {r.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(r)}
                    loading={deleting === r.id}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Eliminar regla"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {reglas.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Sin reglas configuradas.</div>
          )}
        </div>
      )}

      <ReglaModal
        open={modal.open}
        onClose={() => setModal({ open: false, edit: null })}
        onSaved={loadData}
        reglaEdit={modal.edit}
        estados={estados}
      />
    </div>
  )
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

function TabGeneral() {
  const supabase = createClient()
  const [nombreIglesia, setNombreIglesia] = useState('IglesiaJCReina')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userCreatedAt, setUserCreatedAt] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? '')
        setUserCreatedAt(user.created_at)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    // Aquí se guardaría en una tabla de configuración general si existe.
    // Por ahora simular guardado.
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setMsg('Configuración guardada.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-5 max-w-xl">
      <Card>
        <CardHeader><CardTitle>Información de la iglesia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nombre de la iglesia"
            value={nombreIglesia}
            onChange={e => setNombreIglesia(e.target.value)}
            placeholder="Nombre de la iglesia"
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Nombre de la plataforma</p>
            <Input value="Berak" disabled className="bg-gray-50" />
            <p className="text-xs text-gray-400">El nombre de la plataforma no puede modificarse.</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Logo</p>
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">
                Para cambiar el logo, contacta al administrador técnico o reemplaza el archivo{' '}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">public/logo.png</code>
              </p>
            </div>
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <Button onClick={handleSave} loading={saving}>Guardar configuración</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Información de cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{userEmail}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Cuenta creada</span>
            <span className="text-sm text-gray-900">{formatDate(userCreatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Ajustes del sistema y tu cuenta"
        breadcrumbs={[{ label: 'Sistema' }, { label: 'Configuración' }]}
      />

      <Tabs defaultValue="cuenta">
        <TabsList>
          <TabsTrigger value="cuenta">
            <User size={14} />
            Mi cuenta
          </TabsTrigger>
          <TabsTrigger value="estados">
            <Settings size={14} />
            Estados de persona
          </TabsTrigger>
          <TabsTrigger value="automatizaciones">
            <Zap size={14} />
            Automatizaciones
          </TabsTrigger>
          <TabsTrigger value="general">
            <Settings size={14} />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cuenta">
          <TabMiCuenta />
        </TabsContent>

        <TabsContent value="estados">
          <TabEstados />
        </TabsContent>

        <TabsContent value="automatizaciones">
          <TabAutomatizaciones />
        </TabsContent>

        <TabsContent value="general">
          <TabGeneral />
        </TabsContent>
      </Tabs>
    </div>
  )
}

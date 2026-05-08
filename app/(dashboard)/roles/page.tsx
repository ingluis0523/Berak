'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Rol, Permiso, RolPermiso } from '@/types'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldCheck, Plus, AlertCircle, Users } from 'lucide-react'

// ─── Permisos predefinidos ────────────────────────────────────────────────────

const PERMISOS_SEED: { nombre: string; modulo: string; descripcion: string }[] = [
  { nombre: 'ver_personas',     modulo: 'personas',    descripcion: 'Ver lista y detalle de personas' },
  { nombre: 'crear_personas',   modulo: 'personas',    descripcion: 'Crear nuevas personas' },
  { nombre: 'editar_personas',  modulo: 'personas',    descripcion: 'Editar datos de personas' },
  { nombre: 'eliminar_personas',modulo: 'personas',    descripcion: 'Eliminar personas del sistema' },
  { nombre: 'ver_grupos',       modulo: 'grupos',      descripcion: 'Ver lista y detalle de grupos' },
  { nombre: 'crear_grupos',     modulo: 'grupos',      descripcion: 'Crear nuevos grupos' },
  { nombre: 'editar_grupos',    modulo: 'grupos',      descripcion: 'Editar información de grupos' },
  { nombre: 'gestionar_miembros',modulo: 'grupos',     descripcion: 'Agregar/quitar miembros de grupos' },
  { nombre: 'ver_eventos',      modulo: 'eventos',     descripcion: 'Ver eventos programados' },
  { nombre: 'crear_eventos',    modulo: 'eventos',     descripcion: 'Crear nuevos eventos' },
  { nombre: 'editar_eventos',   modulo: 'eventos',     descripcion: 'Editar eventos existentes' },
  { nombre: 'cancelar_eventos', modulo: 'eventos',     descripcion: 'Cancelar eventos' },
  { nombre: 'ver_asistencias',  modulo: 'asistencias', descripcion: 'Ver registros de asistencia' },
  { nombre: 'registrar_asistencias', modulo: 'asistencias', descripcion: 'Registrar asistencia a eventos' },
  { nombre: 'editar_asistencias',modulo: 'asistencias', descripcion: 'Editar registros de asistencia' },
  { nombre: 'ver_reportes',     modulo: 'reportes',    descripcion: 'Ver reportes del sistema' },
  { nombre: 'exportar_reportes',modulo: 'reportes',    descripcion: 'Exportar reportes a CSV/Excel' },
  { nombre: 'gestionar_usuarios',modulo: 'sistema',    descripcion: 'Crear y administrar usuarios' },
  { nombre: 'gestionar_roles',  modulo: 'sistema',     descripcion: 'Gestionar roles y permisos' },
  { nombre: 'ver_configuracion',modulo: 'sistema',     descripcion: 'Ver configuración del sistema' },
  { nombre: 'gestionar_configuracion', modulo: 'sistema', descripcion: 'Modificar configuración del sistema' },
]

const MODULO_LABELS: Record<string, string> = {
  personas:    'Personas',
  grupos:      'Grupos',
  eventos:     'Eventos',
  asistencias: 'Asistencias',
  reportes:    'Reportes',
  sistema:     'Sistema',
}

const MODULO_ORDER = ['personas', 'grupos', 'eventos', 'asistencias', 'reportes', 'sistema']

// ─── Modal: Nuevo / Editar Rol ────────────────────────────────────────────────

function RolModal({
  open,
  onClose,
  onSaved,
  rolEdit,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  rolEdit?: Rol | null
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (rolEdit) {
      setForm({ nombre: rolEdit.nombre, descripcion: rolEdit.descripcion ?? '' })
    } else {
      setForm({ nombre: '', descripcion: '' })
    }
    setError('')
  }, [rolEdit, open])

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    setError('')
    if (rolEdit) {
      const { error: err } = await supabase
        .from('roles')
        .update({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null })
        .eq('id', rolEdit.id)
      if (err) { setSaving(false); setError(err.message); return }
    } else {
      const { error: err } = await supabase
        .from('roles')
        .insert({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, activo: true })
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
          <DialogTitle>{rolEdit ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
          <DialogDescription>
            {rolEdit ? 'Modifica la información del rol' : 'Define un nuevo rol para el sistema'}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <Input
            label="Nombre del rol *"
            placeholder="Ej: Administrador, Líder, Secretaria..."
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Descripción del rol y sus responsabilidades..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
          </div>
          {error && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>
            {rolEdit ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Panel de permisos ────────────────────────────────────────────────────────

function PermisosPanel({
  rol,
  permisos,
  rolPermisos,
  onToggle,
}: {
  rol: Rol
  permisos: Permiso[]
  rolPermisos: Set<string>
  onToggle: (permisoId: string, checked: boolean) => Promise<void>
}) {
  const [toggling, setToggling] = useState<string | null>(null)

  const handleCheck = async (permisoId: string, checked: boolean) => {
    setToggling(permisoId)
    await onToggle(permisoId, checked)
    setToggling(null)
  }

  const grouped = MODULO_ORDER.reduce<Record<string, Permiso[]>>((acc, mod) => {
    const ps = permisos.filter(p => p.modulo === mod)
    if (ps.length) acc[mod] = ps
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-blue-700" />
        <div>
          <h2 className="text-base font-semibold text-gray-900">{rol.nombre}</h2>
          <p className="text-xs text-gray-500">{rol.descripcion ?? 'Sin descripción'}</p>
        </div>
        <Badge variant={rol.activo ? 'success' : 'secondary'} className="ml-auto">
          {rol.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {Object.entries(grouped).map(([modulo, ps]) => (
        <div key={modulo}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            {MODULO_LABELS[modulo] ?? modulo}
          </p>
          <div className="space-y-2">
            {ps.map(p => {
              const checked = rolPermisos.has(p.id)
              const isToggling = toggling === p.id
              return (
                <label
                  key={p.id}
                  className="flex items-start gap-3 cursor-pointer group rounded-lg p-2 hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={v => handleCheck(p.id, !!v)}
                    disabled={isToggling}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 font-mono">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.descripcion}</p>
                  </div>
                  {isToggling && (
                    <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent shrink-0" />
                  )}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const supabase = createClient()
  const [roles, setRoles] = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [rolPermisos, setRolPermisos] = useState<RolPermiso[]>([])
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null)
  const [usuariosPorRol, setUsuariosPorRol] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Seed de permisos si no existen
  const seedPermisos = async () => {
    const { data: existing } = await supabase.from('permisos').select('nombre')
    const existingNames = new Set((existing ?? []).map((p: { nombre: string }) => p.nombre))
    const toInsert = PERMISOS_SEED.filter(p => !existingNames.has(p.nombre))
    if (toInsert.length > 0) {
      await supabase.from('permisos').insert(toInsert)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    await seedPermisos()

    const [{ data: rolesData }, { data: permisosData }, { data: usersData }] = await Promise.all([
      supabase.from('roles').select('*').order('nombre'),
      supabase.from('permisos').select('*').order('modulo').order('nombre'),
      supabase.from('usuarios').select('rol_id').not('rol_id', 'is', null),
    ])

    setRoles(rolesData ?? [])
    setPermisos(permisosData ?? [])

    // Contar usuarios por rol
    const counts: Record<string, number> = {}
    for (const u of usersData ?? []) {
      if (u.rol_id) counts[u.rol_id] = (counts[u.rol_id] ?? 0) + 1
    }
    setUsuariosPorRol(counts)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const loadRolPermisos = useCallback(async (rolId: string) => {
    const { data } = await supabase
      .from('rol_permisos')
      .select('*')
      .eq('rol_id', rolId)
    setRolPermisos(data ?? [])
  }, [])

  const handleSelectRol = async (rol: Rol) => {
    setSelectedRol(rol)
    await loadRolPermisos(rol.id)
  }

  const handleTogglePermiso = async (permisoId: string, checked: boolean) => {
    if (!selectedRol) return
    if (checked) {
      const { data } = await supabase
        .from('rol_permisos')
        .insert({ rol_id: selectedRol.id, permiso_id: permisoId })
        .select()
        .single()
      if (data) setRolPermisos(prev => [...prev, data])
    } else {
      await supabase
        .from('rol_permisos')
        .delete()
        .eq('rol_id', selectedRol.id)
        .eq('permiso_id', permisoId)
      setRolPermisos(prev => prev.filter(rp => rp.permiso_id !== permisoId))
    }
  }

  const rolPermisosSet = new Set(rolPermisos.map(rp => rp.permiso_id))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles y Permisos"
        description="Gestiona los niveles de acceso del sistema"
        breadcrumbs={[{ label: 'Sistema' }, { label: 'Roles y Permisos' }]}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Nuevo rol
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Lista de roles */}
          <div className="lg:col-span-2 space-y-2">
            {roles.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-400 text-sm">
                  No hay roles. Crea el primero.
                </CardContent>
              </Card>
            ) : (
              roles.map(rol => (
                <button
                  key={rol.id}
                  onClick={() => handleSelectRol(rol)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selectedRol?.id === rol.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{rol.nombre}</p>
                      {rol.descripcion && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rol.descripcion}</p>
                      )}
                    </div>
                    <Badge variant={rol.activo ? 'success' : 'secondary'} className="shrink-0">
                      {rol.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Users size={11} />
                    <span>{usuariosPorRol[rol.id] ?? 0} usuario{(usuariosPorRol[rol.id] ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Panel de permisos */}
          <div className="lg:col-span-3">
            {selectedRol ? (
              <Card>
                <CardContent className="p-5">
                  <PermisosPanel
                    rol={selectedRol}
                    permisos={permisos}
                    rolPermisos={rolPermisosSet}
                    onToggle={handleTogglePermiso}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <ShieldCheck size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">Selecciona un rol para gestionar sus permisos</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <RolModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  )
}

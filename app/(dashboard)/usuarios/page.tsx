'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRelative } from '@/lib/utils'
import type { Usuario, Rol, Persona } from '@/types'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UserPlus,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsuarioRow extends Usuario {
  auth_email?: string
  persona?: Persona
  rol?: Rol
}

// ─── Modal: Editar Rol ────────────────────────────────────────────────────────

function EditarRolModal({
  usuario,
  roles,
  open,
  onClose,
  onSaved,
}: {
  usuario: UsuarioRow | null
  roles: Rol[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [rolId, setRolId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (usuario) setRolId(usuario.rol_id ?? '')
  }, [usuario])

  const handleSave = async () => {
    if (!usuario) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('usuarios')
      .update({ rol_id: rolId || null })
      .eq('id', usuario.id)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Editar rol</DialogTitle>
          <DialogDescription>
            Cambiar el rol asignado al usuario
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Rol</p>
            <Select value={rolId} onValueChange={setRolId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin rol asignado" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} loading={saving}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Nuevo Usuario ─────────────────────────────────────────────────────

function NuevoUsuarioModal({
  open,
  onClose,
  onCreated,
  roles,
  personas,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  roles: Rol[]
  personas: Persona[]
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    personaId: '',
    rolId: '',
  })
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const filteredPersonas = personas.filter(p => {
    const q = search.toLowerCase()
    return (
      p.nombres.toLowerCase().includes(q) ||
      p.apellidos.toLowerCase().includes(q) ||
      (p.correo ?? '').toLowerCase().includes(q)
    )
  })

  const handleCreate = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email y contraseña son requeridos')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        persona_id: form.personaId || null,
        rol_id: form.rolId || null,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setSaving(false)
      setError(result.error ?? 'Error al crear usuario')
      return
    }

    setSaving(false)
    setSuccess('Usuario creado exitosamente.')
    setTimeout(() => {
      onCreated()
      onClose()
      setForm({ email: '', password: '', personaId: '', rolId: '' })
      setSuccess('')
    }, 1000)
  }

  const handleClose = () => {
    setForm({ email: '', password: '', personaId: '', rolId: '' })
    setError('')
    setSuccess('')
    setSearch('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea una cuenta de acceso al sistema
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <Input
            label="Email *"
            type="email"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Contraseña temporal *"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            hint="Mínimo 8 caracteres"
          />

          {/* Persona asociada - buscable */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Persona asociada</p>
            <Input
              placeholder="Buscar persona..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={14} />}
            />
            <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, personaId: '' }))}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  form.personaId === '' ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                }`}
              >
                Sin persona asociada
              </button>
              {filteredPersonas.slice(0, 20).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, personaId: p.id })); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    form.personaId === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {p.nombres} {p.apellidos}
                  {p.correo && <span className="text-gray-400 ml-1 text-xs">({p.correo})</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Rol</p>
            <Select value={form.rolId} onValueChange={v => setForm(f => ({ ...f, rolId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sin rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="danger">
              <AlertCircle size={14} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleCreate} loading={saving}>
            <UserPlus size={15} />
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean; usuario: UsuarioRow | null }>({
    open: false,
    usuario: null,
  })
  const [toggling, setToggling] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: usuariosData }, { data: rolesData }, { data: personasData }] = await Promise.all([
      supabase
        .from('usuarios')
        .select(`
          *,
          persona:persona_id(id, nombres, apellidos, correo, tipo_persona),
          rol:rol_id(id, nombre, activo)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('roles').select('*').eq('activo', true).order('nombre'),
      supabase.from('personas').select('id, nombres, apellidos, correo, tipo_persona').is('deleted_at', null).order('nombres'),
    ])
    setUsuarios((usuariosData ?? []) as UsuarioRow[])
    setRoles(rolesData ?? [])
    setPersonas((personasData ?? []) as Persona[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleEstado = async (usuario: UsuarioRow) => {
    setToggling(usuario.id)
    await supabase
      .from('usuarios')
      .update({ estado: !usuario.estado })
      .eq('id', usuario.id)
    setUsuarios(prev =>
      prev.map(u => u.id === usuario.id ? { ...u, estado: !u.estado } : u)
    )
    setToggling(null)
  }

  const filtered = usuarios.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    const nombre = u.persona ? `${u.persona.nombres} ${u.persona.apellidos}`.toLowerCase() : ''
    const email = (u.auth_email ?? '').toLowerCase()
    return nombre.includes(q) || email.includes(q)
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        description="Gestión de cuentas de acceso al sistema"
        breadcrumbs={[{ label: 'Sistema' }, { label: 'Usuarios' }]}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus size={16} />
            Nuevo usuario
          </Button>
        }
      />

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search size={14} />}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email / Persona</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Último acceso</TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-400">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-400">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 text-xs font-mono">{u.id.slice(0, 8)}...</p>
                        {u.persona && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {u.persona.nombres} {u.persona.apellidos}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.rol ? (
                        <Badge variant="info">{u.rol.nombre}</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin rol</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.estado ? 'success' : 'secondary'}>
                        {u.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-xs">
                      {formatRelative(u.ultimo_acceso)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={u.estado ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggleEstado(u)}
                          loading={toggling === u.id}
                        >
                          {u.estado ? (
                            <ToggleRight size={16} className="text-green-600" />
                          ) : (
                            <ToggleLeft size={16} className="text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar rol"
                          onClick={() => setEditModal({ open: true, usuario: u })}
                        >
                          <Pencil size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nuevo */}
      <NuevoUsuarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadData}
        roles={roles}
        personas={personas}
      />

      {/* Modal editar rol */}
      <EditarRolModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, usuario: null })}
        onSaved={loadData}
        usuario={editModal.usuario}
        roles={roles}
      />
    </div>
  )
}

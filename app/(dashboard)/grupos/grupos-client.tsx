'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Grupo, Red } from '@/types'

interface GrupoRow extends Grupo {
  miembros_count: number
}

interface Props {
  grupos: GrupoRow[]
  redes: Pick<Red, 'id' | 'nombre'>[]
}

const DIA_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export default function GruposClient({ grupos, redes }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [redFilter, setRedFilter] = useState('all')
  const [estadoFilter, setEstadoFilter] = useState('all')

  const filtered = useMemo(() => {
    return grupos.filter((g) => {
      const matchSearch =
        !search ||
        g.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (g.lider && `${g.lider.nombres} ${g.lider.apellidos}`.toLowerCase().includes(search.toLowerCase()))
      const matchRed = redFilter === 'all' || g.red_id === redFilter
      const matchEstado =
        estadoFilter === 'all' ||
        (estadoFilter === 'activo' && g.estado) ||
        (estadoFilter === 'inactivo' && !g.estado)
      return matchSearch && matchRed && matchEstado
    })
  }, [grupos, search, redFilter, estadoFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los grupos de la iglesia</p>
        </div>
        <Button onClick={() => router.push('/grupos/nuevo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo grupo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o líder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={redFilter} onValueChange={setRedFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por red" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las redes</SelectItem>
            {redes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Líder</TableHead>
              <TableHead>Red</TableHead>
              <TableHead>Día reunión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Miembros</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                  No se encontraron grupos con los filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((g) => (
                <TableRow key={g.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <Link
                      href={`/grupos/${g.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {g.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {g.lider ? `${g.lider.nombres} ${g.lider.apellidos}` : '—'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {g.red ? g.red.nombre : <span className="text-gray-400 text-xs">Sin red</span>}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {g.dia_reunion ? DIA_LABELS[g.dia_reunion] ?? g.dia_reunion : '—'}
                    {g.hora_reunion && (
                      <span className="ml-1 text-gray-400 text-xs">
                        {g.hora_reunion.slice(0, 5)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={g.estado ? 'success' : 'inactivo'}>
                      {g.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-gray-700 font-medium">
                    {g.miembros_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Ver detalle"
                      >
                        <Link href={`/grupos/${g.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Editar"
                      >
                        <Link href={`/grupos/${g.id}/editar`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {filtered.length} {filtered.length === 1 ? 'grupo' : 'grupos'}
        </p>
      )}
    </div>
  )
}

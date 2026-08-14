"use client";

import { formatRelative } from "@/lib/utils";
import type { Usuario, Rol, Persona } from "@/types";
import { useUsuarios } from "../hooks/use-usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserPlus,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  KeyRound,
} from "lucide-react";
import { NuevoUsuarioModal } from "./nuevo-usuario-modal";
import { EditarRolModal } from "./editar-rol-modal";
import { CambiarPasswordModal } from "./cambiar-password-modal";

interface UsuarioRow extends Usuario {
  auth_email?: string;
  persona?: Persona;
  rol?: Rol;
}

const PER_PAGE = 10;

export function UsuariosClient() {
  const {
    usuarios,
    roles,
    personas,
    loading,
    search,
    page,
    setPage,
    totalCount,
    isSuperAdminUser,
    modalOpen,
    setModalOpen,
    editModal,
    setEditModal,
    toggling,
    resetModal,
    setResetModal,
    loadData,
    handleSearchChange,
    handleToggleEstado,
    handleOpenResetPassword,
    totalPages,
    fromIndex,
    toIndex,
  } = useUsuarios();

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        {/* Search */}
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            leftIcon={<Search size={14} />}
            autoComplete="off"
          />
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus size={16} />
          Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead className="hidden sm:table-cell">Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">
                  Último acceso
                </TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-gray-400"
                  >
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-gray-400"
                  >
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.persona ? (
                        <p className="font-medium text-gray-900 text-sm">
                          {u.persona.nombres} {u.persona.apellidos}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Sin persona asociada
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-gray-500 font-mono">
                      {u.persona?.correo ||
                        u.auth_email || (
                          <span className="text-gray-300">—</span>
                        )}
                    </TableCell>
                    <TableCell>
                      {u.rol ? (
                        <Badge variant="info">{u.rol.nombre}</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin rol</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.estado ? "success" : "secondary"}>
                        {u.estado ? "Activo" : "Inactivo"}
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
                          title={u.estado ? "Desactivar" : "Activar"}
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Cambiar contraseña"
                          onClick={() => handleOpenResetPassword(u)}
                        >
                          <KeyRound size={14} />
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

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500 pt-1">
          <p className="text-xs sm:text-sm">
            Mostrando <span className="font-medium text-gray-900">{fromIndex}</span> a{" "}
            <span className="font-medium text-gray-900">{toIndex}</span> de{" "}
            <span className="font-medium text-gray-900">{totalCount}</span> usuarios
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm mr-1">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal nuevo */}
      <NuevoUsuarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadData}
        roles={roles}
        personas={personas}
        isSuperAdminUser={isSuperAdminUser}
      />

      {/* Modal editar rol */}
      <EditarRolModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, usuario: null })}
        onSaved={loadData}
        usuario={editModal.usuario}
        roles={roles}
        isSuperAdminUser={isSuperAdminUser}
      />

      {/* Modal cambiar/reset password */}
      <CambiarPasswordModal
        open={resetModal.open}
        onClose={() => setResetModal({ open: false, usuario: null })}
        usuario={resetModal.usuario}
      />
    </div>
  );
}

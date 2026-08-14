"use client";

import { useConfiguracionEstados } from '../hooks/use-configuracion-estados'
import { useState, useEffect } from "react"
import type { EstadoPersona } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, AlertCircle } from "lucide-react";
import { COLOR_OPTIONS, ESTADOS_SEED } from "./constants";

interface EstadoModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  estadoEdit?: EstadoPersona | null;
  form: {
    nombre: string;
    descripcion: string;
    color: string;
    orden: number;
    activo: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    nombre: string;
    descripcion: string;
    color: string;
    orden: number;
    activo: boolean;
  }>>;
  saving: boolean;
  error: string;
  resetForm: (estadoEdit: EstadoPersona | null) => void;
  handleSaveEstado: (estadoEdit: EstadoPersona | null, onSaved: () => void, onClose: () => void) => Promise<void>;
}

function EstadoModal({
  open,
  onClose,
  onSaved,
  estadoEdit,
  form,
  setForm,
  saving,
  error,
  resetForm,
  handleSaveEstado,
}: EstadoModalProps) {
  useEffect(() => {
    resetForm(estadoEdit ?? null);
  }, [estadoEdit, open, resetForm]);

  const handleSave = () => {
    handleSaveEstado(estadoEdit ?? null, onSaved, onClose);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {estadoEdit ? "Editar estado" : "Nuevo estado"}
          </DialogTitle>
          <DialogDescription>
            Define los estados posibles de una persona
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <Input
            label="Nombre *"
            placeholder="Ej: Asistente, Miembro..."
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <Input
            label="Descripción"
            placeholder="Descripción breve"
            value={form.descripcion}
            onChange={(e) =>
              setForm((f) => ({ ...f, descripcion: e.target.value }))
            }
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                   key={c.value}
                   type="button"
                   onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                     form.color === c.value
                       ? "border-gray-900 shadow-sm"
                       : "border-gray-200 hover:border-gray-400"
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
            onChange={(e) =>
              setForm((f) => ({ ...f, orden: parseInt(e.target.value) || 1 }))
            }
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.activo}
              onCheckedChange={(v) => setForm((f) => ({ ...f, activo: !!v }))}
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {estadoEdit ? "Guardar" : "Crear estado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TabEstados() {
  const {
    estados,
    loading,
    modal,
    setModal,
    loadEstados,
    handleOrdenChange,
    form,
    setForm,
    saving,
    error,
    resetForm,
    handleSaveEstado,
  } = useConfiguracionEstados();

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Configura los estados que puede tener una persona en la iglesia.
        </p>
        <Button size="sm" onClick={() => setModal({ open: true, edit: null })}>
          <Plus size={14} />
          Nuevo estado
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Cargando...
            </div>
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
                {estados.map((est) => {
                  const colorDef = COLOR_OPTIONS.find(
                    (c) => c.value === est.color,
                  );
                  return (
                    <TableRow key={est.id}>
                      <TableCell className="font-medium">{est.nombre}</TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {est.descripcion ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-3 w-3 rounded-full ${colorDef?.className ?? "bg-gray-300"}`}
                          />
                          <span className="text-xs text-gray-500">
                            {colorDef?.label ?? est.color}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-16 h-7 text-xs"
                          value={est.orden}
                          onChange={(e) =>
                            handleOrdenChange(
                              est.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={est.activo ? "success" : "secondary"}>
                          {est.activo ? "Sí" : "No"}
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
                  );
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
        form={form}
        setForm={setForm}
        saving={saving}
        error={error}
        resetForm={resetForm}
        handleSaveEstado={handleSaveEstado}
      />
    </div>
  );
}

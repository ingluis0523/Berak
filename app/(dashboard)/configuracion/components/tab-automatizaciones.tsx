"use client";

import { useConfiguracionAutomatizaciones } from '../hooks/use-configuracion-automatizaciones'
import { useState, useEffect } from "react"
import type { EstadoPersona, ReglaAutomatizacion, TipoRegla } from "@/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, AlertCircle, Zap, Trash2 } from "lucide-react";
import { REGLAS_SEED, TIPO_REGLA_OPTIONS } from "./constants";

interface ReglaModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  reglaEdit?: ReglaAutomatizacion | null;
  estados: EstadoPersona[];
  form: {
    nombre: string;
    tipo: TipoRegla | "";
    condicion_valor: string;
    estado_resultado_id: string;
    activo: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    nombre: string;
    tipo: TipoRegla | "";
    condicion_valor: string;
    estado_resultado_id: string;
    activo: boolean;
  }>>;
  saving: boolean;
  error: string;
  resetForm: (reglaEdit: ReglaAutomatizacion | null) => void;
  handleTipoChange: (tipo: TipoRegla) => void;
  handleSaveRegla: (reglaEdit: ReglaAutomatizacion | null, onSaved: () => void, onClose: () => void) => Promise<void>;
}

function ReglaModal({
  open,
  onClose,
  onSaved,
  reglaEdit,
  estados,
  form,
  setForm,
  saving,
  error,
  resetForm,
  handleTipoChange,
  handleSaveRegla,
}: ReglaModalProps) {
  useEffect(() => {
    resetForm(reglaEdit ?? null);
  }, [reglaEdit, open, resetForm]);

  const handleSave = () => {
    handleSaveRegla(reglaEdit ?? null, onSaved, onClose);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {reglaEdit ? "Editar regla" : "Nueva regla"}
          </DialogTitle>
          <DialogDescription>Define una regla de automatización</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Tipo *</p>
            <Select
              value={form.tipo}
              onValueChange={(v) => handleTipoChange(v as TipoRegla)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {TIPO_REGLA_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          {form.tipo !== "ingreso_ministerio" && (
            <Input
              label="Valor de condición"
              type="number"
              hint="Número de veces/días que se evalúa"
              value={form.condicion_valor}
              onChange={(e) =>
                setForm((f) => ({ ...f, condicion_valor: e.target.value }))
              }
            />
          )}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">
              Cambiar a estado
            </p>
            <Select
              value={form.estado_resultado_id}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, estado_resultado_id: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.activo}
              onCheckedChange={(v) => setForm((f) => ({ ...f, activo: !!v }))}
            />
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {reglaEdit ? "Guardar" : "Crear regla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TabAutomatizaciones() {
  const {
    reglas,
    estados,
    loading,
    toggling,
    deleting,
    modal,
    setModal,
    loadData,
    handleToggle,
    handleDelete,
    form,
    setForm,
    saving,
    error,
    resetForm,
    handleTipoChange,
    handleSaveRegla,
  } = useConfiguracionAutomatizaciones();

  const TIPO_LABELS: Record<string, string> = {
    ausencias_consecutivas: "Ausencias consecutivas",
    dias_sin_asistir: "Días sin asistir",
    asistencias_acumuladas: "Asistencias acumuladas",
    ingreso_ministerio: "Ingreso a ministerio",
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Reglas que cambian automáticamente el estado de las personas.
        </p>
        <Button size="sm" onClick={() => setModal({ open: true, edit: null })}>
          <Plus size={14} />
          Nueva regla
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {reglas.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${r.activo ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}
                >
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">
                      {r.nombre}
                    </p>
                    <Badge
                      variant={r.activo ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {r.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TIPO_LABELS[r.tipo]}
                    {r.condicion_valor != null &&
                      ` • Valor: ${r.condicion_valor}`}
                    {r.estado_resultado &&
                      ` • → ${(r.estado_resultado as EstadoPersona).nombre}`}
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
                    variant={r.activo ? "danger-outline" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(r)}
                    loading={toggling === r.id}
                  >
                    {r.activo ? "Desactivar" : "Activar"}
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
            <div className="text-center py-8 text-gray-400 text-sm">
              Sin reglas configuradas.
            </div>
          )}
        </div>
      )}

      <ReglaModal
        open={modal.open}
        onClose={() => setModal({ open: false, edit: null })}
        onSaved={loadData}
        reglaEdit={modal.edit}
        estados={estados}
        form={form}
        setForm={setForm}
        saving={saving}
        error={error}
        resetForm={resetForm}
        handleTipoChange={handleTipoChange}
        handleSaveRegla={handleSaveRegla}
      />
    </div>
  );
}

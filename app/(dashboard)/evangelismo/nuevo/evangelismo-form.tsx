"use client";

import { useEvangelismoForm } from '../hooks/use-evangelismo-form'
import type { PersonaBasic } from '../hooks/use-evangelismo-form'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, X, UserPlus, Check, AlertCircle } from "lucide-react";

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// ── Persona Search Field ──────────────────────────────────────────────────────

function PersonaSearchField({
  label,
  placeholder,
  selected,
  onSelect,
}: {
  label: string;
  placeholder: string;
  selected: PersonaBasic | null;
  onSelect: (p: PersonaBasic | null) => void;
}) {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PersonaBasic[]>([]);

  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("personas")
        .select("id, nombres, apellidos, correo, telefono")
        .or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%`)
        .is("deleted_at", null)
        .limit(8);
      setResults((data ?? []) as PersonaBasic[]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-sm font-medium text-blue-900">
            {selected.nombres} {selected.apellidos}
          </span>
          <button
            onClick={() => onSelect(null)}
            className="text-blue-400 hover:text-blue-700"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    onSelect(p);
                    setSearch("");
                    setResults([]);
                  }}
                >
                  <span className="font-medium">
                    {p.nombres} {p.apellidos}
                  </span>
                  {p.correo && (
                    <span className="text-xs text-gray-400 truncate ml-2">
                      {p.correo}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function EvangelismoForm() {
  const {
    personaMode,
    setPersonaMode,
    selectedPersona,
    setSelectedPersona,
    nuevaPersona,
    setNuevaPersona,
    personaSearch,
    setPersonaSearch,
    personaResults,
    selectedEv,
    setSelectedEv,
    selectedEnc,
    setSelectedEnc,
    fecha,
    setFecha,
    lugar,
    setLugar,
    notas,
    setNotas,
    saving,
    error,
    handleSubmit,
    goBack,
  } = useEvangelismoForm();

  return (
    <div className="space-y-5">
      {/* Persona evangelizada */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Persona evangelizada</h2>

          <div className="flex gap-2">
            <Button
              variant={personaMode === "buscar" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPersonaMode("buscar");
                setSelectedPersona(null);
              }}
            >
              <Search size={13} />
              Buscar existente
            </Button>
            <Button
              variant={personaMode === "nueva" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPersonaMode("nueva");
                setSelectedPersona(null);
              }}
            >
              <UserPlus size={13} />
              Nueva persona
            </Button>
          </div>

          {personaMode === "buscar" ? (
            selectedPersona ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedPersona.nombres} {selectedPersona.apellidos}
                  </p>
                  {selectedPersona.correo && (
                    <p className="text-xs text-blue-600">
                      {selectedPersona.correo}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPersona(null)}
                  className="text-blue-400 hover:text-blue-700 ml-3"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Buscar persona por nombre..."
                  value={personaSearch}
                  onChange={(e) => setPersonaSearch(e.target.value)}
                  leftIcon={<Search size={14} />}
                />
                {personaResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {personaResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => {
                          setSelectedPersona(p);
                          setPersonaSearch("");
                          setPersonaResults([]);
                        }}
                      >
                        <span className="font-medium">
                          {p.nombres} {p.apellidos}
                        </span>
                        {p.correo && (
                          <span className="text-xs text-gray-400 truncate ml-2">
                            {p.correo}
                          </span>
                        )}
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
                onChange={(e) =>
                  setNuevaPersona((p) => ({ ...p, nombres: e.target.value }))
                }
              />
              <Input
                label="Apellidos *"
                value={nuevaPersona.apellidos}
                onChange={(e) =>
                  setNuevaPersona((p) => ({ ...p, apellidos: e.target.value }))
                }
              />
              <Input
                label="Correo"
                type="email"
                value={nuevaPersona.correo}
                onChange={(e) =>
                  setNuevaPersona((p) => ({ ...p, correo: e.target.value }))
                }
              />
              <Input
                label="Teléfono"
                value={nuevaPersona.telefono}
                onChange={(e) =>
                  setNuevaPersona((p) => ({ ...p, telefono: e.target.value }))
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsables */}
      <Card>
        <CardContent className="p-4 space-y-4">
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
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Detalles del evangelismo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de evangelismo *"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <Input
              label="Lugar"
              placeholder="Parque, hogar, reunión..."
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas iniciales
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Contexto, impresiones, observaciones iniciales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
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
        <Button variant="outline" onClick={goBack}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

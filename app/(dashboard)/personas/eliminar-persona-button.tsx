'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface Props {
  personaId: string
  personaNombre: string
  variant?: 'icon' | 'button'
  redirectTo?: string
}

export function EliminarPersonaButton({
  personaId,
  personaNombre,
  variant = 'icon',
  redirectTo,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al eliminar persona')
        setLoading(false)
        return
      }

      setLoading(false)
      setOpen(false)

      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch {
      setError('Error de conexión al eliminar la persona')
      setLoading(false)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          title="Eliminar persona (Superadmin)"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={15} />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={14} />
          Eliminar persona
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Eliminar persona</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{personaNombre}</strong> del sistema?
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-3">
            <p className="text-xs text-gray-500">
              Esta acción solo está disponible para el <strong>Superadministrador</strong>. La persona será ocultada de todas las listas, grupos y reportes.
            </p>

            {error && (
              <Alert variant="danger">
                <AlertCircle size={14} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              loading={loading}
              onClick={handleDelete}
            >
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

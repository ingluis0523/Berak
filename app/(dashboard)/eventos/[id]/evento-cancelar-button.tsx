'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { XCircle } from 'lucide-react'

export function EventoCancelarButton({ eventoId }: { eventoId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCancelar() {
    setLoading(true)
    await supabase
      .from('eventos')
      .update({ estado: 'cancelado' })
      .eq('id', eventoId)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <XCircle size={15} />
        Cancelar evento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancelar evento</DialogTitle>
            <DialogDescription>
              Esta acción marcará el evento como cancelado. ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              No, volver
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              loading={loading}
              onClick={handleCancelar}
            >
              Sí, cancelar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

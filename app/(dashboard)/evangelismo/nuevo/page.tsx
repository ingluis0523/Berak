import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { EvangelismoForm } from './evangelismo-form'

export const metadata: Metadata = { title: 'Registrar Evangelismo' }

export default function NuevoEvangelismoPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/evangelismo" className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} />
            Evangelismo
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Registrar evangelismo</h1>
        <p className="text-sm text-gray-500">Registra a una persona evangelizada y asigna seguimiento</p>
      </div>
      <EvangelismoForm />
    </div>
  )
}

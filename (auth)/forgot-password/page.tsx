'use client'

import { useForgotPassword } from './hooks/use-forgot-password'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const {
    sent,
    error,
    loading,
    register,
    handleSubmit,
    errors,
  } = useForgotPassword();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#F0F4F8]">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo variant="full" size="lg" />
        </div>

        <div className="bg-white rounded-[var(--radius-xl)] shadow-sm border border-gray-200 p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Correo enviado</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
                </p>
              </div>
              <Link href="/login" className="text-sm text-primary-600 hover:underline font-medium">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
                </p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="correo@iglesia.com"
                  leftIcon={<Mail size={16} />}
                  error={errors.email?.message}
                  autoComplete="email"
                  {...register('email')}
                />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                  Enviar instrucciones
                </Button>
              </form>
            </>
          )}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 mt-5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}

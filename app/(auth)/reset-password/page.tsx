'use client'

import { useResetPassword } from './hooks/use-reset-password'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const {
    show1,
    setShow1,
    show2,
    setShow2,
    error,
    loading,
    register,
    handleSubmit,
    errors,
  } = useResetPassword();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#F0F4F8]">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo variant="full" size="lg" />
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
            <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura para tu cuenta.</p>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nueva contraseña"
              type={show1 ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShow1(v => !v)} tabIndex={-1} className="text-gray-400 hover:text-gray-600">
                  {show1 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmar contraseña"
              type={show2 ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShow2(v => !v)} tabIndex={-1} className="text-gray-400 hover:text-gray-600">
                  {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              Guardar contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

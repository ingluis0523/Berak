'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
  email:    z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })
    setLoading(false)
    if (authError) {
      setError('Correo o contraseña incorrectos.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – decorative */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1B4F72 60%, #2E86C1 100%)' }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #D4AC0D 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 40%)`,
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <Logo variant="full" size="xl" light />
          <div className="max-w-xs">
            <h2 className="text-2xl font-bold text-white mb-3">
              Bienvenido a Berak
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Plataforma de gestión integral para IglesiaJCReina.
            </p>
          </div>
          <div className="flex gap-6 text-white/60 text-xs">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">∞</div>
              <div>Personas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">+</div>
              <div>Grupos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">★</div>
              <div>Eventos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-[#F0F4F8]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo variant="full" size="lg" />
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
              <p className="text-sm text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="correo@iglesia.com"
                leftIcon={<Mail size={16} />}
                error={errors.email?.message}
                autoComplete="email"
                {...register('email')}
              />

              <div className="flex flex-col gap-1.5">
                <Input
                  label="Contraseña"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  error={errors.password?.message}
                  autoComplete="current-password"
                  {...register('password')}
                />
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
                Ingresar
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} IglesiaJCReina · Plataforma Berak
          </p>
        </div>
      </div>
    </div>
  )
}

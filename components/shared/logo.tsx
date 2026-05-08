import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'full' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Si es true, usa la versión blanca/clara para fondos oscuros */
  light?: boolean
}

const sizeMap = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-2xl' },
  xl: { icon: 64, text: 'text-3xl' },
}

export function Logo({ variant = 'full', size = 'md', className, light = false }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size]

  const textColor = light ? 'text-white' : 'text-primary-800'
  const subColor  = light ? 'text-white/70' : 'text-primary-500'

  const hasLogoFile = true // Cambia a true y coloca el logo en /public/logo.png

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      {/* Logo image or fallback icon */}
      {hasLogoFile ? (
        <Image
          src="/logo.png"
          alt="Berak"
          width={iconSize}
          height={iconSize}
          className="object-contain"
          priority
        />
      ) : (
        <LogoFallback size={iconSize} light={light} />
      )}

      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-wide', textSize, textColor)}>
            BERAK
          </span>
          {variant === 'full' && size !== 'sm' && (
            <span className={cn('text-xs font-normal tracking-wider uppercase', subColor)}>
              IglesiaJCReina
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function LogoFallback({ size, light }: { size: number; light: boolean }) {
  const bg    = light ? 'rgba(255,255,255,0.15)' : '#1B4F72'
  const fg    = '#FFFFFF'
  const gold  = '#D4AC0D'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: '10px', flexShrink: 0 }}
    >
      <rect width="40" height="40" rx="10" fill={bg} />
      {/* Cross simplified */}
      <rect x="18" y="8" width="4" height="24" rx="2" fill={fg} />
      <rect x="10" y="15" width="20" height="4" rx="2" fill={gold} />
    </svg>
  )
}

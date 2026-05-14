'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Network,
  UsersRound,
  Church,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/shared/logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  section?: string
  /** If set, item is only visible when canSeeModule(module) returns true */
  module?: string
  /** If true, only admins can see this item regardless of permissions */
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',     icon: LayoutDashboard, section: 'principal' },
  { label: 'Personas',     href: '/personas',      icon: Users,           section: 'iglesia',   module: 'personas' },
  { label: 'Redes',        href: '/redes',         icon: Network,         section: 'iglesia',   module: 'redes' },
  { label: 'Grupos',       href: '/grupos',        icon: UsersRound,      section: 'iglesia',   module: 'grupos' },
  { label: 'Ministerios',  href: '/ministerios',   icon: Church,          section: 'iglesia',   module: 'ministerios' },
  { label: 'Eventos',      href: '/eventos',       icon: CalendarDays,    section: 'operativo', module: 'eventos' },
  { label: 'Asistencias',  href: '/asistencias',   icon: ClipboardCheck,  section: 'operativo', module: 'asistencias' },
  { label: 'Reportes',     href: '/reportes',      icon: BarChart3,       section: 'reportes',  module: 'reportes' },
  { label: 'Usuarios',     href: '/usuarios',      icon: BookOpen,        section: 'sistema',   module: 'usuarios' },
  { label: 'Roles',        href: '/roles',         icon: ShieldCheck,     section: 'sistema',   module: 'roles' },
  { label: 'Configuración',href: '/configuracion', icon: Settings,        section: 'sistema',   adminOnly: true },
]

const SECTION_LABELS: Record<string, string> = {
  principal: 'Principal',
  iglesia:   'Iglesia',
  operativo: 'Operativo',
  reportes:  'Reportes',
  sistema:   'Sistema',
}

interface SidebarProps {
  isAdmin: boolean
  permisos: string[]
}

export function Sidebar({ isAdmin, permisos }: SidebarProps) {
  const canSeeModule = (module: string): boolean => {
    if (isAdmin) return true
    if (permisos.length === 0) return true
    return permisos.some(
      (p) => p === `${module}_leer` || p === `${module}_escribir` || p === `${module}.*` || p === '*'
    )
  }
  const pathname  = usePathname()
  const router    = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = NAV_ITEMS.filter((i) => {
    if (i.adminOnly) return isAdmin
    if (i.module) return canSeeModule(i.module)
    return true
  })

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sections = [...new Set(visibleItems.map(i => i.section!))]

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0',
        'bg-sidebar border-r border-sidebar-border',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border',
        collapsed ? 'justify-center p-3' : 'px-4 py-4'
      )}>
        <Logo
          variant={collapsed ? 'icon' : 'full'}
          size={collapsed ? 'sm' : 'md'}
          light
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map(section => {
          const items = visibleItems.filter(i => i.section === section)
          return (
            <div key={section} className="mb-4">
              {!collapsed && (
                <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted">
                  {SECTION_LABELS[section]}
                </p>
              )}
              {items.map(item => {
                const Icon   = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center',
                      active
                        ? 'bg-sidebar-active text-white'
                        : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-white'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 flex flex-col gap-1">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium text-sidebar-fg',
            'hover:bg-red-900/40 hover:text-red-300 transition-colors w-full',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

        {/* Toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'flex items-center justify-center rounded-[var(--radius-md)] p-1.5 text-sidebar-muted',
            'hover:bg-sidebar-hover hover:text-white transition-colors w-full'
          )}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}

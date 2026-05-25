'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Target,
  ShieldAlert,
  ClipboardList,
  ShieldCheck,
  Gavel,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  FileCheck,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  roles?: string[]
  excludeRoles?: string[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/strategic/objectives', label: 'Strategic', icon: Target },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
  {
    href: '/risk/kris',
    label: 'KRIs',
    icon: TrendingUp,
    roles: ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member', 'dept-head'],
  },
  {
    href: '/compliance',
    label: 'Compliance',
    icon: ClipboardList,
    excludeRoles: ['dept-head'],
  },
  {
    href: '/audit',
    label: 'Audit',
    icon: ShieldCheck,
    excludeRoles: ['board-member'],
  },
  {
    href: '/audit/kcis',
    label: 'KCIs',
    icon: TrendingUp,
    roles: ['admin', 'ceo', 'risk-officer', 'audit-officer', 'board-member'],
  },
  {
    href: '/audit/plans',
    label: 'Audit Plans',
    icon: ClipboardList,
    roles: ['admin', 'ceo', 'audit-officer', 'risk-officer', 'compliance-officer', 'board-member', 'dept-head'],
  },
  {
    href: '/board',
    label: 'Board',
    icon: Gavel,
    roles: ['admin', 'ceo', 'board-member', 'board-secretary', 'audit-officer', 'risk-officer'],
  },
  {
    href: '/incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    excludeRoles: ['board-member'],
  },
  {
    href: '/esg',
    label: 'ESG',
    icon: BarChart3,
    excludeRoles: ['dept-head'],
  },
  {
    href: '/qms',
    label: 'QMS',
    icon: FileCheck,
    excludeRoles: ['dept-head'],
  },
  { href: '/admin/users', label: 'Admin', icon: Settings, roles: ['admin'] },
]

interface SidebarLayoutProps {
  activeRole: string
  children: React.ReactNode
  notificationBell?: React.ReactNode
}

export function SidebarLayout({ activeRole, children, notificationBell }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(activeRole)) return false
    if (item.excludeRoles && item.excludeRoles.includes(activeRole)) return false
    return true
  })

  return (
    <div className="min-h-screen bg-paper">
      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 h-full bg-surface border-r border-paper-border flex flex-col py-6 shadow-card z-10 transition-all duration-300 ${
          collapsed ? 'w-16 px-2' : 'w-[220px] px-4'
        }`}
      >
        {/* Logo + collapse toggle */}
        <div
          className={`mb-8 flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <span className="font-heading text-[18px] font-bold text-navy-950 truncate">
              GRC-Nexus
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-[6px] text-navy-mid hover:bg-paper-border transition-colors flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 flex-1">
          {visibleItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`py-2 rounded-[6px] text-[14px] font-medium text-navy-900 hover:bg-paper transition-colors flex items-center gap-2 ${
                collapsed ? 'px-2 justify-center' : 'px-3'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </div>

        {/* Theme toggle — pinned to bottom */}
        <div className={`mt-4 pt-4 border-t border-paper-border ${collapsed ? 'flex justify-center' : ''}`}>
          <ThemeToggle collapsed={collapsed} />
        </div>
      </nav>

      {/* Main content — offset by sidebar width */}
      <main
        className={`max-w-[1200px] px-8 pt-8 pb-12 transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-[220px]'
        }`}
      >
        {/* Top-right header bar */}
        {notificationBell && (
          <div className="flex justify-end mb-4">
            {notificationBell}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

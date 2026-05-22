'use client'
// app/(protected)/role-select/RoleSelectForm.tsx
// Per UI-SPEC Screen 2: Each role as a clickable card row.
import { useState, useTransition } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { selectRole, signOut } from '@/lib/auth/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROLE_DESCRIPTIONS } from '@/types/auth'
import type { AppRole } from '@/types/auth'
import { toast } from 'sonner'

const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  'admin': 'bg-navy-900 text-white border-navy-900',
  'board-member': 'bg-gold text-navy-950 border-gold',
  'ceo': 'bg-purple-700 text-white border-purple-700',
  'risk-officer': 'bg-orange-500 text-white border-orange-500',
  'audit-officer': 'bg-blue-700 text-white border-blue-700',
  'dept-head': 'bg-green-700 text-white border-green-700',
}

const ROLE_LABELS: Record<AppRole, string> = {
  'admin': 'Administrator',
  'board-member': 'Board Member',
  'ceo': 'Chief Executive Officer',
  'risk-officer': 'Risk Officer',
  'audit-officer': 'Audit Officer',
  'dept-head': 'Department Head',
}

interface RoleSelectFormProps {
  roles: AppRole[]
  activeRole?: AppRole
}

export function RoleSelectForm({ roles, activeRole }: RoleSelectFormProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRoleSelect(role: AppRole) {
    if (isPending) return
    setSelectedRole(role)
    startTransition(async () => {
      const result = await selectRole(role)
      if (result?.error) {
        toast.error(result.error)
        setSelectedRole(null)
      }
      // On success, selectRole calls redirect() — this component unmounts
    })
  }

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-navy-900 mb-4 font-body">
        Your assigned roles
      </h2>

      <div className="space-y-2">
        {roles.map((role) => {
          const isLoading = isPending && selectedRole === role
          const badgeColor = ROLE_BADGE_COLORS[role]

          return (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleSelect(role)}
              disabled={isPending}
              className="w-full flex items-center gap-4 p-4 rounded-[8px] border border-paper-border bg-paper hover:bg-white hover:border-navy-mid/40 hover:shadow-card transition-all duration-150 text-left disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={`Select role: ${ROLE_LABELS[role]}`}
            >
              {/* Role badge */}
              <Badge
                className={`text-[11px] font-semibold px-2 py-0.5 border shrink-0 ${badgeColor}`}
              >
                {role}
              </Badge>

              {/* Role details */}
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-medium text-navy-900 font-body leading-tight">
                  {ROLE_LABELS[role]}
                </p>
                <p className="text-[13px] text-navy-mid font-body mt-0.5 leading-tight">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>

              {/* Chevron or loader */}
              {isLoading ? (
                <Loader2 className="h-4 w-4 text-navy-mid shrink-0 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-navy-mid shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Sign out footer */}
      <div className="mt-6 pt-4 border-t border-paper-border text-center">
        <button
          type="button"
          onClick={() => startTransition(() => signOut())}
          disabled={isPending}
          className="text-[13px] text-navy-mid hover:text-navy-900 underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

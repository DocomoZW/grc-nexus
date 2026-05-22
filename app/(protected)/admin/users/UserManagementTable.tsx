'use client'
// UserManagementTable.tsx — Client Component
// Per UI-SPEC Screen 5: filterable user table with approval, rejection, suspension flows.
import { useState, useTransition } from 'react'
import { MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { approveUser, rejectUser, suspendUser, reactivateUser } from '@/lib/auth/admin-actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  status: 'pending' | 'approved' | 'suspended'
  active_role: string | null
  created_at: string
  user_roles: { role_name: string }[]
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gold-pale text-navy-950 border-gold/40' },
  approved: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-300/40' },
  suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-600 border-gray-300' },
}

const ROLE_OPTIONS = [
  'admin', 'board-member', 'ceo', 'risk-officer', 'audit-officer', 'dept-head'
] as const

function getInitials(firstName: string | null, lastName: string | null, email: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  return email[0].toUpperCase()
}

export function UserManagementTable({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [rejectDialog, setRejectDialog] = useState<UserRow | null>(null)
  const [suspendDialog, setSuspendDialog] = useState<UserRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = users.filter((u) => {
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''} ${u.email}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    if (roleFilter !== 'all' && !u.user_roles.some(r => r.role_name === roleFilter)) return false
    return true
  })

  function handleApprove(userId: string, role: string) {
    startTransition(async () => {
      const result = await approveUser(userId, role)
      if (result?.error) {
        toast.error(result.error)
      } else {
        const user = users.find(u => u.id === userId)
        const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email
        toast.success(`${name} has been approved.`)
        setApprovingUserId(null)
        setSelectedRole('')
      }
    })
  }

  function handleReject(userId: string) {
    startTransition(async () => {
      const result = await rejectUser(userId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.info('Account request rejected.')
        setRejectDialog(null)
      }
    })
  }

  function handleSuspend(userId: string) {
    startTransition(async () => {
      const result = await suspendUser(userId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        const user = users.find(u => u.id === userId)
        const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email
        toast.info(`${name}'s account has been suspended.`)
        setSuspendDialog(null)
      }
    })
  }

  function handleReactivate(userId: string) {
    startTransition(async () => {
      const result = await reactivateUser(userId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Account reactivated.')
      }
    })
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[280px] h-9 border-paper-border"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 border-paper-border">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px] h-9 border-paper-border">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLE_OPTIONS.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-paper-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-paper">
              <TableHead className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid">Name</TableHead>
              <TableHead className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid">Role(s)</TableHead>
              <TableHead className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid">Status</TableHead>
              <TableHead className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid">Joined</TableHead>
              <TableHead className="text-[13px] font-semibold uppercase tracking-wider text-navy-mid text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-navy-mid text-[14px]">
                  No users found
                </TableCell>
              </TableRow>
            )}
            {filtered.map((user) => {
              const badgeInfo = STATUS_BADGE[user.status]
              const isApproving = approvingUserId === user.id
              const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()

              return (
                <>
                  <TableRow key={user.id} className="hover:bg-gray-50 min-h-[48px]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[12px] font-semibold bg-paper text-navy-mid">
                            {getInitials(user.first_name, user.last_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[14px] font-medium text-navy-900">{fullName || 'Unknown'}</p>
                          <p className="text-[13px] text-navy-mid">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.user_roles.slice(0, 2).map((r) => (
                          <Badge key={r.role_name} variant="outline" className="text-[11px]">
                            {r.role_name}
                          </Badge>
                        ))}
                        {user.user_roles.length > 2 && (
                          <Badge variant="outline" className="text-[11px]">
                            +{user.user_roles.length - 2} more
                          </Badge>
                        )}
                        {user.user_roles.length === 0 && (
                          <span className="text-[13px] text-navy-mid italic">None assigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[12px] font-medium border ${badgeInfo.className}`}
                        aria-label={`Status: ${badgeInfo.label}`}
                      >
                        {badgeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-navy-mid">
                      {format(new Date(user.created_at), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 bg-gold text-navy-950 hover:bg-gold-hi text-[13px]"
                            onClick={() => setApprovingUserId(isApproving ? null : user.id)}
                          >
                            {isApproving ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-[13px]"
                            onClick={() => setRejectDialog(user)}
                          >
                            Reject Request
                          </Button>
                        </div>
                      )}
                      {user.status === 'approved' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[13px] border-paper-border"
                            onClick={() => setSuspendDialog(user)}
                          >
                            <MoreHorizontal className="h-3 w-3 mr-1" />
                            Suspend
                          </Button>
                        </div>
                      )}
                      {user.status === 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[13px] border-paper-border"
                          onClick={() => handleReactivate(user.id)}
                          disabled={isPending}
                        >
                          Reactivate Account
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Inline approval row */}
                  {isApproving && (
                    <TableRow key={`${user.id}-approve`} className="bg-gold-pale/30">
                      <TableCell colSpan={5} className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-[14px] text-navy-900">Assign role:</span>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="w-[200px] h-9 border-paper-border">
                              <SelectValue placeholder="Select a role..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-9 bg-gold text-navy-950 hover:bg-gold-hi text-[13px]"
                            disabled={!selectedRole || isPending}
                            onClick={() => handleApprove(user.id, selectedRole)}
                          >
                            Confirm Approval
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-[13px]"
                            onClick={() => { setApprovingUserId(null); setSelectedRole('') }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject account request?</DialogTitle>
            <DialogDescription>
              This will permanently decline{' '}
              <strong>{rejectDialog?.first_name ?? rejectDialog?.email}&apos;s</strong> registration.
              They will need to register again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => rejectDialog && handleReject(rejectDialog.id)}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Suspend {suspendDialog?.first_name ?? suspendDialog?.email}&apos;s account?
            </DialogTitle>
            <DialogDescription>
              This will immediately block their access to all platform features. You can reactivate
              at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => suspendDialog && handleSuspend(suspendDialog.id)}
            >
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

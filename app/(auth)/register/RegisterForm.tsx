'use client'
// RegisterForm.tsx — Client Component
// Per UI-SPEC Screen 3: First name, Last name, Email, Password (with strength indicator), Confirm password, Institution (disabled).

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { registerSchema, type RegisterInput } from '@/lib/schemas/auth'
import { signUp } from '@/lib/auth/actions'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Password strength scoring
function getPasswordStrength(password: string): number {
  if (!password) return 0
  if (password.length < 8) return 1
  if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 4
  if (password.length >= 8 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) return 3
  return 2
}

const STRENGTH_COLORS = ['', 'bg-err', 'bg-warn', 'bg-yellow-400', 'bg-ok']
const STRENGTH_LABELS = ['', 'Too short', 'Weak', 'Fair', 'Strong']

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  })

  const strength = getPasswordStrength(passwordValue)

  function onSubmit(values: RegisterInput) {
    setError(null)
    startTransition(async () => {
      const result = await signUp(values)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div
      className="bg-white rounded-[10px] shadow-auth py-12 px-10 border border-paper-border"
      role="main"
      aria-label="Create account form"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-heading text-[28px] font-bold text-navy-950">Create your account</h1>
        <p className="text-[14px] text-navy-mid mt-1 font-body">
          Your account requires admin approval before access is granted.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} aria-label="Create account form" noValidate>
          {/* Personal details */}
          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[14px] font-medium text-navy-900">First name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="given-name"
                      className="h-11 border-paper-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[14px] font-medium text-navy-900">Last name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="family-name"
                      className="h-11 border-paper-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    className="h-11 border-paper-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t border-paper-border my-6" />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="h-11 pr-10 border-paper-border"
                      aria-describedby="password-hint"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        setPasswordValue(e.target.value)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-navy-mid hover:bg-paper rounded-r-sm"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                {/* Password strength indicator — visible on first keystroke */}
                {passwordValue && (
                  <div className="mt-2" aria-label={`Password strength: ${STRENGTH_LABELS[strength]}`}>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            segment <= strength ? STRENGTH_COLORS[strength] : 'bg-paper-border'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[12px] text-navy-mid mt-1">{STRENGTH_LABELS[strength]}</p>
                  </div>
                )}
                <p id="password-hint" className="text-[13px] text-navy-mid mt-1">
                  12+ characters, uppercase, number, symbol required
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">Confirm password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="h-11 pr-10 border-paper-border"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-navy-mid hover:bg-paper rounded-r-sm"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t border-paper-border my-6" />

          {/* Institution — disabled in single-institution prototype */}
          <div>
            <label className="text-[14px] font-medium text-navy-900 block mb-2">Institution</label>
            <Input
              type="text"
              value="Ministry of Finance"
              disabled
              className="h-11 border-paper-border bg-paper text-navy-mid cursor-not-allowed"
              aria-label="Institution (read-only)"
            />
            <p className="text-[13px] text-navy-mid mt-1">
              Contact your administrator to update institution details.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full mt-6 h-11 bg-gold text-navy-950 hover:bg-gold-hi font-semibold text-[14px]"
            disabled={isPending}
            aria-disabled={isPending}
            aria-busy={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Request Access
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center text-[14px] text-navy-mid">
        Already have an account?{' '}
        <Link href="/login" className="text-navy-900 hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  )
}

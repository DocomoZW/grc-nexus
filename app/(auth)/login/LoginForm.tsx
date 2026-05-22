'use client'
// LoginForm.tsx — Client Component
// Per UI-SPEC Screen 1: institution logo, GRC-Nexus heading, email + password fields, Sign In button.
// Uses useTransition + Server Action (not fetch).
// Form-level errors in Alert (destructive) above submit — never reveals which field failed.

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { loginSchema, type LoginInput } from '@/lib/schemas/auth'
import { signIn } from '@/lib/auth/actions'
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

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur', // Validate on blur per UI-SPEC Interaction Contract
  })

  function onSubmit(values: LoginInput) {
    setError(null)
    startTransition(async () => {
      const result = await signIn(values)
      if (result?.error) {
        setError(result.error)
      }
      // Redirect handled inside Server Action on success
    })
  }

  return (
    <div
      className="bg-white rounded-[10px] shadow-auth py-12 px-10 border border-paper-border"
      role="main"
      aria-label="Sign in form"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-navy-950 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-gold" aria-hidden="true" />
          </div>
        </div>
        <h1 className="font-heading text-[28px] font-bold text-navy-950">GRC-Nexus</h1>
        <p className="text-sm text-navy-mid mt-1 font-body">Zimbabwe Governance Platform</p>
      </div>

      <div className="border-t border-paper-border mb-6" />

      {/* Form-level error — above submit button, never reveals which field failed */}
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} aria-label="Sign in form" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px] font-medium text-navy-900">
                  Email address
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@institution.gov.zw"
                    className="h-11 border-paper-border focus:border-gold focus:ring-gold"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel className="text-[14px] font-medium text-navy-900">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-11 pr-10 border-paper-border focus:border-gold focus:ring-gold"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-navy-mid hover:bg-paper rounded-r-sm"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full mt-6 h-11 bg-gold text-navy-950 hover:bg-gold-hi font-semibold text-[14px] transition-colors duration-180"
            disabled={isPending}
            aria-disabled={isPending}
            aria-busy={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Sign In
          </Button>
        </form>
      </Form>

      {/* Footer links */}
      <div className="mt-6 flex items-center justify-center gap-2 text-[14px] text-navy-mid">
        <Link href="/register" className="hover:text-navy-900 hover:underline">
          Create an account
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/forgot-password" className="hover:text-navy-900 hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  )
}

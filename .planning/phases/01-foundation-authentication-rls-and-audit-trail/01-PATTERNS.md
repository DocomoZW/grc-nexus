# Phase 1: Foundation — Authentication, RLS, and Audit Trail - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 28 new files (greenfield — no source files exist)
**Analogs found:** 0 / 28 (greenfield project; all patterns derived from RESEARCH.md + Next.js 14 App Router conventions)

---

## Greenfield Notice

This is a greenfield Next.js 14 App Router project. No source files exist yet. Pattern assignments
are derived entirely from:
- Official `@supabase/ssr` documentation patterns (verified, HIGH confidence)
- Next.js 14 App Router conventions (Server Components, route groups, middleware)
- RESEARCH.md code examples (all patterns verified against official sources)
- UI-SPEC.md component and naming contracts

All patterns below are **prescriptive** (what to build) rather than **descriptive** (what exists).

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `middleware.ts` | middleware | request-response | RESEARCH.md Pattern 3 | spec-defined |
| `app/(auth)/layout.tsx` | layout | request-response | Next.js App Router convention | spec-defined |
| `app/(auth)/login/page.tsx` | page (Server Component shell) | request-response | Next.js App Router convention | spec-defined |
| `app/(auth)/login/LoginForm.tsx` | component (Client Component) | request-response | RESEARCH.md Pattern 8 | spec-defined |
| `app/(auth)/register/page.tsx` | page (Server Component shell) | request-response | Next.js App Router convention | spec-defined |
| `app/(auth)/register/RegisterForm.tsx` | component (Client Component) | request-response | RESEARCH.md Pattern 8 | spec-defined |
| `app/(auth)/register/pending/page.tsx` | page (Server Component) | request-response | Next.js App Router convention | spec-defined |
| `app/(protected)/layout.tsx` | layout | request-response | Next.js App Router convention | spec-defined |
| `app/(protected)/role-select/page.tsx` | page (Server Component shell) | request-response | RESEARCH.md Pattern 4 | spec-defined |
| `app/(protected)/role-select/RoleSelectForm.tsx` | component (Client Component) | request-response | RESEARCH.md Pattern 4 | spec-defined |
| `app/(protected)/dashboard/page.tsx` | page (Server Component) | request-response | Next.js App Router convention | spec-defined |
| `app/(protected)/(mfa)/mfa/setup/page.tsx` | page (Server Component shell) | request-response | RESEARCH.md Pattern 8 | spec-defined |
| `app/(protected)/(mfa)/mfa/challenge/page.tsx` | page (Server Component shell) | request-response | RESEARCH.md Pattern 8 | spec-defined |
| `app/(protected)/admin/users/page.tsx` | page (Server Component) | CRUD | RESEARCH.md Pattern 5 | spec-defined |
| `app/(protected)/admin/audit-log/page.tsx` | page (Server Component) | CRUD | RESEARCH.md Pattern 7 | spec-defined |
| `app/api/auth/confirm/route.ts` | route handler | request-response | Supabase PKCE callback convention | spec-defined |
| `app/api/send-email/route.ts` | route handler | request-response | RESEARCH.md Pattern 12 | spec-defined |
| `lib/supabase/server.ts` | utility | request-response | RESEARCH.md Pattern 1 | spec-defined |
| `lib/supabase/client.ts` | utility | request-response | RESEARCH.md Pattern 2 | spec-defined |
| `lib/auth/actions.ts` | server action | request-response | RESEARCH.md Patterns 1+3 | spec-defined |
| `lib/auth/mfa.ts` | utility | request-response | RESEARCH.md Pattern 8 | spec-defined |
| `lib/auth/device-trust.ts` | utility | request-response | RESEARCH.md Pattern 9 | spec-defined |
| `lib/auth/recovery-codes.ts` | utility | transform | RESEARCH.md Pattern 10 | spec-defined |
| `lib/email/send-role-notification.ts` | service | request-response | RESEARCH.md Pattern 12 | spec-defined |
| `lib/schemas/auth.ts` | schema | transform | Zod + react-hook-form convention | spec-defined |
| `supabase/migrations/0001_schema.sql` | migration | batch | RESEARCH.md Schema section | spec-defined |
| `supabase/migrations/0002_rls.sql` | migration | batch | RESEARCH.md Pattern 5 | spec-defined |
| `supabase/migrations/0003_triggers.sql` | migration | batch | RESEARCH.md Patterns 6+7 | spec-defined |
| `supabase/migrations/0004_hooks.sql` | migration | batch | RESEARCH.md Pattern 4 | spec-defined |
| `supabase/migrations/0005_grants.sql` | migration | batch | RESEARCH.md Pattern 7 | spec-defined |
| `supabase/seed.sql` | migration | batch | RESEARCH.md Pattern 11 | spec-defined |
| `types/supabase.ts` | type definition | — | Supabase CLI type-gen output | spec-defined |
| `types/auth.ts` | type definition | — | Supabase JWT + app role enums | spec-defined |

---

## Pattern Assignments

---

### `lib/supabase/server.ts` (utility, request-response)

**Source:** RESEARCH.md Pattern 1 — createServerClient for Server Components + Route Handlers

**Full implementation:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components are read-only during render.
            // Token refresh happens in middleware before render — this catch is intentional.
            // See: RESEARCH.md Pitfall 6.
          }
        },
      },
    }
  )
}
```

**Critical rule:** Always call `supabase.auth.getUser()` (not `getSession()`) in Server Components
and Route Handlers. See RESEARCH.md Pitfall 1.

---

### `lib/supabase/client.ts` (utility, request-response)

**Source:** RESEARCH.md Pattern 2 — createBrowserClient for Client Components

**Full implementation:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Rule:** This is the only client-side Supabase import. Used exclusively in `'use client'` components.
Never use this in Server Components or Route Handlers.

---

### `middleware.ts` (middleware, request-response)

**Source:** RESEARCH.md Pattern 3

**Core pattern:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/auth/confirm', '/auth/callback']
const MFA_REQUIRED_ROLES = ['admin', 'board-member']
const DEVICE_TRUST_COOKIE = 'grc_device_trust'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  // createServerClient in middleware uses request/response cookies directly
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ALWAYS call getUser() — this is what refreshes the token in the cookie
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(r => path.startsWith(r))

  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isPublicRoute && path !== '/auth/confirm' && path !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // MFA gate
  if (user) {
    const activeRole = (user.app_metadata as Record<string, string>)?.active_role
    const requiresMfa = MFA_REQUIRED_ROLES.includes(activeRole)

    if (requiresMfa && !path.startsWith('/mfa') && !path.startsWith('/role-select')) {
      const deviceTrust = request.cookies.get(DEVICE_TRUST_COOKIE)
      if (!deviceTrust) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.currentLevel !== 'aal2') {
          return NextResponse.redirect(new URL('/mfa/challenge', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

### `app/(auth)/layout.tsx` (layout, request-response)

**Source:** Next.js App Router route group convention

**Pattern:**
```typescript
// app/(auth)/layout.tsx
// No auth check here — auth is enforced in middleware.
// This layout provides the unauthenticated visual shell.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center">
      {children}
    </main>
  )
}
```

**Rules:**
- NO auth check in `(auth)` layout — middleware handles all redirects before layouts render
- `bg-paper` = `#F3F7FD` per UI-SPEC color tokens (configure in `tailwind.config.ts`)
- Server Component (no `'use client'`)

---

### `app/(auth)/login/page.tsx` (page, Server Component shell)

**Source:** Next.js App Router Server Component + Client Component split convention

**Pattern:**
```typescript
// app/(auth)/login/page.tsx
// Server Component shell — passes no props to the client form
// (form reads its own state; server component handles metadata only)
import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — GRC-Nexus',
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-[420px] px-5">
      <LoginForm />
    </div>
  )
}
```

**Rules:**
- Page file is always a Server Component (no `'use client'`)
- Interactive form is extracted to a separate `LoginForm.tsx` Client Component
- `max-w-[420px]` per UI-SPEC: "Auth card max-width: 420px"
- Title format: `[Screen] — GRC-Nexus`

---

### `app/(auth)/login/LoginForm.tsx` (component, Client Component)

**Source:** RESEARCH.md Pattern 8 + UI-SPEC Screen 1

**Pattern:**
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/schemas/auth'
import { signIn } from '@/lib/auth/actions'
// shadcn/ui imports
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function LoginForm() {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: LoginInput) {
    setError(null)
    startTransition(async () => {
      const result = await signIn(values)
      if (result?.error) {
        setError(result.error)
      }
      // Redirect is handled inside the Server Action on success
    })
  }

  return (
    <div className="bg-white rounded-[10px] shadow-auth py-12 px-10 border border-paper-border">
      {/* Institution header */}
      {/* ... per UI-SPEC Screen 1 */}

      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} aria-label="Sign in form">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Password field with visibility toggle */}
          <Button
            type="submit"
            className="w-full mt-6 h-11 bg-gold text-navy-950 hover:bg-gold-hi"
            disabled={isPending}
            aria-disabled={isPending}
            aria-busy={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

**Rules:**
- Always `'use client'` for forms
- Use `useTransition` + Server Action (not `fetch`) for form submissions
- Validation triggered on blur (not on change) per UI-SPEC Interaction Contract
- Form-level errors go in an `Alert variant="destructive"` ABOVE the submit button, not inline
- Never reveal which field is wrong on auth failures: "Email address or password is incorrect."
- Button loading: spinner + text unchanged + `aria-busy="true"` per UI-SPEC

---

### `app/(protected)/layout.tsx` (layout, request-response)

**Source:** Next.js App Router protected layout convention + RESEARCH.md middleware architecture

**Pattern:**
```typescript
// app/(protected)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // Re-validate here even though middleware also checks — defense-in-depth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Users with 'pending' status cannot access protected pages
  if ((user.app_metadata as Record<string, string>)?.status === 'pending') {
    redirect('/register/pending')
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* App shell nav goes here in a later phase — Phase 1 uses minimal shell */}
      <main className="max-w-[1200px] mx-auto px-8 pt-8">
        {children}
      </main>
    </div>
  )
}
```

**Rules:**
- Server Component with `async` — reads cookies server-side
- Double-check auth even though middleware ran (`getUser()` again — negligible cost, critical safety)
- Redirect `pending` users back to the confirmation screen
- Auth data read from `user.app_metadata` (not `user_metadata` — RESEARCH.md Pitfall, anti-pattern)

---

### `lib/auth/actions.ts` (server action, request-response)

**Source:** RESEARCH.md Patterns 1, 3, 4 + Next.js Server Action conventions

**Pattern:**
```typescript
// lib/auth/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/schemas/auth'
import type { LoginInput, RegisterInput } from '@/lib/schemas/auth'

export async function signIn(values: LoginInput) {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) {
    return { error: 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Never expose which field is wrong — return generic message
    return { error: 'Email address or password is incorrect. Please try again.' }
  }

  // Re-fetch user after sign-in to read JWT claims
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }

  const roles = (user.app_metadata as Record<string, unknown>)?.roles as string[] | undefined
  const status = (user.app_metadata as Record<string, string>)?.status

  if (status === 'pending') {
    redirect('/register/pending')
  }

  // Route to role-select if user has multiple roles; otherwise go to dashboard
  if (Array.isArray(roles) && roles.length > 1) {
    redirect('/role-select')
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signUp(values: RegisterInput) {
  const parsed = registerSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email address already exists. Sign in or contact your administrator.' }
    }
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }

  redirect('/register/pending')
}

export async function selectRole(role: string) {
  const supabase = await createClient()

  // 1. Update user_profiles.active_role in DB
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('user_profiles')
    .update({ active_role: role })
    .eq('id', user.id)

  // 2. Inject into app_metadata via admin client (requires SERVICE_ROLE key — server-side only)
  // 3. Refresh session so JWT claims update immediately
  await supabase.auth.refreshSession()

  redirect('/dashboard')
}
```

**Rules:**
- All Server Actions must be in `'use server'` files or have `'use server'` at function top
- Always re-validate input with Zod even when client already validated — server is the trust boundary
- Never redirect inside a try/catch — Next.js `redirect()` throws and must propagate
- `selectRole` requires `supabase.auth.refreshSession()` after profile update (JWT staleness — RESEARCH.md Pitfall 3)
- Service Role key operations (admin API) belong only in Server Actions or Route Handlers, never client code

---

### `lib/schemas/auth.ts` (schema, transform)

**Source:** Zod v4 + react-hook-form + UI-SPEC password policy + RESEARCH.md Validation Architecture

**Pattern:**
```typescript
// lib/schemas/auth.ts
import { z } from 'zod'

// Password policy: 12+ chars, 1 uppercase, 1 number, 1 symbol
// Enforced in Zod (client feedback) AND Supabase Auth dashboard (server enforcement)
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters and include an uppercase letter, number, and symbol.')
  .regex(/[A-Z]/, 'Password must be at least 12 characters and include an uppercase letter, number, and symbol.')
  .regex(/[0-9]/, 'Password must be at least 12 characters and include an uppercase letter, number, and symbol.')
  .regex(/[^A-Za-z0-9]/, 'Password must be at least 12 characters and include an uppercase letter, number, and symbol.')

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email address.'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match. Please re-enter your password.',
  path: ['confirmPassword'],
})

export const mfaCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits.').regex(/^\d+$/),
})

export const backupCodeSchema = z.object({
  code: z.string().min(8, 'Please enter a valid backup recovery code.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>
export type BackupCodeInput = z.infer<typeof backupCodeSchema>
```

**Rules:**
- Error messages follow UI-SPEC copywriting contract exactly
- Password validation consolidates all policy failures into one message (UX spec)
- Always export the inferred types alongside schemas (used by react-hook-form generics)

---

### `lib/auth/mfa.ts` (utility, request-response)

**Source:** RESEARCH.md Pattern 8 — Supabase MFA TOTP

**Pattern:** Copy Pattern 8 from RESEARCH.md exactly. Key functions:
- `enrollTOTP()` — returns `{ factorId, qrCode, secret }`
- `verifyTOTPEnrollment(factorId, code)` — upgrades session to aal2
- `completeMFAChallenge(factorId, code)` — used on challenge screen
- `getMFALevel()` — returns `{ currentLevel, nextLevel }`
- `listMFAFactors()` — returns enrolled TOTP factors

All functions use `createClient()` from `lib/supabase/client.ts` (browser client, Client Component context).

---

### `lib/auth/device-trust.ts` (utility, request-response)

**Source:** RESEARCH.md Pattern 9 — 30-day device trust cookie

**Pattern:** Copy Pattern 9 from RESEARCH.md exactly.

Key implementation notes:
- Cookie name: `grc_device_trust`
- HMAC-SHA256 token using `DEVICE_TRUST_SECRET` env var
- Cookie config: `httpOnly: true, secure: prod-only, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60`
- Token hash stored in `public.mfa_device_trust` table for server-side invalidation
- `setDeviceTrust()` calls from Server Action after successful MFA verification
- Middleware reads cookie with `request.cookies.get(DEVICE_TRUST_COOKIE)`

---

### `lib/auth/recovery-codes.ts` (utility, transform)

**Source:** RESEARCH.md Pattern 10 — bcryptjs backup codes

**Pattern:** Copy Pattern 10 from RESEARCH.md exactly.

Key implementation notes:
- `generateRecoveryCodes()` — `crypto.randomBytes()` only (NOT `Math.random()`)
- `hashRecoveryCodes(codes)` — `bcrypt.hash(code, 12)` (cost factor 12)
- `verifyRecoveryCode(submitted, hashes)` — returns index of matched code for single-use deletion
- 8 codes total, each 10 hex characters

---

### `lib/email/send-role-notification.ts` (service, request-response)

**Source:** RESEARCH.md Pattern 12 — Resend integration

**Pattern:** Copy Pattern 12 from RESEARCH.md as baseline. Extend with React Email template.

Key implementation notes:
- `const resend = new Resend(process.env.RESEND_API_KEY)` — instantiated at module level
- Always called server-side only (Server Action or Route Handler)
- `from:` address uses `noreply@grcnexus.gov.zw` format
- Error: throw on Resend failure, do not silently swallow (audit trail requires delivery attempt logging)

---

### `app/api/auth/confirm/route.ts` (route handler, request-response)

**Source:** Supabase PKCE email confirmation callback pattern

**Pattern:**
```typescript
// app/api/auth/confirm/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
```

---

### `app/api/send-email/route.ts` (route handler, request-response)

**Source:** RESEARCH.md Pattern 12 + Next.js Route Handler convention

**Pattern:**
```typescript
// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendRoleAssignmentEmail } from '@/lib/email/send-role-notification'

export async function POST(request: NextRequest) {
  // Verify caller is authenticated and has admin role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || (user.app_metadata as Record<string, string>)?.active_role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  // validate body, call sendRoleAssignmentEmail()
  // return 200 on success, 500 on Resend failure
}
```

---

### `supabase/migrations/0001_schema.sql` (migration, batch)

**Source:** RESEARCH.md Schema Design section (complete SQL provided)

**Copy the full SQL from RESEARCH.md** — all tables are defined there:
- `public.institutions`
- `public.user_profiles`
- `public.user_roles`
- `public.mfa_device_trust`
- `public.mfa_backup_codes`
- `public.mfa_otp_challenges`
- `public.audit_events`

All indexes are defined inline in the schema section of RESEARCH.md.

**Rules:**
- File naming: `0001_schema.sql`, `0002_rls.sql`, etc. — zero-padded sequential numbering
- Every governance table must have `institution_id uuid references public.institutions(id)` FK
- Every table needs `created_at timestamptz not null default now()`
- Every Postgres trigger function must have `set search_path = ''` (RESEARCH.md Pitfall 5)

---

### `supabase/migrations/0002_rls.sql` (migration, batch)

**Source:** RESEARCH.md Pattern 5 — Institution-scoped RLS

**Copy Pattern 5 from RESEARCH.md exactly.** The two helper functions are critical:
```sql
-- These two helpers are applied globally and used in every RLS policy
create or replace function auth.institution_id() returns uuid as $$
  select (auth.jwt()->'app_metadata'->>'institution_id')::uuid
$$ language sql stable security definer set search_path = '';

create or replace function auth.active_role() returns text as $$
  select auth.jwt()->'app_metadata'->>'active_role'
$$ language sql stable security definer set search_path = '';
```

**RLS policy template for every governance table** (substitute `table_name`):
```sql
-- Always use SELECT wrapper around auth helpers — caches per statement, not per row
create policy "institution_select" on public.<table_name>
  for select to authenticated           -- always add TO authenticated
  using (institution_id = (select auth.institution_id()));

create policy "institution_insert" on public.<table_name>
  for insert to authenticated
  with check (institution_id = (select auth.institution_id()));

create index idx_<table_name>_institution_id on public.<table_name> (institution_id);
```

---

### `supabase/migrations/0003_triggers.sql` (migration, batch)

**Source:** RESEARCH.md Patterns 6+7

**Copy Patterns 6 and 7 from RESEARCH.md exactly.**

Key audit trigger rules:
- Function name: `audit.create_audit_event()`
- Schema: `audit` (separate from `public`)
- Always `security definer set search_path = ''`
- Sensitive field exclusion array: `array['password', 'encrypted_password', 'hashed_token', ...]`
- Trigger fires `after insert or update or delete` (AFTER, not BEFORE — returns data before exception)
- INSERT-only enforcement uses THREE layers: REVOKE + RESTRICTIVE RLS + RAISE EXCEPTION trigger

---

### `supabase/migrations/0004_hooks.sql` (migration, batch)

**Source:** RESEARCH.md Pattern 4 — custom_access_token_hook

**Copy Pattern 4 from RESEARCH.md exactly.**

Key rules:
- Function must be in `public` schema (Supabase requirement for hooks)
- `set search_path = ''` is mandatory (security requirement)
- Reads from `user_profiles` and `user_roles` tables
- Injects into `app_metadata` (not `user_metadata` — users can modify user_metadata)
- After deploying: enable in Supabase Dashboard → Authentication → Hooks

---

### `supabase/migrations/0005_grants.sql` (migration, batch)

**Source:** RESEARCH.md Pattern 7 (INSERT-only enforcement) + Pattern 4 (hook grants)

**Pattern:**
```sql
-- supabase/migrations/0005_grants.sql

-- Audit events: revoke destructive operations
revoke update, delete, truncate on public.audit_events from authenticated;
revoke update, delete, truncate on public.audit_events from anon;

-- Hook function: grant execute to auth system only
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Hook function reads these tables
grant select on public.user_profiles to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;

-- Audit trigger writes audit_events (SECURITY DEFINER runs as postgres role)
grant insert on public.audit_events to postgres;
```

---

### `supabase/seed.sql` (migration, batch)

**Source:** RESEARCH.md Pattern 11 — deterministic superadmin seed

**Copy Pattern 11 from RESEARCH.md exactly.**

Critical: seed must include BOTH `auth.users` insert AND `auth.identities` insert.
Missing `auth.identities` causes "invalid credentials" on login (RESEARCH.md Pitfall 2).

---

### `types/auth.ts` (type definition)

**Source:** RESEARCH.md Phase Requirements + CONTEXT.md role list

**Pattern:**
```typescript
// types/auth.ts

export type AppRole =
  | 'admin'
  | 'board-member'
  | 'ceo'
  | 'risk-officer'
  | 'audit-officer'
  | 'dept-head'

export type UserStatus = 'pending' | 'approved' | 'suspended'

export type InstitutionType = 'ministry' | 'department' | 'agency' | 'soe'

// JWT app_metadata shape (injected by custom_access_token_hook)
export interface AppMetadata {
  institution_id: string   // UUID as string
  dept_id: string          // UUID as string
  active_role: AppRole | ''
  roles: AppRole[]
  status: UserStatus
}

// Role descriptions for UI display (hardcoded per UI-SPEC Screen 2)
export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  'admin': 'Full administrative access and user management',
  'board-member': 'Board governance, meetings, and resolutions',
  'ceo': 'Executive oversight and strategic performance',
  'risk-officer': 'Risk register and treatment management',
  'audit-officer': 'Audit findings and compliance review',
  'dept-head': 'Departmental performance and compliance',
}

// Roles that require MFA (used in middleware and UI conditional rendering)
export const MFA_REQUIRED_ROLES: AppRole[] = ['admin', 'board-member']
```

---

## Shared Patterns

### Authentication Guard (applies to all protected Server Components)
**Source:** `lib/supabase/server.ts` + Next.js `redirect()`

```typescript
// Top of every protected page/layout Server Component:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

Do NOT use `getSession()` — it does not validate the JWT. (RESEARCH.md Pitfall 1)

---

### Error Handling — Server Actions
**Source:** RESEARCH.md + UI-SPEC Error Messages

```typescript
// Pattern for all Server Actions:
// 1. Validate input with Zod safeParse() — never throw on client input
// 2. Return { error: string } for user-facing errors
// 3. Return { data: T } for success
// 4. Use redirect() for navigation (throws — must be outside try/catch)
// 5. Log internal errors with Pino — never expose stack traces to client

export async function someAction(input: unknown) {
  const parsed = someSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input.' }
  }
  try {
    const result = await performOperation(parsed.data)
    return { data: result }
  } catch (err) {
    logger.error({ err }, 'someAction failed')
    return { error: 'An unexpected error occurred. If this persists, contact your administrator.' }
  }
}
// After the try/catch, if you need to redirect on success:
redirect('/some-route')
```

---

### RLS Policy Template (applies to all governance tables in future phases)
**Source:** RESEARCH.md Pattern 5

```sql
-- Apply to every new governance table in phases 2+
alter table public.<table_name> enable row level security;
alter table public.<table_name> force row level security;

create policy "institution_select" on public.<table_name>
  for select to authenticated
  using (institution_id = (select auth.institution_id()));

create policy "institution_insert" on public.<table_name>
  for insert to authenticated
  with check (institution_id = (select auth.institution_id()));

create policy "institution_update" on public.<table_name>
  for update to authenticated
  using (institution_id = (select auth.institution_id()))
  with check (institution_id = (select auth.institution_id()));

-- Attach audit trigger for every new governance table:
select audit.attach_audit_trigger('<table_name>');

-- Required performance index:
create index idx_<table_name>_institution_id on public.<table_name> (institution_id);
```

---

### Form Component Structure (applies to all auth forms)
**Source:** UI-SPEC Component Inventory + react-hook-form + shadcn/ui Form

Every form follows this structure:
1. `'use client'` at top
2. `useForm<T>({ resolver: zodResolver(schema) })`
3. `useTransition()` for pending state (not `useState(isLoading)`)
4. Form-level error in `Alert variant="destructive"` ABOVE the submit button
5. Field errors via `<FormMessage />` BELOW each field
6. Submit button: `disabled={isPending}`, `aria-busy={isPending}`, spinner when pending
7. Validation mode: `onBlur` (not `onChange`) per UI-SPEC Interaction Contract

---

### Tailwind Design Token Mapping
**Source:** UI-SPEC Color, Typography, Spacing sections

These custom tokens must be added to `tailwind.config.ts`:

```typescript
// tailwind.config.ts (extend section)
colors: {
  'navy-950': '#050D1B',
  'navy-900': '#0B1625',
  'navy-mid': '#3A5270',
  'paper': '#F3F7FD',
  'paper-border': '#D7E2EF',
  'gold': '#C8A44A',
  'gold-hi': '#DDB96A',
  'gold-pale': '#F3E2BC',
  'ok': '#27AE60',
  'warn': '#E67E22',
  'err': '#E74C3C',
},
fontFamily: {
  heading: ['Playfair Display', 'serif'],
  body: ['DM Sans', 'sans-serif'],
  mono: ['DM Mono', 'monospace'],
},
boxShadow: {
  'card': '0 2px 8px rgba(5,13,27,0.08)',
  'auth': '0 8px 32px rgba(5,13,27,0.14)',
},
borderRadius: {
  'sm': '6px',
  'md': '10px',
  'lg': '16px',
}
```

---

### Naming Conventions

**Files:**
- Pages: `page.tsx` (always, Next.js App Router requirement)
- Layouts: `layout.tsx`
- Client Components: `PascalCase.tsx` (e.g., `LoginForm.tsx`, `OtpInput.tsx`)
- Server utilities: `camelCase.ts` (e.g., `actions.ts`, `server.ts`)
- Schemas: `camelCase.ts` in `lib/schemas/`

**Components:**
- Named exports for all components (not default exports from component files)
- Exception: pages use default exports (Next.js requirement)

**Server Actions:**
- All in `lib/auth/actions.ts` for auth, or `lib/<feature>/actions.ts` for other features
- Function names: verb + noun (`signIn`, `signOut`, `signUp`, `selectRole`)

**Database migrations:**
- `0001_schema.sql`, `0002_rls.sql`, `0003_triggers.sql` — zero-padded sequential
- New phase migrations continue numbering: `0006_risks_schema.sql`, etc.

**Environment variables:**
- Public (safe in browser): `NEXT_PUBLIC_` prefix
- Server-only secrets: no prefix (e.g., `RESEND_API_KEY`, `DEVICE_TRUST_SECRET`)
- Supabase service role key: `SUPABASE_SERVICE_ROLE_KEY` (NEVER `NEXT_PUBLIC_`)

---

## No Analog Found

All files have no codebase analog (greenfield project). RESEARCH.md provides the implementation
patterns for all files. The table below summarizes files where RESEARCH.md provides less
prescriptive guidance (planner must exercise more judgment):

| File | Role | Data Flow | Reason for Lower Confidence |
|------|------|-----------|----------------------------|
| `app/(protected)/admin/users/page.tsx` | page | CRUD | Admin UI layout is spec-defined but data-fetching pattern is standard Server Component + Supabase query |
| `app/(protected)/admin/audit-log/page.tsx` | page | CRUD | TanStack Table integration with Server Component data fetching — pattern not in RESEARCH.md |
| `app/(protected)/role-select/RoleSelectForm.tsx` | component | request-response | Role selection UI interaction — Server Action flow is defined but component structure is at discretion |
| `types/supabase.ts` | type definition | — | Generated by `supabase gen types typescript` — not hand-written |

---

## Critical Anti-Patterns (Do Not Use)

From RESEARCH.md Anti-Patterns section:

| Anti-Pattern | Use Instead |
|---|---|
| `supabase.auth.getSession()` in server context | `supabase.auth.getUser()` always |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` exclusively |
| `raw_user_meta_data` for roles/institution | `raw_app_meta_data` only |
| `(auth.jwt()->>'x')` in RLS without SELECT | `(SELECT auth.jwt()->>'x')` always |
| `SECURITY DEFINER` without `set search_path = ''` | Always add `set search_path = ''` |
| `Math.random()` for security tokens | `crypto.randomBytes()` always |
| `supabase.auth.mfa.enroll({ factorType: 'email' })` | Custom `mfa_otp_challenges` table + Resend |
| Redirecting inside `try/catch` | Call `redirect()` after the try/catch block |

---

## Metadata

**Analog search scope:** Greenfield — no source files exist
**Files scanned:** 1 (CLAUDE.md only)
**Pattern source:** RESEARCH.md (HIGH confidence, verified 2026-05-22), UI-SPEC.md, Next.js 14 App Router conventions
**Pattern extraction date:** 2026-05-22

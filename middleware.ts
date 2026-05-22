// middleware.ts
// Session refresh + route protection + MFA gate
// SECURITY: Uses getUser() exclusively — getSession() is FORBIDDEN here (does not validate JWT)
// SECURITY: Never reads SUPABASE_SERVICE_ROLE_KEY — anon key only in middleware
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { MFA_REQUIRED_ROLES } from '@/types/auth'

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/auth/confirm', '/auth/callback', '/register/pending']

// Cookie name for device trust
const DEVICE_TRUST_COOKIE = 'grc_device_trust'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ALWAYS call getUser() to refresh token — this is the session refresh mechanism.
  // Do NOT use getSession() — it reads cookies locally without JWT validation.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(r => path.startsWith(r))

  // 1. Unauthenticated: redirect to login (except public routes)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Authenticated on public route (except auth callbacks): redirect to dashboard
  if (user && isPublicRoute && path !== '/auth/confirm' && path !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. MFA gate — check for roles requiring MFA
  if (user) {
    const appMeta = user.app_metadata as Record<string, unknown>
    const activeRole = appMeta?.active_role as string | undefined
    const requiresMfa = activeRole ? MFA_REQUIRED_ROLES.includes(activeRole as never) : false

    if (requiresMfa && !path.startsWith('/mfa') && !path.startsWith('/role-select') && !path.startsWith('/auth/')) {
      // Check device trust cookie
      const deviceTrust = request.cookies.get(DEVICE_TRUST_COOKIE)
      if (!deviceTrust) {
        // Check AAL level from JWT
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

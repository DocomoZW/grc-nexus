// app/(protected)/mfa/setup/page.tsx
// MFA enrollment page — redirects to /dashboard if MFA already enrolled.
// Shows three-step wizard: method selection → setup → backup codes.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MFASetupForm } from './MFASetupForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Set Up MFA — GRC-Nexus',
}

export default async function MFASetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already has MFA enrolled at aal2
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const isAlreadyAAL2 = aalData?.currentLevel === 'aal2'

  if (isAlreadyAAL2) {
    redirect('/dashboard')
  }

  // Check if there is a TOTP factor enrolled (even if not yet challenged)
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasEnrolledFactor = factors?.all && factors.all.length > 0

  // If user has a factor but hasn't verified it this session, redirect to challenge
  if (hasEnrolledFactor && !isAlreadyAAL2) {
    redirect('/mfa/challenge')
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-navy-900 mb-4">
            <span className="font-heading text-gold text-[20px] font-bold">G</span>
          </div>
          <h1 className="text-[28px] font-heading font-bold text-navy-900 tracking-tight">
            GRC-Nexus
          </h1>
          <p className="text-[14px] text-navy-mid mt-1 font-body">
            Secure your account with multi-factor authentication
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[10px] border border-paper-border shadow-auth p-6">
          <MFASetupForm />
        </div>
      </div>
    </div>
  )
}

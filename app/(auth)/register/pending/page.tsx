// app/(auth)/register/pending/page.tsx
// Per UI-SPEC Screen 4: Account request submitted confirmation.
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Account Request Submitted — GRC-Nexus',
}

export default function PendingPage() {
  return (
    <div className="w-full max-w-[420px] px-5">
      <div
        className="bg-white rounded-[10px] shadow-auth py-12 px-10 border border-paper-border text-center"
        role="main"
        aria-label="Account pending confirmation"
      >
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-gold" aria-hidden="true" />
        </div>

        <h1 className="font-body text-[20px] font-semibold text-navy-900 mt-4">
          Account request submitted
        </h1>

        <p className="text-[16px] text-navy-mid mt-3 leading-relaxed">
          Your account is pending administrator approval. You will receive an email once your
          account is activated and a role is assigned.
        </p>

        <Alert className="mt-6 text-left border-l-4 border-l-blue-500 bg-blue-50">
          <AlertTitle className="text-[14px] font-semibold text-navy-900">
            What happens next?
          </AlertTitle>
          <AlertDescription className="text-[14px] text-navy-mid mt-1">
            An administrator will review your request and assign your institutional role. This
            typically takes 1–2 business days.
          </AlertDescription>
        </Alert>

        <Button
          asChild
          variant="outline"
          className="w-full mt-6 h-11 border-paper-border text-navy-900 hover:bg-paper"
        >
          <Link href="/login">Return to sign in</Link>
        </Button>
      </div>
    </div>
  )
}

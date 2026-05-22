'use client'
// app/(protected)/mfa/setup/MFASetupForm.tsx
// Three-step MFA setup wizard per UI-SPEC Screen 6.
// Step 1: Choose method (TOTP or Email OTP)
// Step 2A: TOTP QR + verification
// Step 2B: Email OTP verification
// Step 3: Backup codes (shared)
import { useState, useEffect, useTransition } from 'react'
import { Smartphone, Mail, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BackupCodesStep } from './BackupCodesStep'
import { enrollTOTP, verifyTOTPEnrollment } from '@/lib/auth/mfa'
import { saveBackupCodes } from '@/lib/auth/mfa-actions'
import { generateRecoveryCodes, hashRecoveryCodes } from '@/lib/auth/recovery-codes'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Method = 'totp' | 'email-otp' | null
type Step = 'method' | 'setup' | 'backup'

export function MFASetupForm() {
  const router = useRouter()
  const [method, setMethod] = useState<Method>(null)
  const [step, setStep] = useState<Step>('method')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // TOTP state
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null)
  const [totpQrUri, setTotpQrUri] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [totpCode, setTotpCode] = useState('')

  // Email OTP state
  const [emailCode, setEmailCode] = useState('')
  const [emailResendCooldown, setEmailResendCooldown] = useState(0)
  const [emailSent, setEmailSent] = useState(false)

  // Backup codes
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isCompleting, setIsCompleting] = useState(false)

  // Load TOTP QR on entering TOTP setup
  useEffect(() => {
    if (method === 'totp' && step === 'setup') {
      enrollTOTP().then((result) => {
        if (result.error) {
          setError(result.error)
        } else {
          setTotpFactorId(result.factorId!)
          setTotpQrUri(result.qrCodeUri!)
          setTotpSecret(result.secret!)
        }
      })
    }
  }, [method, step])

  // Send email OTP on entering email setup
  useEffect(() => {
    if (method === 'email-otp' && step === 'setup' && !emailSent) {
      sendEmailOTP()
    }
  }, [method, step])

  // Resend cooldown countdown
  useEffect(() => {
    if (emailResendCooldown <= 0) return
    const timer = setInterval(() => {
      setEmailResendCooldown((c) => c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [emailResendCooldown])

  async function sendEmailOTP() {
    try {
      const res = await fetch('/api/mfa/email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      })
      if (res.ok) {
        setEmailSent(true)
        setEmailResendCooldown(60)
      } else {
        setError('Failed to send verification code. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
  }

  function handleMethodSelect(selected: Method) {
    setMethod(selected)
    setError(null)
  }

  function handleContinueToSetup() {
    if (!method) return
    setStep('setup')
  }

  async function handleVerifyTOTP() {
    if (!totpFactorId || !totpCode) return
    setError(null)

    startTransition(async () => {
      const result = await verifyTOTPEnrollment(totpFactorId, totpCode)
      if (result.error) {
        setError(result.error)
        return
      }
      // Generate backup codes
      const codes = generateRecoveryCodes()
      const hashed = await hashRecoveryCodes(codes)
      const saveResult = await saveBackupCodes(hashed)
      if (saveResult?.error) {
        setError(saveResult.error)
        return
      }
      setBackupCodes(codes)
      setStep('backup')
    })
  }

  async function handleVerifyEmailOTP() {
    if (!emailCode) return
    setError(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/mfa/email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', code: emailCode }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Invalid verification code. Please try again.')
          return
        }
        // Generate backup codes
        const codes = generateRecoveryCodes()
        const hashed = await hashRecoveryCodes(codes)
        const saveResult = await saveBackupCodes(hashed)
        if (saveResult?.error) {
          setError(saveResult.error)
          return
        }
        setBackupCodes(codes)
        setStep('backup')
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  async function handleCompleteSetup() {
    setIsCompleting(true)
    toast.success('MFA setup complete! Your account is now protected.')
    router.push('/dashboard')
  }

  // Step 1 — Method selection
  if (step === 'method') {
    return (
      <div>
        <h2 className="text-[20px] font-semibold text-navy-900 font-body mb-2">
          Set up multi-factor authentication
        </h2>
        <p className="text-[14px] text-navy-mid font-body mb-6">
          Your role requires MFA. Choose your preferred verification method.
        </p>

        <div className="space-y-3 mb-6">
          {/* TOTP option */}
          <button
            type="button"
            onClick={() => handleMethodSelect('totp')}
            className={`w-full flex items-center gap-4 p-4 rounded-[8px] border text-left transition-all ${
              method === 'totp'
                ? 'border-navy-900 bg-navy-900/5 shadow-sm'
                : 'border-paper-border bg-paper hover:border-navy-mid/40 hover:bg-white'
            }`}
          >
            <div className="h-10 w-10 rounded-[8px] bg-navy-900 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-navy-900 font-body">Authenticator app</p>
              <p className="text-[13px] text-navy-mid font-body">
                Use Google Authenticator, Authy, or any TOTP app
              </p>
            </div>
            <ChevronRight className={`h-4 w-4 shrink-0 ${method === 'totp' ? 'text-navy-900' : 'text-navy-mid'}`} />
          </button>

          {/* Email OTP option */}
          <button
            type="button"
            onClick={() => handleMethodSelect('email-otp')}
            className={`w-full flex items-center gap-4 p-4 rounded-[8px] border text-left transition-all ${
              method === 'email-otp'
                ? 'border-navy-900 bg-navy-900/5 shadow-sm'
                : 'border-paper-border bg-paper hover:border-navy-mid/40 hover:bg-white'
            }`}
          >
            <div className="h-10 w-10 rounded-[8px] bg-navy-900 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-navy-900 font-body">Email one-time code</p>
              <p className="text-[13px] text-navy-mid font-body">
                Receive a 6-digit code to your registered email address
              </p>
            </div>
            <ChevronRight className={`h-4 w-4 shrink-0 ${method === 'email-otp' ? 'text-navy-900' : 'text-navy-mid'}`} />
          </button>
        </div>

        <Button
          type="button"
          className="w-full h-11 bg-gold text-navy-950 hover:bg-gold-hi text-[15px] font-semibold"
          disabled={!method}
          onClick={handleContinueToSetup}
        >
          Continue
        </Button>
      </div>
    )
  }

  // Step 2A — TOTP setup
  if (step === 'setup' && method === 'totp') {
    return (
      <div>
        <button
          type="button"
          onClick={() => { setStep('method'); setError(null) }}
          className="text-[13px] text-navy-mid hover:text-navy-900 mb-4 block"
        >
          ← Back
        </button>
        <h2 className="text-[20px] font-semibold text-navy-900 font-body mb-2">
          Scan with your authenticator app
        </h2>
        <p className="text-[14px] text-navy-mid font-body mb-6">
          Open your authenticator app and scan the QR code below.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}

        {/* QR code */}
        {totpQrUri ? (
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white border border-paper-border rounded-[8px]">
              <QRCodeSVG
                value={totpQrUri}
                size={200}
                bgColor="#FFFFFF"
                fgColor="#050D1B"
                level="M"
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <div className="h-[232px] w-[232px] bg-paper border border-paper-border rounded-[8px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-navy-mid animate-spin" />
            </div>
          </div>
        )}

        {/* Manual entry toggle */}
        {totpSecret && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="text-[13px] text-navy-mid hover:text-navy-900 underline underline-offset-2"
            >
              {showSecret ? 'Hide' : 'Can\'t scan? Enter code manually'}
            </button>
            {showSecret && (
              <div className="mt-2 p-3 bg-paper border border-paper-border rounded-[8px]">
                <p className="text-[12px] text-navy-mid mb-1">Manual entry key:</p>
                <code className="font-mono text-[13px] text-navy-900 break-all">
                  {totpSecret}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Verification code input */}
        <div className="mb-4">
          <label className="text-[13px] font-medium text-navy-900 block mb-1.5">
            Enter the 6-digit code from your app
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="font-mono text-[18px] text-center h-11 tracking-widest border-paper-border"
          />
        </div>

        <Button
          type="button"
          className="w-full h-11 bg-gold text-navy-950 hover:bg-gold-hi text-[15px] font-semibold"
          disabled={totpCode.length !== 6 || isPending || !totpFactorId}
          onClick={handleVerifyTOTP}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
          ) : (
            'Verify and activate'
          )}
        </Button>
      </div>
    )
  }

  // Step 2B — Email OTP setup
  if (step === 'setup' && method === 'email-otp') {
    return (
      <div>
        <button
          type="button"
          onClick={() => { setStep('method'); setError(null) }}
          className="text-[13px] text-navy-mid hover:text-navy-900 mb-4 block"
        >
          ← Back
        </button>
        <h2 className="text-[20px] font-semibold text-navy-900 font-body mb-2">
          Verify your email address
        </h2>
        <p className="text-[14px] text-navy-mid font-body mb-6">
          We&apos;ve sent a 6-digit verification code to your email. Enter it below to activate email MFA.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}

        {/* Code input */}
        <div className="mb-4">
          <label className="text-[13px] font-medium text-navy-900 block mb-1.5">
            Verification code
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="font-mono text-[18px] text-center h-11 tracking-widest border-paper-border"
          />
        </div>

        {/* Resend link */}
        <div className="mb-6 text-center">
          {emailResendCooldown > 0 ? (
            <span className="text-[13px] text-navy-mid">
              Resend code in {emailResendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={sendEmailOTP}
              className="text-[13px] text-navy-mid hover:text-navy-900 underline underline-offset-2 inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Resend code
            </button>
          )}
        </div>

        <Button
          type="button"
          className="w-full h-11 bg-gold text-navy-950 hover:bg-gold-hi text-[15px] font-semibold"
          disabled={emailCode.length !== 6 || isPending}
          onClick={handleVerifyEmailOTP}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
          ) : (
            'Verify and activate'
          )}
        </Button>
      </div>
    )
  }

  // Step 3 — Backup codes
  if (step === 'backup') {
    return (
      <BackupCodesStep
        codes={backupCodes}
        onComplete={handleCompleteSetup}
        isCompleting={isCompleting}
      />
    )
  }

  return null
}

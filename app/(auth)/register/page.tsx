import type { Metadata } from 'next'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account — GRC-Nexus',
}

export default function RegisterPage() {
  return (
    <div className="w-full max-w-[420px] px-5">
      <RegisterForm />
    </div>
  )
}

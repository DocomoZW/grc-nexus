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

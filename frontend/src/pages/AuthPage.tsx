import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { login, register, type User } from '@/services/auth-service'

interface AuthPageProps {
  onAuthenticated: (user: User) => void
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      const user = mode === 'login' ? await login(email, password) : await register(email, password, name)
      onAuthenticated(user)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top_left,_oklch(0.86_0.08_255)_0,_transparent_28rem),radial-gradient(circle_at_bottom_right,_oklch(0.9_0.08_185)_0,_transparent_26rem),linear-gradient(135deg,_oklch(0.99_0.015_250),_oklch(0.95_0.035_210))] px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 ring-1 ring-white/50">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">SambidhanGPT</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">A modern legal document workspace with grounded answers, clauses, and cited PDF sources.</p>
          </div>
        </div>

        <Card className="border-white/60 bg-card/82 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-border/80 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                    placeholder="Your name"
                  />
                </label>
              )}
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  className="h-11 w-full rounded-2xl border border-border/80 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  required
                  minLength={8}
                  className="h-11 w-full rounded-2xl border border-border/80 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                  placeholder="At least 8 characters"
                />
              </label>
              <Button className="h-11 w-full rounded-2xl shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

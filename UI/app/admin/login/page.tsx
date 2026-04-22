"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push("/admin")
    } else {
      setError(result.error || "Login failed")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 sm:gap-12 sm:px-6 sm:py-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">SkillBridge</p>
              <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
            </div>
          </div>
          <p className="text-pretty text-muted-foreground">
            Oversee platform performance, manage users, and coordinate the job matching process.
          </p>
          <div className="grid gap-3 text-sm text-muted-foreground">
            {[
              "Unified dashboards for revenue and engagement",
              "User management with role-based access controls",
              "Job matching hub for candidate forwarding",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-xs font-semibold text-foreground mb-2">🔒 Admin Access Only</p>
            <p className="text-xs text-muted-foreground">
              Admin accounts are provisioned by the system. Contact the super admin if you need access.
            </p>
          </div>

          <Button variant="outline" asChild className="w-fit bg-transparent">
            <Link href="/">
              Back to Home <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Card className="w-full max-w-md justify-self-center">
          <CardHeader>
            <CardTitle className="text-xl">Sign in to Admin Portal</CardTitle>
            <CardDescription>Enter your admin credentials to access the platform controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Admin Email</Label>
                <Input
                  type="email"
                  placeholder="admin@skillbridge.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

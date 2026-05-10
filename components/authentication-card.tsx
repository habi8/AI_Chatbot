"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthMode = "login" | "signup"

const formatAuthMessage = (message: string) => {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes("email rate limit") || normalizedMessage.includes("rate limit")) {
    return "Too many signup attempts triggered confirmation emails. Supabase is temporarily limiting email sends for this project. Wait and try again later."
  }

  return message
}

export default function AuthenticationCard() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const router = useRouter()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null
    if (!supabaseUrl || !supabaseAnonKey) return null
    return createClient(supabaseUrl, supabaseAnonKey)
  }, [supabaseUrl, supabaseAnonKey])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured")
      }

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) {
          setError(formatAuthMessage(signInError.message))
        } else {
          router.push("/chat")
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (signUpError) {
          setError(formatAuthMessage(signUpError.message))
        } else {
          setError("Check your email to confirm your account")
        }
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setFormData({ email: "", password: "", confirmPassword: "" })
    setError(null)
  }

  return (
    <div className="w-[420px] max-w-full animate-fade-up">
      <div className="rounded-lg border border-gray-500/45 bg-gray-900/55 shadow-[0_0_22px_rgba(156,163,175,0.12),0_24px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-xl transition-[box-shadow,border-color] duration-300 hover:border-gray-400/70 hover:shadow-[0_0_56px_rgba(156,163,175,0.32),0_0_18px_rgba(229,231,235,0.16),0_24px_70px_rgba(0,0,0,0.45)]">
        <div className="space-y-6 p-8">
          <div className="text-left">
            <p className="font-mono text-sm font-semibold tracking-wide text-gray-300">
              1822_Bot
            </p>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="font-mono text-2xl font-semibold text-white">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="font-mono text-sm text-gray-400">
              {mode === "login" ? "Sign in to your account" : "Join us today"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-sm text-gray-200">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="border-gray-700/80 bg-gray-800/80 pl-10 font-mono text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-sm text-gray-200">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="border-gray-700/80 bg-gray-800/80 pl-10 font-mono text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-mono text-sm text-gray-200">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="border-gray-700/80 bg-gray-800/80 pl-10 font-mono text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                    placeholder="Confirm password"
                    required
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="font-mono text-xs text-red-400">Passwords do not match</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-900/70 bg-red-950/40 p-3">
                <p className="font-mono text-sm text-red-200">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (mode === "signup" && formData.password !== formData.confirmPassword)}
              className="h-12 w-full rounded-lg border border-gray-600 bg-gray-700 font-mono text-sm font-medium tracking-wide text-white transition-colors hover:border-gray-500 hover:bg-gray-600 disabled:opacity-50"
            >
              {isLoading
                ? mode === "login"
                  ? "SIGNING IN..."
                  : "CREATING ACCOUNT..."
                : mode === "login"
                  ? "LOGIN"
                  : "SIGN UP"}
            </Button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-mono text-xs tracking-wider text-gray-400 transition-colors hover:text-white"
            >
              {mode === "login" ? "Don't have an account? SIGN UP" : "Already have an account? LOGIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

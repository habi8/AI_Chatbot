"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock } from "lucide-react"

type AuthMode = "login" | "signup"

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
    return createClient(
      supabaseUrl,
      supabaseAnonKey
    )
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
          setError(signInError.message)
        } else {
          router.push("/chat")
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })
        if (signUpError) {
          setError(signUpError.message)
        } else {
          setError("Check your email to confirm your account")
        }
      }
    } catch (err) {
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
    <div className="w-[450px] max-w-full">
      <div className="relative">
        {/* Glass morphism card */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl" />

        {/* Content */}
        <div className="relative p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-white font-mono">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
            <p className="text-white/70 font-mono text-sm">{mode === "login" ? "Sign in to your account" : "Join us today"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90 font-mono text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 font-mono"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90 font-mono text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/90 font-mono text-sm">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 font-mono"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 font-mono">Passwords do not match</p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm font-mono">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (mode === "signup" && formData.password !== formData.confirmPassword)}
              className="w-full bg-white/15 hover:bg-white/25 text-white border border-white/30 hover:border-white/50 h-12 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm font-mono disabled:opacity-50 tracking-wide text-sm"
            >
              {isLoading ? (mode === "login" ? "SIGNING IN..." : "CREATING ACCOUNT...") : (mode === "login" ? "LOGIN" : "SIGN UP")}
            </Button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="text-white/60 hover:text-white/90 text-xs transition-colors font-mono tracking-wider"
            >
              {mode === "login" ? "Don&apos;t have an account? SIGN UP" : "Already have an account? LOGIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

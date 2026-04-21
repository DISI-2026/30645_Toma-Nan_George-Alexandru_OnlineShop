"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { resetPassword } from "@/lib/api/auth"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    // Obține token-ul din URL (ex: /reset-password?token=abc123)
    const tokenFromUrl = searchParams.get("token")
    if (!tokenFromUrl) {
      toast.error("Link invalid", {
        description: "Token-ul de resetare lipsește sau este invalid.",
      })
    }
    setToken(tokenFromUrl)
  }, [searchParams])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Parola trebuie să aibă minim 8 caractere"
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Parola trebuie să conțină cel puțin o literă mare"
    }
    if (!/[a-z]/.test(pwd)) {
      return "Parola trebuie să conțină cel puțin o literă mică"
    }
    if (!/[0-9]/.test(pwd)) {
      return "Parola trebuie să conțină cel puțin o cifră"
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      return "Parola trebuie să conțină cel puțin un caracter special"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error("Token invalid")
      return
    }

    // Validări
    const passwordError = validatePassword(password)
    if (passwordError) {
      toast.error("Parolă invalidă", { description: passwordError })
      return
    }

    if (password !== confirmPassword) {
      toast.error("Parolele nu coincid")
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(token, password)

      setResetSuccess(true)
      toast.success("Parolă resetată cu succes!", {
        description: "Poți acum să te autentifici cu noua parolă.",
      })

      // Redirect către login după 3 secunde
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      toast.error("Eroare la resetare", {
        description: error instanceof Error ? error.message : "Token-ul poate fi expirat. Încearcă din nou.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
              Link invalid
            </CardTitle>
            <CardDescription className="text-center">
              Token-ul de resetare lipsește sau este invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                Solicită un nou link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="text-center mb-2">
            <span className="text-3xl font-bold text-orange-500">Shop</span>
            <span className="text-3xl font-bold text-slate-900">Verse</span>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-slate-900">
            {resetSuccess ? "Parolă resetată!" : "Resetare parolă"}
          </CardTitle>
          <CardDescription className="text-center">
            {resetSuccess 
              ? "Parola ta a fost actualizată cu succes."
              : "Introdu noua ta parolă mai jos."
            }
          </CardDescription>
        </CardHeader>

        {!resetSuccess ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Parolă nouă</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minim 8 caractere, o literă mare, o literă mică, o cifră și un caracter special
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmă parola</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                  disabled={isLoading}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se resetează...
                  </>
                ) : (
                  "Resetează parola"
                )}
              </Button>
              
              <Link 
                href="/login" 
                className="flex items-center justify-center text-sm text-orange-500 hover:text-orange-600 hover:underline font-medium"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Înapoi la autentificare
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Parola ta a fost actualizată cu succes. Vei fi redirecționat către pagina de autentificare.
              </p>
            </div>

            <Link href="/login">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                Mergi la autentificare
              </Button>
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

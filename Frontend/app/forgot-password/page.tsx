"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { forgotPassword } from "@/lib/api/auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error("Email-ul este obligatoriu")
      return
    }

    setIsLoading(true)

    try {
      await forgotPassword(email)

      setEmailSent(true)
      toast.success("Email trimis!", {
        description: "Verifică inbox-ul pentru link-ul de resetare.",
      })
    } catch (error) {
      toast.error("Eroare", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsLoading(false)
    }
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
            {emailSent ? "Email trimis!" : "Ai uitat parola?"}
          </CardTitle>
          <CardDescription className="text-center">
            {emailSent 
              ? "Am trimis un link de resetare la adresa ta de email."
              : "Introdu adresa de email și îți vom trimite un link pentru resetarea parolei."
            }
          </CardDescription>
        </CardHeader>

        {!emailSent ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={isLoading}
                    required
                  />
                </div>
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
                    Se trimite...
                  </>
                ) : (
                  "Trimite link de resetare"
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
              <div className="rounded-full bg-orange-100 p-3">
                <Mail className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Dacă există un cont asociat cu <span className="font-medium text-slate-900">{email}</span>, vei primi un email cu instrucțiuni pentru resetarea parolei.
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Nu ai primit email-ul? Verifică folderul spam sau încearcă din nou.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <Button 
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-50"
              >
                Încearcă alt email
              </Button>
              
              <Link href="/login">
                <Button 
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-orange-500"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Înapoi la autentificare
                </Button>
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

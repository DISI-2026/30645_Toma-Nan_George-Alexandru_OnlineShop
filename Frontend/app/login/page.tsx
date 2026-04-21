"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { loginSchema, type LoginFormData } from "@/lib/validations/auth"
import { loginUser } from "@/lib/api/auth"
import { saveUser, getRedirectPath } from "@/lib/auth-utils"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      })

      // Salvăm informațiile utilizatorului (token-ul e în HTTP-only cookie)
      saveUser(response.user)

      toast.success("Autentificare reușită!", {
        description: `Bun venit, ${response.user.email}!`,
      })

      // Redirect bazat pe rol
      const redirectPath = getRedirectPath(response.user.role)
      
      setTimeout(() => {
        router.push(redirectPath)
      }, 1000)
    } catch (error) {
      toast.error("Eroare la autentificare", {
        description: error instanceof Error ? error.message : "Verifică email-ul și parola.",
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
            Autentificare
          </CardTitle>
          <CardDescription className="text-center">
            Intră în contul tău
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplu@email.com"
                {...register("email")}
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Parolă</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-orange-500 hover:text-orange-600 hover:underline"
                >
                  Ai uitat parola?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="border-slate-300 focus:border-orange-500 focus:ring-orange-500 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
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
                  Se autentifică...
                </>
              ) : (
                "Autentificare"
              )}
            </Button>
            
            <p className="text-sm text-center text-muted-foreground">
              Nu ai cont?{" "}
              <Link href="/register" className="text-orange-500 hover:text-orange-600 hover:underline font-medium">
                Înregistrează-te
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

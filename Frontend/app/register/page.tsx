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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth"
import { registerUser } from "@/lib/api/auth"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: "buyer",
      address: "",
      company_name: "",
      description: "",
      logo_url: "",
    },
  })

  const selectedRole = watch("role")

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      let payload
      if (data.role === "buyer") {
        payload = {
          email: data.email,
          password: data.password,
          role: "buyer" as const,
          address: data.address || "",
          preferred_category_ids: [],
        }
      } else {
        payload = {
          email: data.email,
          password: data.password,
          role: "seller" as const,
          company_name: data.company_name || "",
          description: data.description || "",
          logo_url: data.logo_url || "",
        }
      }

      await registerUser(payload)

      toast.success("Cont creat cu succes!", {
        description: "Vei fi redirecționat către pagina de autentificare.",
      })

      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error) {
      toast.error("Eroare la înregistrare", {
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
          <CardTitle className="text-2xl font-bold text-center text-slate-900">Înregistrare</CardTitle>
          <CardDescription className="text-center">Creează un cont nou pentru a accesa platforma</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="exemplu@email.com" {...register("email")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">Minim 8 caractere, o literă mare și o cifră</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label>Selectează rolul</Label>
              <RadioGroup value={selectedRole} onValueChange={(value) => setValue("role", value as "buyer" | "seller")} className="space-y-2" disabled={isLoading}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" />
                  <Label htmlFor="buyer" className="font-normal cursor-pointer">Buyer - Cumpără produse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seller" id="seller" />
                  <Label htmlFor="seller" className="font-normal cursor-pointer">Seller - Vinde produse</Label>
                </div>
              </RadioGroup>
              {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
            </div>

            {/* Buyer specific fields */}
            {selectedRole === "buyer" && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">Informații Buyer</p>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresă de livrare</Label>
                  <Input id="address" type="text" placeholder="Strada Memorandumului 12, Cluj-Napoca" {...register("address")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
                  {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
                </div>
              </div>
            )}

            {/* Seller specific fields */}
            {selectedRole === "seller" && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">Informații Seller</p>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Numele companiei</Label>
                  <Input id="company_name" type="text" placeholder="Tech Market SRL" {...register("company_name")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
                  {errors.company_name && <p className="text-sm text-red-500">{errors.company_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere</Label>
                  <Textarea id="description" placeholder="Descrie afacerea ta..." {...register("description")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">URL Logo (opțional)</Label>
                  <Input id="logo_url" type="url" placeholder="https://example.com/logo.png" {...register("logo_url")} className="border-slate-300 focus:border-orange-500 focus:ring-orange-500" disabled={isLoading} />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Se înregistrează...</>) : ("Înregistrare")}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Ai deja cont?{" "}
              <Link href="/login" className="text-orange-500 hover:text-orange-600 hover:underline font-medium">Autentifică-te</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

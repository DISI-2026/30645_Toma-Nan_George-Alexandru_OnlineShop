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
            role: "client",
        },
    })

    const selectedRole = watch("role")

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true)

        try {
            const response = await registerUser({
                email: data.email,
                password: data.password,
                role: data.role,
            })

            toast.success("Cont creat cu succes!", {
                description: "Vei fi redirecționat către pagina de autentificare.",
            })

            // Redirect către login după 2 secunde
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
                    <CardTitle className="text-2xl font-bold text-center text-slate-900">
                        Înregistrare
                    </CardTitle>
                    <CardDescription className="text-center">
                        Creează un cont nou pentru a accesa platforma
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        {/* Email Field */}
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

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Parolă</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register("password")}
                                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Minim 8 caractere, o literă mare, o literă mică, o cifră și un caracter special
                            </p>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmă parola</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                {...register("confirmPassword")}
                                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                                disabled={isLoading}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-3">
                            <Label>Selectează rolul</Label>
                            <RadioGroup
                                value={selectedRole}
                                onValueChange={(value) => setValue("role", value as "client" | "seller" | "admin")}
                                className="space-y-2"
                                disabled={isLoading}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="client" id="client" />
                                    <Label htmlFor="client" className="font-normal cursor-pointer">
                                        Client - Cumpără produse
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="seller" id="seller" />
                                    <Label htmlFor="seller" className="font-normal cursor-pointer">
                                        Seller - Vinde produse
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="admin" id="admin" />
                                    <Label htmlFor="admin" className="font-normal cursor-pointer">
                                        Admin - Administrează platforma
                                    </Label>
                                </div>
                            </RadioGroup>
                            {errors.role && (
                                <p className="text-sm text-red-500">{errors.role.message}</p>
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
                                    Se înregistrează...
                                </>
                            ) : (
                                "Înregistrare"
                            )}
                        </Button>

                        <p className="text-sm text-center text-muted-foreground">
                            Ai deja cont?{" "}
                            <Link href="/login" className="text-orange-500 hover:text-orange-600 hover:underline font-medium">
                                Autentifică-te
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

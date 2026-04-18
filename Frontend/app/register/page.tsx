"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

export default function RegisterPage() {
  const [role, setRole] = useState("buyer")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validările și integrarea cu API vor fi adăugate în Task #64
    console.log("Form submitted")
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

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplu@email.com"
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label>Selectează rolul</Label>
              <RadioGroup
                value={role}
                onValueChange={setRole}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" />
                  <Label htmlFor="buyer" className="font-normal cursor-pointer">
                    Buyer - Cumpără produse
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seller" id="seller" />
                  <Label htmlFor="seller" className="font-normal cursor-pointer">
                    Seller - Vinde produse
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Buyer specific fields */}
            {role === "buyer" && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">Informații Buyer</p>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresă de livrare</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Strada Memorandumului 12, Cluj-Napoca"
                    className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Seller specific fields */}
            {role === "seller" && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">Informații Seller</p>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Numele companiei</Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Tech Market SRL"
                    className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrie afacerea ta..."
                    className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">URL Logo</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              Înregistrare
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

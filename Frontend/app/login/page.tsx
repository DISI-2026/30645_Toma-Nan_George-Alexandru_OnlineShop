"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Login data:", formData)
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
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplu@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              Autentificare
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

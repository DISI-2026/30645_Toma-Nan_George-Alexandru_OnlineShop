"use client"

import React, { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Activity, AlertCircle, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getPriceSuggestions, type PriceSuggestion } from "@/lib/api/pricing"

// MOCK DATA pentru testare - ȘTERGE DUPĂ IMPLEMENTAREA BACKEND-ULUI (Task #170)
const MOCK_SUGGESTIONS: PriceSuggestion[] = [
  {
    product_id: "1",
    product_title: "Wireless Headphones Pro",
    current_price: 299.99,
    suggested_price: 349.99,
    change_percent: 16.7,
    direction: "increase",
    confidence: 0.87,
    reasoning: "Cerere ridicată în ultimele 7 zile. Produsul tău este cu 15% mai ieftin decât media pieței pentru produse similare. Stocul scăzut (doar 5 unități) indică o oportunitate de creștere a prețului.",
    demand_trend: "rising",
    data_period_days: 30,
    insufficient_data: false
  },
  {
    product_id: "2",
    product_title: "USB-C Cable 2m Premium",
    current_price: 89.99,
    suggested_price: 79.99,
    change_percent: -11.1,
    direction: "decrease",
    confidence: 0.72,
    reasoning: "Cerere în scădere cu 18% în ultimele 30 zile. Competitorii au redus prețurile cu 12% în medie. Stocul ridicat (45 unități) sugerează necesitatea stimulării vânzărilor.",
    demand_trend: "declining",
    data_period_days: 30,
    insufficient_data: false
  },
  {
    product_id: "3",
    product_title: "Phone Stand Adjustable",
    current_price: 45.50,
    suggested_price: 45.50,
    change_percent: 0,
    direction: "maintain",
    confidence: 0.91,
    reasoning: "Prețul actual este optim. Cererea este stabilă, iar prețul tău este competitiv față de piață. Rata de conversie este de 8.5%, peste media categoriei.",
    demand_trend: "stable",
    data_period_days: 30,
    insufficient_data: false
  },
  {
    product_id: "4",
    product_title: "Bluetooth Speaker Mini",
    current_price: 159.99,
    suggested_price: 189.99,
    change_percent: 18.8,
    direction: "increase",
    confidence: 0.45,
    reasoning: "Date limitate disponibile. Produsul a fost adăugat recent (doar 8 zile). Primele vânzări indică interes ridicat, dar este nevoie de mai multe date pentru o recomandare precisă.",
    demand_trend: "rising",
    data_period_days: 8,
    insufficient_data: true
  },
  {
    product_id: "5",
    product_title: "Laptop Sleeve 15\" Premium Leather",
    current_price: 129.99,
    suggested_price: 109.99,
    change_percent: -15.4,
    direction: "decrease",
    confidence: 0.68,
    reasoning: "Cerere în scădere cu 10% în ultimele 30 zile. Sezonalitate: produsele pentru laptop au cerere mai scăzută în această perioadă. Reducerea prețului ar putea stimula vânzările.",
    demand_trend: "declining",
    data_period_days: 30,
    insufficient_data: false
  },
  {
    product_id: "6",
    product_title: "Wireless Mouse Ergonomic",
    current_price: 79.99,
    suggested_price: 94.99,
    change_percent: 18.8,
    direction: "increase",
    confidence: 0.82,
    reasoning: "Cerere în creștere cu 25% în ultimele 14 zile. Produsul tău are rating de 4.8/5 stele, superior competitorilor. Stocul scăzut (12 unități) permite creșterea prețului.",
    demand_trend: "rising",
    data_period_days: 30,
    insufficient_data: false
  }
]

export default function SmartPricing() {
  // MOCK: Folosim date statice pentru testare
  // După implementarea backend-ului (Task #170), decomentează loadSuggestions() și șterge MOCK_SUGGESTIONS
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>(MOCK_SUGGESTIONS)
  const [isLoading, setIsLoading] = useState(false) // false pentru a afișa imediat mock data

  useEffect(() => {
    // MOCK: Comentat pentru testare
    // loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    try {
      setIsLoading(true)
      const response = await getPriceSuggestions()
      setSuggestions(response.suggestions)
    } catch (error) {
      console.error("Eroare la încărcarea sugestiilor de preț:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "increase":
        return <TrendingUp className="w-5 h-5" />
      case "decrease":
        return <TrendingDown className="w-5 h-5" />
      case "maintain":
        return <Minus className="w-5 h-5" />
      default:
        return null
    }
  }

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "increase":
        return "text-green-600 bg-green-50 border-green-200"
      case "decrease":
        return "text-red-600 bg-red-50 border-red-200"
      case "maintain":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-slate-600 bg-slate-50 border-slate-200"
    }
  }

  const getDirectionText = (direction: string) => {
    switch (direction) {
      case "increase":
        return "Crește prețul"
      case "decrease":
        return "Scade prețul"
      case "maintain":
        return "Menține prețul"
      default:
        return direction
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising":
        return <ArrowUp className="w-4 h-4 text-green-600" />
      case "declining":
        return <ArrowDown className="w-4 h-4 text-red-600" />
      case "stable":
        return <Activity className="w-4 h-4 text-slate-600" />
      default:
        return null
    }
  }

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "rising":
        return "În creștere"
      case "declining":
        return "În scădere"
      case "stable":
        return "Stabilă"
      default:
        return trend
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "rising":
        return "text-green-600 bg-green-50"
      case "declining":
        return "text-red-600 bg-red-50"
      case "stable":
        return "text-slate-600 bg-slate-50"
      default:
        return "text-slate-600 bg-slate-50"
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      minimumFractionDigits: 2,
    }).format(price)
  }

  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? "+" : ""
    return `${sign}${percent.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
        <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
        <p className="text-slate-600">Se încarcă sugestiile de preț...</p>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
        <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 text-lg font-medium">Nu există sugestii de preț disponibile</p>
        <p className="text-slate-500 text-sm mt-2">
          Sugestiile vor apărea după ce produsele tale acumulează suficiente date de vânzări.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-orange-900 mb-1">Smart Pricing cu AI</h3>
          <p className="text-sm text-orange-700">
            Sugestiile de preț sunt generate automat pe baza cererii pieței, istoricului de vânzări și tendințelor recente.
          </p>
        </div>
      </div>

      {/* Grid de sugestii */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.product_id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4">
                <CardTitle className="text-lg font-semibold text-slate-900 flex-1">
                  {suggestion.product_title}
                </CardTitle>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border font-semibold ${getDirectionColor(suggestion.direction)}`}>
                  {getDirectionIcon(suggestion.direction)}
                  <span className="text-sm">{getDirectionText(suggestion.direction)}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Warning pentru date insuficiente */}
              {suggestion.insufficient_data && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    Date insuficiente pentru o analiză precisă. Sugestia se bazează pe date limitate.
                  </p>
                </div>
              )}

              {/* Prețuri */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Preț curent:</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatPrice(suggestion.current_price)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Preț sugerat:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-orange-600">
                      {formatPrice(suggestion.suggested_price)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`${
                        suggestion.change_percent > 0 
                          ? "border-green-500 text-green-700 bg-green-50" 
                          : suggestion.change_percent < 0
                          ? "border-red-500 text-red-700 bg-red-50"
                          : "border-blue-500 text-blue-700 bg-blue-50"
                      }`}
                    >
                      {formatPercent(suggestion.change_percent)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Încredere în sugestie:</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={suggestion.confidence * 100} className="h-2" />
                {suggestion.confidence < 0.5 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Încredere scăzută - recomandăm prudență
                  </p>
                )}
              </div>

              {/* Reasoning */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-1">💡 Motivul sugestiei:</p>
                <p className="text-sm text-slate-600 leading-relaxed">{suggestion.reasoning}</p>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Trend cerere:</span>
                  <Badge variant="outline" className={`text-xs ${getTrendColor(suggestion.demand_trend)}`}>
                    <span className="flex items-center gap-1">
                      {getTrendIcon(suggestion.demand_trend)}
                      {getTrendText(suggestion.demand_trend)}
                    </span>
                  </Badge>
                </div>
                <span className="text-xs text-slate-500">
                  Analiză: {suggestion.data_period_days} zile
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

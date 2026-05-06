"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Calendar, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { getSalesStats, type SalesStatsGroupBy, type SalesStatsPeriod, type SalesStatsResponse } from "@/lib/api/sales-stats"
import { toast } from "sonner"

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

// Helper pentru formatarea datelor
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Date default: ultima lună
function getDefaultDates() {
  const today = new Date()
  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  
  return {
    dateFrom: formatDate(lastMonth),
    dateTo: formatDate(today),
  }
}

export default function AdminStatsPage() {
  const [activeTab, setActiveTab] = useState<SalesStatsGroupBy>("category")
  const [period, setPeriod] = useState<SalesStatsPeriod>("month")
  const [dateFrom, setDateFrom] = useState(getDefaultDates().dateFrom)
  const [dateTo, setDateTo] = useState(getDefaultDates().dateTo)
  
  const [data, setData] = useState<SalesStatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch data când se schimbă filtrele
  useEffect(() => {
    fetchStats()
  }, [activeTab, dateFrom, dateTo, period])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        group_by: activeTab,
        date_from: dateFrom,
        date_to: dateTo,
        ...(activeTab === "period" && { period }),
      }

      const response = await getSalesStats(params)
      setData(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare la încărcarea statisticilor"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDateRange = (range: "week" | "month" | "quarter" | "year") => {
    const today = new Date()
    const from = new Date(today)

    switch (range) {
      case "week":
        from.setDate(from.getDate() - 7)
        break
      case "month":
        from.setMonth(from.getMonth() - 1)
        break
      case "quarter":
        from.setMonth(from.getMonth() - 3)
        break
      case "year":
        from.setFullYear(from.getFullYear() - 1)
        break
    }

    setDateFrom(formatDate(from))
    setDateTo(formatDate(today))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Înapoi la Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Statistici Vânzări</h1>
                <p className="text-sm text-slate-500">Analizează performanța platformei</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filtre Perioada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data Început</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Sfârșit</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                />
              </div>

              {/* Period (doar pentru tab-ul "time") */}
              {activeTab === "period" && (
                <div className="space-y-2">
                  <Label htmlFor="period">Grupare</Label>
                  <Select value={period} onValueChange={(value) => setPeriod(value as SalesStatsPeriod)}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Zilnic</SelectItem>
                      <SelectItem value="week">Săptămânal</SelectItem>
                      <SelectItem value="month">Lunar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quick Ranges */}
              <div className="space-y-2">
                <Label>Perioade Rapide</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleQuickDateRange("week")}>
                    7 zile
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickDateRange("month")}>
                    30 zile
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickDateRange("year")}>
                    1 an
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {data && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Venit Total
                </CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {data.total_revenue.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Total Comenzi
                </CardTitle>
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{data.total_orders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Valoare Medie Comandă
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {data.total_orders > 0
                    ? (data.total_revenue / data.total_orders).toLocaleString('ro-RO', { minimumFractionDigits: 2 })
                    : "0.00"}{" "}
                  RON
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-2 text-slate-600">Se încarcă statisticile...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-600">{error}</p>
              <Button onClick={fetchStats} className="mt-4" variant="outline">
                Încearcă din nou
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {data && !loading && !error && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SalesStatsGroupBy)} className="w-full">
            <TabsList className="bg-white border shadow-sm mb-6">
              <TabsTrigger value="category">Categorii</TabsTrigger>
              <TabsTrigger value="region">Regiuni</TabsTrigger>
              <TabsTrigger value="period">Timp</TabsTrigger>
            </TabsList>

            {/* Category Charts */}
            <TabsContent value="category" className="space-y-6">
              {data.series.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Vânzări pe Categorii</CardTitle>
                      <p className="text-sm text-slate-500">Venit generat pe fiecare categorie</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.series}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" fill="#f97316" name="Venit (RON)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuție Vânzări</CardTitle>
                      <p className="text-sm text-slate-500">Procentaj din totalul vânzărilor</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.series}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ label, percentage }) => `${label}: ${percentage.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {data.series.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-slate-500">
                    Nu există date pentru perioada selectată
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Region Charts */}
            <TabsContent value="region" className="space-y-6">
              {data.series.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Vânzări pe Regiuni</CardTitle>
                      <p className="text-sm text-slate-500">Venit generat pe fiecare regiune</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.series}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" fill="#3b82f6" name="Venit (RON)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuție Regională</CardTitle>
                      <p className="text-sm text-slate-500">Procentaj din totalul vânzărilor</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.series}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ label, percentage }) => `${label}: ${percentage.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {data.series.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-slate-500">
                    Nu există date pentru perioada selectată
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Time Charts */}
            <TabsContent value="period" className="space-y-6">
              {data.series.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Evoluție Vânzări în Timp</CardTitle>
                    <p className="text-sm text-slate-500">Venit și comenzi pe perioada selectată</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={data.series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#f97316"
                          strokeWidth={2}
                          name="Venit (RON)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="orders"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Comenzi"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-slate-500">
                    Nu există date pentru perioada selectată
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

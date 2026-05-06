"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// Mock data pentru demonstrație
const categoryData = [
  { id: 1, label: "Electronice", revenue: 45000, orders: 120, percentage: 35 },
  { id: 2, label: "Îmbrăcăminte", revenue: 32000, orders: 95, percentage: 25 },
  { id: 3, label: "Casă & Grădină", revenue: 28000, orders: 80, percentage: 22 },
  { id: 4, label: "Sport", revenue: 23000, orders: 65, percentage: 18 },
]

const regionData = [
  { id: 1, label: "București", revenue: 55000, orders: 150, percentage: 40 },
  { id: 2, label: "Cluj-Napoca", revenue: 35000, orders: 95, percentage: 25 },
  { id: 3, label: "Timișoara", revenue: 25000, orders: 70, percentage: 18 },
  { id: 4, label: "Iași", revenue: 23000, orders: 65, percentage: 17 },
]

const timeData = [
  { label: "Ian", revenue: 28000, orders: 75 },
  { label: "Feb", revenue: 32000, orders: 85 },
  { label: "Mar", revenue: 38000, orders: 95 },
  { label: "Apr", revenue: 42000, orders: 110 },
  { label: "Mai", revenue: 48000, orders: 125 },
  { label: "Iun", revenue: 52000, orders: 140 },
]

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

export default function AdminStatsPage() {
  const [activeTab, setActiveTab] = useState("category")

  // Calculate totals
  const totalRevenue = categoryData.reduce((sum, item) => sum + item.revenue, 0)
  const totalOrders = categoryData.reduce((sum, item) => sum + item.orders, 0)

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

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
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
                {totalRevenue.toLocaleString()} RON
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-green-600 font-medium">+12.5%</span> față de luna trecută
              </p>
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
              <div className="text-2xl font-bold text-slate-900">{totalOrders}</div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-blue-600 font-medium">+8.2%</span> față de luna trecută
              </p>
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
                {Math.round(totalRevenue / totalOrders).toLocaleString()} RON
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-orange-600 font-medium">+4.1%</span> față de luna trecută
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border shadow-sm mb-6">
            <TabsTrigger value="category">Categorii</TabsTrigger>
            <TabsTrigger value="region">Regiuni</TabsTrigger>
            <TabsTrigger value="time">Timp</TabsTrigger>
          </TabsList>

          {/* Category Charts */}
          <TabsContent value="category" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Vânzări pe Categorii</CardTitle>
                  <p className="text-sm text-slate-500">Venit generat pe fiecare categorie</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
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
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ label, percentage }) => `${label}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Region Charts */}
          <TabsContent value="region" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Vânzări pe Regiuni</CardTitle>
                  <p className="text-sm text-slate-500">Venit generat pe fiecare regiune</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regionData}>
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
                        data={regionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ label, percentage }) => `${label}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {regionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Time Charts */}
          <TabsContent value="time" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evoluție Vânzări în Timp</CardTitle>
                <p className="text-sm text-slate-500">Venit și comenzi pe luni</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeData}>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

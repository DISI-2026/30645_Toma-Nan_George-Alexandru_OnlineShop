"use client"

import { useState } from "react"
import { Users, AlertTriangle, TrendingUp, Eye, Check, X, MessageSquare, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

// Mock admin data
const adminStats = {
  totalUsers: 45230,
  totalSellers: 3420,
  totalProducts: 12450,
  flaggedContent: 23,
  avgTrustScore: 84,
  pendingReviews: 156,
}

const flaggedItems = [
  {
    id: 1,
    type: "product",
    title: "Fake Designer Handbag",
    seller: "FashionDeals123",
    trustScore: 23,
    reason: "Suspected counterfeit",
    flaggedBy: "AI System",
    date: "2024-01-15",
  },
  {
    id: 2,
    type: "review",
    title: "Suspicious 5-star review",
    product: "Wireless Headphones",
    reviewer: "John_D",
    trustScore: 15,
    reason: "Fake review pattern",
    flaggedBy: "AI System",
    date: "2024-01-14",
  },
  {
    id: 3,
    type: "seller",
    title: "Multiple policy violations",
    seller: "QuickSeller99",
    trustScore: 31,
    reason: "Repeated violations",
    flaggedBy: "User Reports",
    date: "2024-01-13",
  },
]

const trustAnalytics = [
  { category: "Electronics", avgScore: 87, trend: "+2%" },
  { category: "Clothing", avgScore: 82, trend: "-1%" },
  { category: "Home & Garden", avgScore: 89, trend: "+3%" },
  { category: "Sports", avgScore: 85, trend: "+1%" },
  { category: "Books", avgScore: 94, trend: "+0%" },
]

function ModerationItem({ item }: { item: (typeof flaggedItems)[0] }) {
  const [comment, setComment] = useState("")
  const [showComment, setShowComment] = useState(false)

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={
                  item.type === "product"
                    ? "bg-blue-100 text-blue-800"
                    : item.type === "review"
                      ? "bg-green-100 text-green-800"
                      : "bg-purple-100 text-purple-800"
                }
              >
                {item.type}
              </Badge>
              <Badge className="bg-red-100 text-red-800">Trust: {item.trustScore}%</Badge>
            </div>
            <h3 className="font-medium mb-1">{item.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              {item.seller && <div>Seller: {item.seller}</div>}
              {item.product && <div>Product: {item.product}</div>}
              {item.reviewer && <div>Reviewer: {item.reviewer}</div>}
              <div>Reason: {item.reason}</div>
              <div>
                Flagged by: {item.flaggedBy} on {item.date}
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => setShowComment(!showComment)}>
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-green-600">
              <Check className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-red-600">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showComment && (
          <div className="mt-4 pt-4 border-t">
            <Textarea
              placeholder="Add moderation comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm">Save Comment</Button>
              <Button variant="outline" size="sm" onClick={() => setShowComment(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-600">Platform Management & Moderation</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {adminStats.flaggedContent} items need attention
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="moderation">Moderation Queue</TabsTrigger>
            <TabsTrigger value="analytics">Trust Analytics</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString()}</div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +5.2% this month
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Sellers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.totalSellers.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">
                    {Math.round((adminStats.totalSellers / adminStats.totalUsers) * 100)}% of users
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats.totalProducts.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">
                    Avg {Math.round(adminStats.totalProducts / adminStats.totalSellers)} per seller
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Platform Trust Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{adminStats.avgTrustScore}%</div>
                  <Progress value={adminStats.avgTrustScore} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Flagged Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {flaggedItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-gray-600">{item.reason}</div>
                        </div>
                        <Badge className="bg-red-100 text-red-800 text-xs">{item.trustScore}%</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Flagged Items
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trust Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Excellent (90-100%)</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Good (80-89%)</span>
                        <span>35%</span>
                      </div>
                      <Progress value={35} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Fair (70-79%)</span>
                        <span>15%</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Poor (Below 70%)</span>
                        <span>5%</span>
                      </div>
                      <Progress value={5} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="moderation" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Moderation Queue</h2>
              <div className="flex gap-2">
                <select className="border rounded-md px-3 py-2 text-sm">
                  <option>All Types</option>
                  <option>Products</option>
                  <option>Reviews</option>
                  <option>Sellers</option>
                </select>
                <select className="border rounded-md px-3 py-2 text-sm">
                  <option>All Priorities</option>
                  <option>High Priority</option>
                  <option>Medium Priority</option>
                  <option>Low Priority</option>
                </select>
              </div>
            </div>

            <div>
              {flaggedItems.map((item) => (
                <ModerationItem key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trust Score Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-16 h-16 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trustAnalytics.map((category) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <span className="font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{category.avgScore}%</span>
                          <span
                            className={`text-xs ${category.trend.startsWith("+") ? "text-green-600" : category.trend.startsWith("-") ? "text-red-600" : "text-gray-600"}`}
                          >
                            {category.trend}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>AI Moderation Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">94%</div>
                    <div className="text-sm text-gray-600">AI Accuracy Rate</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">156</div>
                    <div className="text-sm text-gray-600">Items Auto-Approved</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">23</div>
                    <div className="text-sm text-gray-600">Items Flagged</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">User management tools coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

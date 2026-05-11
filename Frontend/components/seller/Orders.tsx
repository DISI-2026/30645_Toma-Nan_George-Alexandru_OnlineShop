"use client"

import React, { useState, useEffect } from "react"
import { Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import OrderDetailsModal from "@/components/seller/modals/OrderDetailsModal"
import { 
  getSellerOrders, 
  getOrderDetails, 
  updateOrderStatus,
  type SellerOrderListItem,
  type OrderDetailsResponse
} from "@/lib/api/orders"

interface OrderItem {
  productName: string
  quantity: number
  pricePerUnit: number
}

interface Order {
  id: string
  date: string
  customer: string
  address: string
  total: string
  status: string
  notes: string
  items: OrderItem[]
}

export default function SellerOrders() {
  const [orderList, setOrderList] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await getSellerOrders(statusFilter, 1, 100)
      
      const transformedOrders: Order[] = response.items.map((item: SellerOrderListItem) => ({
        id: item.order_number,
        date: new Date(item.placed_at).toLocaleDateString("ro-RO", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        customer: item.buyer.full_name || item.buyer.email,
        address: "", 
        total: `${parseFloat(item.total).toFixed(2)} RON`,
        status: item.status,
        notes: "",
        items: item.items.map(orderItem => ({
          productName: orderItem.product_title,
          quantity: orderItem.quantity,
          pricePerUnit: parseFloat(orderItem.unit_price)
        }))
      }))
      
      setOrderList(transformedOrders)
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Nu am putut încărca comenzile. Te rog încearcă din nou.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const order = orderList.find(o => o.id === orderId)
      if (!order) return

      const numericId = parseInt(orderId.split('-').pop() || '0')
      
      await updateOrderStatus(numericId, newStatus)
      
      setOrderList(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Nu am putut actualiza statusul comenzii. Te rog încearcă din nou.')
    }
  }

  const handleViewDetails = async (order: Order) => {
    try {
      const numericId = parseInt(order.id.split('-').pop() || '0')
      
      const details = await getOrderDetails(numericId)
      
      const detailedOrder: Order = {
        id: details.order_number,
        date: new Date(details.placed_at).toLocaleDateString("ro-RO", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        customer: details.buyer.full_name || details.buyer.email,
        address: typeof details.delivery_address === 'string' 
          ? details.delivery_address 
          : details.delivery_address?.address || 'N/A',
        total: `${parseFloat(details.total).toFixed(2)} RON`,
        status: details.status,
        notes: details.notes || "",
        items: details.items.map(item => ({
          productName: item.product_title,
          quantity: item.quantity,
          pricePerUnit: parseFloat(item.unit_price)
        }))
      }
      
      setSelectedOrder(detailedOrder)
    } catch (error) {
      console.error('Error loading order details:', error)
      alert('Nu am putut încărca detaliile comenzii.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":   return "text-green-600 bg-green-50 border-green-200"
      case "Shipped":     return "text-blue-600 bg-blue-50 border-blue-200"
      case "Placed":      return "text-amber-600 bg-amber-50 border-amber-200"
      case "Confirmed":      return "text-purple-600 bg-purple-50 border-purple-200"
      case "Cancelled":   return "text-red-600 bg-red-50 border-red-200"
      default:            return "text-slate-600 bg-slate-50 border-slate-200"
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border rounded-xl shadow-sm w-full p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
        <p className="text-slate-600">Se încarcă comenzile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border rounded-xl shadow-sm w-full p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadOrders} className="bg-orange-500 hover:bg-orange-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reîncearcă
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-600">Filtrează după status:</span>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Toate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={loadOrders} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reîmprospătează
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm w-full overflow-x-auto">
        {orderList.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Nu există comenzi {statusFilter ? `cu statusul "${statusFilter}"` : ''}.
          </div>
        ) : (
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">Order ID</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[160px]">Customer</TableHead>
                <TableHead className="w-[130px]">Total</TableHead>
                <TableHead className="text-center w-[130px]">Detalii</TableHead>
                <TableHead className="text-right w-[150px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderList.map((order) => (
                <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{order.id}</TableCell>
                  <TableCell className="text-slate-600">{order.date}</TableCell>
                  <TableCell className="text-slate-600">{order.customer}</TableCell>
                  <TableCell className="font-semibold text-slate-900">{order.total}</TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                      onClick={() => handleViewDetails(order)}
                    >
                      <Eye className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Detalii</span>
                    </Button>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Select
                        value={order.status.toLowerCase()}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                      >
                        <SelectTrigger className={`w-[130px] h-8 text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placed">Placed</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          getStatusColor={getStatusColor}
        />
      )}
    </>
  )
}
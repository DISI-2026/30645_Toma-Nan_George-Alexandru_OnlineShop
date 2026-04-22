"use client"

import React, { useState } from "react"
import { Eye } from "lucide-react"
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

const initialOrders: Order[] = [
  {
    id: "#ORD-7421",
    date: "14 Oct 2023",
    customer: "Andrei Ionescu",
    address: "Str. Victoriei nr. 10, Bucuresti",
    total: "450.00 RON",
    status: "Shipped",
    notes: "Please leave at the door.",
    items: [
      { productName: "Wireless Headphones Pro", quantity: 1, pricePerUnit: 320.00 },
      { productName: "USB-C Cable 2m", quantity: 2, pricePerUnit: 65.00 },
    ],
  },
  {
    id: "#ORD-8532",
    date: "15 Oct 2023",
    customer: "Elena Popescu",
    address: "Bld. Carol I, nr. 5, Iasi",
    total: "120.50 RON",
    status: "Processing",
    notes: "Call before delivery.",
    items: [
      { productName: "Phone Stand Adjustable", quantity: 1, pricePerUnit: 45.50 },
      { productName: "Screen Protector", quantity: 3, pricePerUnit: 25.00 },
    ],
  },
  {
    id: "#ORD-9104",
    date: "16 Oct 2023",
    customer: "Marius Radu",
    address: "Str. Florilor nr. 22, Cluj-Napoca",
    total: "89.99 RON",
    status: "Delivered",
    notes: "Fragile items.",
    items: [
      { productName: "Laptop Sleeve 15\"", quantity: 1, pricePerUnit: 89.99 },
    ],
  },
]

export default function SellerOrders() {
  const [orderList, setOrderList] = useState<Order[]>(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrderList(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    )
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

  return (
    <>
      <div className="bg-white border rounded-xl shadow-sm w-full overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[120px]">Order ID</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[160px]">Customer</TableHead>
              <TableHead className="w-[220px]">Address</TableHead>
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
                <TableCell className="text-slate-600 text-sm">{order.address}</TableCell>
                <TableCell className="font-semibold text-slate-900">{order.total}</TableCell>

                {/* buton detalii comanda */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Detalii</span>
                  </Button>
                </TableCell>

                {/* select status */}
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Select
                      defaultValue={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                    >
                      <SelectTrigger className={`w-[130px] h-8 text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Placed">Placed</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* popup detalii comanda */}
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

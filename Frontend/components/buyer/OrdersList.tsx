"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Package, Clock, CheckCircle, XCircle, Truck, RefreshCw, ShoppingBag, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getBuyerOrders, getOrderStatus, type Order, type OrderStatus } from "@/lib/api/orders"
import { toast } from "sonner"

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; dot: string }> = {
  placed:     { label: "Plasată", icon: ShoppingBag, color: "bg-slate-100 text-slate-700 border-slate-200",    dot: "bg-slate-500" },
  pending:    { label: "În așteptare", icon: Clock,color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" },
  confirmed:  { label: "Confirmată", icon: CheckCircle,color: "bg-blue-100 text-blue-800 border-blue-200",       dot: "bg-blue-500" },
  processing: { label: "În procesare", icon: Package, color: "bg-purple-100 text-purple-800 border-purple-200", dot: "bg-purple-500" },
  shipped:    { label: "Expediată", icon: Truck, color: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-500" },
  delivered:  { label: "Livrată", icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-200",    dot: "bg-green-500" },
  cancelled:  { label: "Anulată", icon: XCircle, color: "bg-red-100 text-red-800 border-red-200",          dot: "bg-red-500" },
}

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.placed
}

export default function OrdersList() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [orderStatuses, setOrderStatuses] = useState<Record<number, OrderStatus>>({})
  const [pollingIntervals, setPollingIntervals] = useState<Record<number, NodeJS.Timeout>>({})

  useEffect(() => {
    loadOrders()
    return () => { Object.values(pollingIntervals).forEach(clearInterval) }
  }, [])

  const toggleExpanded = (orderId: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const loadOrders = async () => {
    try {
      const data = await getBuyerOrders()
      setOrders(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login')
      } else {
        toast.error("❌ Eroare", { description: "Nu s-au putut încărca comenzile", duration: 3000 })
      }
    } finally {
      setLoading(false)
    }
  }

  const loadOrderStatus = async (orderId: number): Promise<OrderStatus | null> => {
    try {
      const status = await getOrderStatus(orderId)
      setOrderStatuses(prev => ({ ...prev, [orderId]: status }))
      return status
    } catch {
      return null
    }
  }

  const startTracking = async (orderId: number) => {
    await loadOrderStatus(orderId)
    const interval = setInterval(async () => {
      const status = await loadOrderStatus(orderId)
      if (status && ['delivered', 'cancelled'].includes(status.status.toLowerCase())) {
        stopTracking(orderId)
        toast.info("Tracking oprit automat", { description: "Comanda a ajuns la starea finală", duration: 3000 })
      }
    }, 30000)
    setPollingIntervals(prev => ({ ...prev, [orderId]: interval }))
  }

  const stopTracking = (orderId: number) => {
    if (pollingIntervals[orderId]) {
      clearInterval(pollingIntervals[orderId])
      setPollingIntervals(prev => { const n = { ...prev }; delete n[orderId]; return n })
    }
  }

  const toggleTracking = (orderId: number, isDone: boolean) => {
    if (isDone) return
    if (pollingIntervals[orderId]) {
      stopTracking(orderId)
      toast.info("Tracking oprit", { duration: 1500 })
    } else {
      startTracking(orderId)
      toast.success("🔴 Tracking activ", { description: "Statusul se actualizează la 30s", duration: 2000 })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-orange-400 animate-spin" />
          <p className="text-gray-500 text-sm">Se încarcă comenzile...</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-14 h-14 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Nu ai comenzi încă</h3>
        <p className="text-gray-500 text-sm mb-5">Explorează produsele și plasează prima ta comandă!</p>
        <Button onClick={() => router.push('/')} className="bg-orange-500 hover:bg-orange-600 text-white">
          Explorează produse
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isTracking = !!pollingIntervals[order.id]
        const isExpanded = expandedOrders.has(order.id)
        const liveStatus = orderStatuses[order.id]
        const currentStatus = liveStatus?.status ?? order.status
        const currentCfg = getStatusCfg(currentStatus)
        const isDone = ['delivered', 'cancelled'].includes(currentStatus.toLowerCase())
        const address = typeof order.delivery_address === 'object'
          ? order.delivery_address.address
          : order.delivery_address
        const history = liveStatus?.status_history ?? order.status_history ?? []
        const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)

        return (
          <Card key={order.id} className="border-gray-200 shadow-sm overflow-hidden">
            {/* Header — click to expand */}
            <CardHeader
              className="border-b border-gray-100 pb-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpanded(order.id)}
            >
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-base text-slate-900">{order.order_number}</CardTitle>
                    <Badge className={`${currentCfg.color} border flex items-center gap-1.5 shrink-0`}>
                      <currentCfg.icon className="w-3.5 h-3.5" />
                      {currentCfg.label}
                    </Badge>
                    {isTracking && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    <span>{new Date(order.placed_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{itemCount} {itemCount === 1 ? 'produs' : 'produse'}</span>
                    <span className="font-semibold text-slate-900">{order.total} RON</span>
                  </div>
                </div>
                <div className="shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </CardHeader>

            {/* Details — expanded */}
            {isExpanded && (
              <CardContent className="pt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Produse</p>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700">
                          <span className="font-medium">{item.product_title}</span>
                          <span className="text-gray-400 ml-2">× {item.quantity}</span>
                        </span>
                        <span className="font-medium text-slate-900">{item.subtotal} RON</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Adresă livrare</p>
                    <p className="text-slate-700">{address}</p>
                  </div>
                  {order.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observații</p>
                      <p className="text-slate-700">{order.notes}</p>
                    </div>
                  )}
                </div>

                {history.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Istoric status</p>
                      <div className="space-y-2">
                        {history.map((h, i) => {
                          const hCfg = getStatusCfg(h.status)
                          return (
                            <div key={i} className="flex items-start gap-3 text-sm">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${hCfg.dot}`} />
                              <div className="flex-1">
                                <div className="flex justify-between flex-wrap gap-1">
                                  <span className="font-medium text-slate-900">{hCfg.label}</span>
                                  <span className="text-gray-400 text-xs">{new Date(h.changed_at).toLocaleString('ro-RO')}</span>
                                </div>
                                <p className="text-gray-400 text-xs mt-0.5 capitalize">de {h.changed_by_role}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {liveStatus && (
                        <p className="text-xs text-gray-400 mt-2">
                          Ultima actualizare: {new Date(liveStatus.last_updated).toLocaleString('ro-RO')}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button variant={isTracking ? "default" : "outline"} size="sm"
                    onClick={() => toggleTracking(order.id, isDone)} disabled={isDone}
                    className={isTracking
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "border-orange-500 text-orange-600 hover:bg-orange-50"
                    }>
                    {isTracking
                      ? <><span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />Oprește tracking</>
                      : <><Truck className="w-4 h-4 mr-2" />Urmărește comanda</>
                    }
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-slate-900"
                    onClick={async () => { await loadOrderStatus(order.id); toast.success("Status actualizat", { duration: 1500 }) }}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Actualizează
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

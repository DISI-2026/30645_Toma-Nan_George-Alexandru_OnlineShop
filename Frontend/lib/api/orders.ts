import { apiClient } from './client';

export interface CreateOrderRequest {
  delivery_address: string;
  notes?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_title: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface OrderStatusHistory {
  id: number;
  status: string;
  changed_at: string;
  changed_by_role: string;
}

export interface Order {
  id: number;
  order_number: string;
  buyer: { id: number; email: string; full_name: string | null };
  seller_id: number;
  delivery_address: { address: string };
  notes: string | null;
  items: OrderItem[];
  total: string;
  status: string;
  placed_at: string;
  updated_at: string;
  status_history: OrderStatusHistory[];
}

export interface CreateOrderResponse {
  orders: Order[];
  order_count: number;
}

export interface OrderStatus {
  id: number;
  status: string;
  status_history: OrderStatusHistory[];
  last_updated: string;
}


interface BuyerData {
  addresses: any[];
  orderIds: number[];
}

async function getBuyerData(): Promise<BuyerData> {
  try {
    const response = await apiClient.get("/me")
    const raw = response.data?.buyer?.address
    if (!raw) return { addresses: [], orderIds: [] }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'orderIds' in parsed) {
      return { addresses: parsed.addresses ?? [], orderIds: parsed.orderIds ?? [] }
    }
    if (Array.isArray(parsed)) {
      return { addresses: parsed, orderIds: [] }
    }
    return { addresses: [], orderIds: [] }
  } catch {
    return { addresses: [], orderIds: [] }
  }
}

async function saveBuyerData(data: BuyerData): Promise<void> {
  await apiClient.patch("/buyer/me", {
    address: JSON.stringify({ addresses: data.addresses, orderIds: data.orderIds }),
  })
}


export async function saveOrderIds(orderIds: number[]): Promise<void> {
  const data = await getBuyerData()
  const merged = Array.from(new Set([...data.orderIds, ...orderIds]))
  await saveBuyerData({ ...data, orderIds: merged })
}


export async function getAddressesFromBuyer(): Promise<any[]> {
  const data = await getBuyerData()
  return data.addresses
}

export async function saveAddressesToBuyer(addresses: any[]): Promise<void> {
  const data = await getBuyerData()
  await saveBuyerData({ ...data, addresses })
}


export async function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  const response = await apiClient.post('/orders', {
    delivery_address: data.delivery_address,
    notes: data.notes,
  });
  return response.data;
}

export async function getOrderDetails(orderId: number): Promise<Order> {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
}

export async function getOrderStatus(orderId: number): Promise<OrderStatus> {
  const response = await apiClient.get(`/orders/${orderId}/status`);
  return response.data;
}

export async function getBuyerOrders(): Promise<Order[]> {
  try {
    const response = await apiClient.get('/orders')
    const data = response.data
    const orders = Array.isArray(data) ? data : (data.data ?? [])
    return orders.sort((a: Order, b: Order) =>
      new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
    )
  } catch (error: any) {
    const buyerData = await getBuyerData()
    const ids = buyerData.orderIds
    if (ids.length === 0) return []
    const results = await Promise.allSettled(ids.map(id => getOrderDetails(id)))
    return results
      .filter((r): r is PromiseFulfilledResult<Order> => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
  }
}

export async function getSellerOrders(): Promise<any> {
  const response = await apiClient.get('/sellers/me/orders');
  return response.data;
}

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

// Create order (checkout) — POST /api/v1/orders
export async function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  const response = await apiClient.post('/orders', {
    delivery_address: data.delivery_address,
    notes: data.notes,
  });
  return response.data;
}

// Get single order details — GET /api/v1/orders/{order_id}
export async function getOrderDetails(orderId: number): Promise<Order> {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
}

// Get order status for polling — GET /api/v1/orders/{order_id}/status
export async function getOrderStatus(orderId: number): Promise<OrderStatus> {
  const response = await apiClient.get(`/orders/${orderId}/status`);
  return response.data;
}

// Get buyer orders
export async function getBuyerOrders(): Promise<Order[]> {
  const stored = localStorage.getItem('buyer_order_ids');
  if (!stored) return [];
  
  const ids: number[] = JSON.parse(stored);
  if (ids.length === 0) return [];

  const results = await Promise.allSettled(
    ids.map((id) => getOrderDetails(id))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Order> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
}

// Save order IDs to localStorage after checkout
export function saveOrderIds(orderIds: number[]): void {
  const stored = localStorage.getItem('buyer_order_ids');
  const existing: number[] = stored ? JSON.parse(stored) : [];
  const merged = Array.from(new Set([...existing, ...orderIds]));
  localStorage.setItem('buyer_order_ids', JSON.stringify(merged));
}

// Get seller orders — GET /api/v1/sellers/me/orders
export async function getSellerOrders(): Promise<any> {
  const response = await apiClient.get('/sellers/me/orders');
  return response.data;
}

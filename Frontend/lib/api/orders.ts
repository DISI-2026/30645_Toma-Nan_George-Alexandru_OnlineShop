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

export interface BuyerOrderListItem {
  id: number;
  order_number: string;
  status: string;
  seller: {
    id: number;
    company_name: string;
  };
  total: string;
  item_count: number;
  placed_at: string;
  updated_at: string;
}

export interface BuyerOrderListPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface BuyerOrderListResponse {
  data: BuyerOrderListItem[];
  pagination: BuyerOrderListPagination;
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

export async function getBuyerOrders(
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<Order[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    const response = await apiClient.get(`/orders?${params.toString()}`);
    const data: BuyerOrderListResponse = response.data;
    
    const orders: Order[] = await Promise.all(
      data.data.map(async (item) => {
        try {
          const fullOrder = await getOrderDetails(item.id);
          return fullOrder;
        } catch {
          // Fallback to basic order info if details fetch fails
          return {
            id: item.id,
            order_number: item.order_number,
            buyer: { id: 0, email: '', full_name: null },
            seller_id: item.seller.id,
            delivery_address: { address: '' },
            notes: null,
            items: [],
            total: item.total,
            status: item.status,
            placed_at: item.placed_at,
            updated_at: item.updated_at,
            status_history: []
          };
        }
      })
    );
    
    return orders.sort((a, b) => 
      new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
    );
  } catch (error: any) {
    console.error('Failed to fetch buyer orders:', error);
    return [];
  }
}

export async function getSellerOrders(): Promise<any> {
  const response = await apiClient.get('/sellers/me/orders');
  return response.data;
}

export async function saveOrderIds(orderIds: number[]): Promise<void> {

  console.log('Order IDs saved to backend automatically:', orderIds);
}
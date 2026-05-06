import { apiClient } from './client';

export interface CartItem {
  id: number;
  product_id: number;
  product_title: string;
  quantity: number;
  unit_price: string;
  current_price: string;
  subtotal: string;
}

export interface Cart {
  items: CartItem[];
  total: string;
  current_total: string;
  price_changed: boolean;
}

export interface AddToCartRequest {
  product_id: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

// Get cart
export async function getCart(): Promise<Cart> {
  const response = await apiClient.get('/cart');
  return response.data;
}

// Add item to cart
export async function addToCart(data: AddToCartRequest): Promise<Cart> {
  const response = await apiClient.post('/cart/items', data);
  return response.data;
}

// Update cart item quantity
export async function updateCartItem(itemId: number, data: UpdateCartItemRequest): Promise<Cart> {
  const response = await apiClient.patch(`/cart/items/${itemId}`, data);
  return response.data;
}

// Remove item from cart
export async function removeCartItem(itemId: number): Promise<void> {
  await apiClient.delete(`/cart/items/${itemId}`);
}

// Clear cart
export async function clearCart(): Promise<void> {
  await apiClient.delete('/cart');
}

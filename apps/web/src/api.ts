import type { CreateOrderInput, Order, UpdateOrderInput, UploadResult } from '@sph/shared';

// Relative URLs: the Vite proxy handles them in dev, the API serves the app in production.
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const api = {
  listOrders: () => request<Order[]>('/orders'),
  getOrder: (id: string) => request<Order>(`/orders/${id}`),
  createOrder: (input: CreateOrderInput) => request<Order>('/orders', 'POST', input),
  updateOrder: (id: string, input: UpdateOrderInput) =>
    request<Order>(`/orders/${id}`, 'PATCH', input),
  completeOrder: (id: string) => request<Order>(`/orders/${id}/complete`, 'PATCH'),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResult>('/uploads', 'POST', form);
  },
  imageUrl: (path: string) => `/uploads/${path}`,
};

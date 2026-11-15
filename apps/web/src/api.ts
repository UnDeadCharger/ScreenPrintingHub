import type {
  CreateOrderInput,
  ImportResult,
  Order,
  PaymentStatus,
  UpdateOrderInput,
  UploadResult,
} from '@sph/shared';

// Relative URLs: the Vite proxy handles them in dev, the API serves the app in production.
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  // FormData and Blob bodies go out as they are; everything else is JSON.
  const isRaw = body instanceof FormData || body instanceof Blob;
  const res = await fetch(`/api${path}`, {
    method,
    headers: body && !isRaw ? { 'Content-Type': 'application/json' } : undefined,
    body: isRaw ? body : body === undefined ? undefined : JSON.stringify(body),
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
  setPayment: (id: string, paymentStatus: PaymentStatus) =>
    request<Order>(`/orders/${id}/payment`, 'PATCH', { paymentStatus }),
  completeOrder: (id: string) => request<Order>(`/orders/${id}/complete`, 'PATCH'),
  cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, 'PATCH'),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResult>('/uploads', 'POST', form);
  },
  // Re-wrapped so the content type is always tar, whatever the browser guessed for the file.
  importBackup: (file: File) =>
    request<ImportResult>(
      '/backup/import',
      'POST',
      new Blob([file], { type: 'application/x-tar' }),
    ),
  imageUrl: (path: string) => `/uploads/${path}`,
};

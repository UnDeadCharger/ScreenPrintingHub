// Types only: no runtime code, so no build step. Import with `import type`.

export type OrderStatus = 'pending' | 'in_progress' | 'completed';

export interface Recipient {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

/** Where the design sits on the product photo. x/y are 0-1 fractions of the photo's width/height. */
export interface PrintPosition {
  x: number;
  y: number;
  /** Preview-only size multiplier (default 1). The physical print size is fixed and not stored. */
  scale?: number;
}

export interface Print {
  /** Filename returned by POST /api/uploads; served at /uploads/<filename>. */
  productImage: string;
  designImage: string;
  position: PrintPosition;
  label?: string;
  notes?: string;
}

export interface OrderItem {
  productName: string;
  productType?: string;
  quantity: number;
  prints: Print[];
}

export interface CreateOrderInput {
  recipient: Recipient;
  items: OrderItem[];
}

export interface UpdateOrderInput extends Partial<CreateOrderInput> {
  /** `completed` is only reachable through PATCH /api/orders/:id/complete. */
  status?: Exclude<OrderStatus, 'completed'>;
}

export interface Order extends CreateOrderInput {
  _id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface UploadResult {
  path: string;
}

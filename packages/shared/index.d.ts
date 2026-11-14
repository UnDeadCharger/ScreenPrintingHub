// Types only: no runtime code, so no build step. Import with `import type`.

export type OrderStatus =
  'pending' | 'in_progress' | 'printed' | 'shipping' | 'completed' | 'cancelled';

export interface Recipient {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export type PrintColor = 'white' | 'red' | 'blue' | 'black';

export interface Print {
  /** Design id from the library (apps/web/src/designs.json), e.g. `v1-star`. */
  design: string;
  /** Ink colour the design is printed in. */
  color: PrintColor;
  /** Centre of the design on the photo. x/y are 0-1 fractions of the photo's width/height. */
  position: { x: number; y: number };
  /** Degrees clockwise, -180 to 180 (default 0). */
  rotation?: number;
  notes?: string;
}

/** One side of a garment: a photo with any number of prints placed on it. */
export interface ItemSide {
  /** Filename returned by POST /api/uploads; served at /uploads/<filename>. */
  photo: string;
  /** Preview-only size multiplier (default 1): how large the design sheet looks on this photo. */
  scale?: number;
  prints: Print[];
}

export interface OrderItem {
  productName: string;
  productType?: string;
  quantity: number;
  front?: ItemSide;
  back?: ItemSide;
}

export interface CreateOrderInput {
  recipient: Recipient;
  items: OrderItem[];
}

export interface UpdateOrderInput extends Partial<CreateOrderInput> {
  /** `completed` is only reachable through PATCH /api/orders/:id/complete. */
  status?: Exclude<OrderStatus, 'completed' | 'cancelled'>;
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

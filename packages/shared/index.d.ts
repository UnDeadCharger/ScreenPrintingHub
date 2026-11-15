// Types only: no runtime code, so no build step. Import with `import type`.
// The design library is data, in designs.json next to this file.

/** One entry of designs.json. */
export interface Design {
  id: string;
  name: string;
  /** Pixel size of the cut-out; widths are relative to a 2079px-wide sheet. */
  width: number;
  height: number;
  /** What one print of this design costs, in VND. */
  price: number;
}

export type OrderStatus =
  'pending' | 'in_progress' | 'printed' | 'shipping' | 'completed' | 'cancelled';

export interface Recipient {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export type PaymentStatus = 'unpaid' | 'deposit' | 'paid';

export type PrintColor = 'white' | 'red' | 'blue' | 'black';

export interface Print {
  /** Design id from the library (designs.json), e.g. `v1-star`. */
  design: string;
  /** Ink colour the design is printed in. */
  color: PrintColor;
  /** Centre of the design on the photo. x/y are 0-1 fractions of the photo's width/height. */
  position: { x: number; y: number };
  /** Degrees clockwise, -180 to 180 (default 0). */
  rotation?: number;
  notes?: string;
  /**
   * What this print costs, in VND. Set by the API from the design's price each time the order's
   * items are saved, so later price changes do not alter existing orders. Never sent by the client.
   */
  price?: number;
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
  /** Tracked separately from `status`, and changeable at any time. */
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface UploadResult {
  path: string;
}

/** Result of POST /api/backup/import: what was added, and what was already there. */
export interface ImportResult {
  ordersAdded: number;
  ordersSkipped: number;
  photosAdded: number;
  photosSkipped: number;
}

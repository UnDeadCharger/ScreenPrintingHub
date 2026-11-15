import type { PaymentStatus } from '@sph/shared';
import designs from '@sph/shared/designs.json';

export const vnd = (amount: number) => `${amount.toLocaleString('vi-VN')} ₫`;

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  deposit: 'Deposit',
  paid: 'Paid',
};

interface PricedPrint {
  design: string;
  /** Stored on saved orders. Drafts and orders saved before pricing use the design's current price. */
  price?: number;
}
interface PricedItem {
  front?: { prints: PricedPrint[] };
  back?: { prints: PricedPrint[] };
}

export const printPrice = (p: PricedPrint) =>
  p.price ?? designs.find((d) => d.id === p.design)?.price ?? 0;

/** Price of one piece: every print on its front and back. The garment itself is not priced. */
export const unitPrice = (item: PricedItem) =>
  [...(item.front?.prints ?? []), ...(item.back?.prints ?? [])].reduce(
    (sum, p) => sum + printPrice(p),
    0,
  );

export const orderTotal = (items: (PricedItem & { quantity: number })[]) =>
  items.reduce((sum, it) => sum + unitPrice(it) * it.quantity, 0);

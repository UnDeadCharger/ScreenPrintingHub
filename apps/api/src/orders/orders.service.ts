import { readFileSync } from 'node:fs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Design, ItemSide, OrderItem, OrderStatus, PaymentStatus } from '@sph/shared';
import type { Model, Types } from 'mongoose';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';
import type { OrderDoc } from './order.schema';

// The design library is plain data in the shared package (the web app bundles the same file).
const PRICES = new Map(
  (JSON.parse(readFileSync(require.resolve('@sph/shared/designs.json'), 'utf8')) as Design[]).map(
    (d) => [d.id, d.price],
  ),
);

/** Stamps each print with its design's current price. Rejects designs that are not in the library. */
function withPrices(items: OrderItem[]): OrderItem[] {
  const side = (s?: ItemSide): ItemSide | undefined =>
    s && {
      ...s,
      prints: s.prints.map((p) => {
        const price = PRICES.get(p.design);
        if (price === undefined) throw new BadRequestException(`Unknown design "${p.design}"`);
        return { ...p, price };
      }),
    };
  return items.map((it) => ({ ...it, front: side(it.front), back: side(it.back) }));
}

// completed and cancelled are final: no further edits or status changes once reached.
const FINAL: OrderStatus[] = ['completed', 'cancelled'];

@Injectable()
export class OrdersService {
  constructor(@InjectModel('Order') private readonly orders: Model<OrderDoc>) {}

  create(dto: CreateOrderDto) {
    return this.orders.create({ ...dto, items: withPrices(dto.items) });
  }

  findAll() {
    return this.orders.find().sort({ createdAt: -1 });
  }

  async findOne(id: Types.ObjectId) {
    return this.require(id);
  }

  /** A finalized order (completed or cancelled) is read-only. */
  async update(id: Types.ObjectId, dto: UpdateOrderDto) {
    const changes = dto.items ? { ...dto, items: withPrices(dto.items) } : dto;
    const updated = await this.orders.findOneAndUpdate(
      { _id: id, status: { $nin: FINAL } },
      changes,
      { returnDocument: 'after', runValidators: true },
    );
    if (updated) return updated;
    const existing = await this.require(id);
    throw new ConflictException(`A ${existing.status} order cannot be edited`);
  }

  /** Moves to a final status. Repeating the same one is harmless; switching between the two
   *  final statuses (e.g. completing a cancelled order) is rejected. */
  private async finalize(id: Types.ObjectId, status: 'completed' | 'cancelled') {
    const order = await this.require(id);
    if (order.status === status) return order;
    if (FINAL.includes(order.status as OrderStatus)) {
      throw new ConflictException(`A ${order.status} order cannot be marked ${status}`);
    }
    const updated = await this.orders.findByIdAndUpdate(
      id,
      { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) },
      { returnDocument: 'after' },
    );
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }

  /** Payment is tracked apart from the order status, so it can change even on a final order. */
  async setPayment(id: Types.ObjectId, paymentStatus: PaymentStatus) {
    const updated = await this.orders.findByIdAndUpdate(
      id,
      { paymentStatus },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }

  async complete(id: Types.ObjectId) {
    return this.finalize(id, 'completed');
  }

  async cancel(id: Types.ObjectId) {
    return this.finalize(id, 'cancelled');
  }

  /** Looks up an order by id, or throws 404. A plain null check, not a generic helper: generic
   *  inference does not reliably strip `null` from Mongoose's conditional query result types. */
  private async require(id: Types.ObjectId) {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}

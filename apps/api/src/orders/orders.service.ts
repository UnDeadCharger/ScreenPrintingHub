import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { OrderStatus } from '@sph/shared';
import type { Model, Types } from 'mongoose';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';
import type { OrderDoc } from './order.schema';

// completed and cancelled are final: no further edits or status changes once reached.
const FINAL: OrderStatus[] = ['completed', 'cancelled'];

@Injectable()
export class OrdersService {
  constructor(@InjectModel('Order') private readonly orders: Model<OrderDoc>) {}

  create(dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  findAll() {
    return this.orders.find().sort({ createdAt: -1 });
  }

  async findOne(id: Types.ObjectId) {
    return this.require(id);
  }

  /** A finalized order (completed or cancelled) is read-only. */
  async update(id: Types.ObjectId, dto: UpdateOrderDto) {
    const updated = await this.orders.findOneAndUpdate({ _id: id, status: { $nin: FINAL } }, dto, {
      returnDocument: 'after',
      runValidators: true,
    });
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

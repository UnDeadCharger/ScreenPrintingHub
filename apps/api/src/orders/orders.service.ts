import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';
import type { OrderDoc } from './order.schema';

function found<T>(order: T | null): T {
  if (!order) throw new NotFoundException('Order not found');
  return order;
}

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
    return found(await this.orders.findById(id));
  }

  /** A completed order is final: it cannot be edited or moved back to another status. */
  async update(id: Types.ObjectId, dto: UpdateOrderDto) {
    const updated = await this.orders.findOneAndUpdate(
      { _id: id, status: { $ne: 'completed' } },
      dto,
      { returnDocument: 'after', runValidators: true },
    );
    if (updated) return updated;
    found(await this.orders.exists({ _id: id }));
    throw new ConflictException('A completed order cannot be edited');
  }

  /** Completing twice is harmless: the first completion time is kept. */
  async complete(id: Types.ObjectId) {
    const completed = await this.orders.findOneAndUpdate(
      { _id: id, status: { $ne: 'completed' } },
      { status: 'completed', completedAt: new Date() },
      { returnDocument: 'after' },
    );
    return completed ?? this.findOne(id);
  }
}

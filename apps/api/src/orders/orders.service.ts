import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import type { CreateOrderDto, UpdateOrderDto } from './order.dto';
import type { OrderDoc } from './order.schema';

function found<T>(order: T | null): T {
  if (!order) throw new NotFoundException('Order not found');
  return order;
}

// Placeholder logic: straight CRUD, no business rules yet.
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

  async update(id: Types.ObjectId, dto: UpdateOrderDto) {
    return found(
      await this.orders.findByIdAndUpdate(id, dto, {
        returnDocument: 'after',
        runValidators: true,
      }),
    );
  }

  async complete(id: Types.ObjectId) {
    return found(
      await this.orders.findByIdAndUpdate(
        id,
        { status: 'completed', completedAt: new Date() },
        { returnDocument: 'after' },
      ),
    );
  }
}

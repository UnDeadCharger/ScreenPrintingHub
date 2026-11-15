import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import { CreateOrderDto, PaymentDto, UpdateOrderDto } from './order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Get()
  findAll() {
    return this.orders.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.orders.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  @Patch(':id/payment')
  setPayment(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() dto: PaymentDto) {
    return this.orders.setPayment(id, dto.paymentStatus);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.orders.complete(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.orders.cancel(id);
  }
}

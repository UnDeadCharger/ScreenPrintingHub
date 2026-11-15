import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupController } from './backup.controller';
import { OrderSchema } from './order.schema';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }])],
  controllers: [OrdersController, BackupController],
  providers: [OrdersService],
})
export class OrdersModule {}

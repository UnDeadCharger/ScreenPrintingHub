import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/screenprinting'),
    OrdersModule,
  ],
  controllers: [UploadsController],
})
export class AppModule {}

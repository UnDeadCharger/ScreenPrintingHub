import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreateOrderInput,
  OrderItem,
  Print,
  PrintPosition,
  Recipient,
  UpdateOrderInput,
} from '@sph/shared';

// Each class `implements` its shared interface so the compiler catches drift from the web app.

class RecipientDto implements Recipient {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

class PrintPositionDto implements PrintPosition {
  @IsNumber() @Min(0) @Max(1) x!: number;
  @IsNumber() @Min(0) @Max(1) y!: number;
  @IsOptional() @IsNumber() @IsPositive() scale?: number;
}

class PrintDto implements Print {
  @IsString() @IsNotEmpty() productImage!: string;
  @IsString() @IsNotEmpty() designImage!: string;
  @ValidateNested() @Type(() => PrintPositionDto) position!: PrintPositionDto;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() notes?: string;
}

class OrderItemDto implements OrderItem {
  @IsString() @IsNotEmpty() productName!: string;
  @IsOptional() @IsString() productType?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PrintDto) prints!: PrintDto[];
}

export class CreateOrderDto implements CreateOrderInput {
  @ValidateNested() @Type(() => RecipientDto) recipient!: RecipientDto;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
}

export class UpdateOrderDto implements UpdateOrderInput {
  @IsOptional() @ValidateNested() @Type(() => RecipientDto) recipient?: RecipientDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsIn(['pending', 'in_progress'] satisfies UpdateOrderInput['status'][])
  status?: UpdateOrderInput['status'];
}

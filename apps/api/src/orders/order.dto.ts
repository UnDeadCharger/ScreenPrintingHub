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
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreateOrderInput,
  OrderItem,
  ItemSide,
  Print,
  PrintColor,
  Recipient,
  UpdateOrderInput,
} from '@sph/shared';

// Reachable through a plain PATCH. completed/cancelled are final and go through their own endpoints.
const EDITABLE_STATUSES = [
  'pending',
  'in_progress',
  'printed',
  'shipping',
] as const satisfies readonly NonNullable<UpdateOrderInput['status']>[];

// Each class `implements` its shared interface so the compiler catches drift from the web app.

class RecipientDto implements Recipient {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

class PositionDto {
  @IsNumber() @Min(0) @Max(1) x!: number;
  @IsNumber() @Min(0) @Max(1) y!: number;
}

class PrintDto implements Print {
  // ponytail: only checks the id's shape; the design list lives in the web app.
  @Matches(/^[a-z0-9-]+$/) design!: string;
  @IsIn(['white', 'red', 'blue', 'black'] satisfies PrintColor[]) color!: PrintColor;
  @ValidateNested() @Type(() => PositionDto) position!: PositionDto;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) rotation?: number;
  @IsOptional() @IsString() notes?: string;
}

class ItemSideDto implements ItemSide {
  @IsString() @IsNotEmpty() photo!: string;
  @IsOptional() @IsNumber() @IsPositive() scale?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PrintDto) prints!: PrintDto[];
}

class OrderItemDto implements OrderItem {
  @IsString() @IsNotEmpty() productName!: string;
  @IsOptional() @IsString() productType?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @ValidateNested() @Type(() => ItemSideDto) front?: ItemSideDto;
  @IsOptional() @ValidateNested() @Type(() => ItemSideDto) back?: ItemSideDto;
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
  @IsIn(EDITABLE_STATUSES)
  status?: UpdateOrderInput['status'];
}

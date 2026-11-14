import { Schema, type InferSchemaType } from 'mongoose';

const required = { type: String, required: true } as const;

const PrintSchema = new Schema(
  {
    design: required,
    color: { type: String, enum: ['white', 'red', 'blue', 'black'], required: true },
    position: {
      x: { type: Number, required: true, min: 0, max: 1 },
      y: { type: Number, required: true, min: 0, max: 1 },
    },
    rotation: { type: Number, default: 0, min: -180, max: 180 },
    notes: String,
  },
  { _id: false },
);

const SideSchema = new Schema(
  {
    photo: required,
    scale: { type: Number, default: 1, min: 0 },
    prints: [PrintSchema],
  },
  { _id: false },
);

const OrderItemSchema = new Schema(
  {
    productName: required,
    productType: String,
    quantity: { type: Number, required: true, min: 1 },
    front: SideSchema,
    back: SideSchema,
  },
  { _id: false },
);

export const OrderSchema = new Schema(
  {
    recipient: { name: required, phone: String, address: String, notes: String },
    items: [OrderItemSchema],
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    completedAt: Date,
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof OrderSchema>;

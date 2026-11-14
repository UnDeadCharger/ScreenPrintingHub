import { Schema, type InferSchemaType } from 'mongoose';

const required = { type: String, required: true } as const;

const PrintSchema = new Schema(
  {
    productImage: required,
    designImage: required,
    position: {
      x: { type: Number, required: true, min: 0, max: 1 },
      y: { type: Number, required: true, min: 0, max: 1 },
      scale: { type: Number, default: 1, min: 0 },
    },
    label: String,
    notes: String,
  },
  { _id: false },
);

const OrderItemSchema = new Schema(
  {
    productName: required,
    productType: String,
    quantity: { type: Number, required: true, min: 1 },
    prints: [PrintSchema],
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

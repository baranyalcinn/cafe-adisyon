import { z } from 'zod'

// Reusable schemas
const cuidSchema = z.string().min(1, 'ID gerekli')
const nameSchema = z.string().min(1, 'İsim boş olamaz').max(100, 'İsim çok uzun')
const priceSchema = z
  .number()
  .positive('Fiyat pozitif olmalı')
  .transform((val) => Math.round(val))

// Table Schemas
export const tableSchemas = {
  create: z.object({
    name: nameSchema.max(50, 'Masa ismi çok uzun')
  }),
  delete: z.object({
    id: cuidSchema
  })
}

// Category Schemas
export const categorySchemas = {
  create: z.object({
    name: nameSchema
  }),
  update: z.object({
    id: cuidSchema,
    data: z.object({
      name: nameSchema.optional(),
      icon: z.string().max(50).optional()
    })
  }),
  delete: z.object({
    id: cuidSchema
  })
}

// Product Schemas
export const productSchemas = {
  create: z.object({
    name: nameSchema,
    price: priceSchema,
    categoryId: cuidSchema,
    isFavorite: z.boolean().optional().default(false)
  }),
  update: z.object({
    id: cuidSchema,
    data: z.object({
      name: nameSchema.optional(),
      price: priceSchema.optional(),
      categoryId: cuidSchema.optional(),
      isFavorite: z.boolean().optional()
    })
  }),
  delete: z.object({
    id: cuidSchema
  })
}

// Order Schemas
export const orderSchemas = {
  create: z.object({
    tableId: cuidSchema
  }),
  update: z.object({
    orderId: cuidSchema,
    data: z.object({
      status: z.enum(['OPEN', 'CLOSED']).optional(),
      totalAmount: z.number().int().nonnegative().optional(),
      isLocked: z.boolean().optional()
    })
  }),
  addItem: z.object({
    orderId: cuidSchema,
    productId: cuidSchema,
    quantity: z.number().int().positive('Miktar en az 1 olmalı'),
    unitPrice: priceSchema
  }),
  updateItem: z.object({
    orderItemId: cuidSchema,
    quantity: z.number().int().positive('Miktar en az 1 olmalı')
  }),
  removeItem: z.object({
    orderItemId: cuidSchema
  }),
  transfer: z.object({
    orderId: cuidSchema,
    targetTableId: cuidSchema
  }),
  merge: z.object({
    sourceOrderId: cuidSchema,
    targetOrderId: cuidSchema
  })
}

// Payment Schemas
export const paymentSchemas = {
  create: z.object({
    orderId: cuidSchema,
    amount: z.number().int().positive('Ödeme miktarı pozitif olmalı'),
    paymentMethod: z.enum(['CASH', 'CARD'])
  })
}

// Helper function to validate input
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errorMessages = result.error.issues.map((e) => e.message).join(', ')
  return { success: false, error: errorMessages }
}

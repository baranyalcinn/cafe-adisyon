import { z } from 'zod'

// ============================================================================
// Shared Reusable Schemas
// ============================================================================
export const cuidSchema = z.string().min(1, 'ID gerekli')
export const nameSchema = z.string().min(1, 'İsim boş olamaz').max(100, 'İsim çok uzun')
export const priceSchema = z
  .number()
  .nonnegative('Fiyat negatif olamaz')
  .max(999900, 'Maksimum tutar 9999₺')
  .transform((val) => Math.round(val))

// ============================================================================
// Standard Response Wrapper
// ============================================================================
export const responseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
): z.ZodObject<{
  success: z.ZodBoolean
  data: z.ZodOptional<T>
  error: z.ZodOptional<z.ZodString>
}> =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional()
  })

// ============================================================================
// Feature Specific Input Schemas
// ============================================================================

export const tableSchemas = {
  create: z.object({ name: nameSchema.max(50) }),
  delete: z.object({ id: cuidSchema })
}

// DRY: Kategori temel şemasını oluşturup Create ve Update için paylaştırıyoruz
const categoryBase = z.object({
  name: nameSchema,
  icon: z.string().max(50).optional()
})

export const categorySchemas = {
  create: categoryBase,
  update: z.object({ id: cuidSchema, data: categoryBase.partial() }), // .partial() tüm alanları otomatik optional yapar
  delete: z.object({ id: cuidSchema })
}

// DRY: Ürün temel şeması
const productBase = z.object({
  name: nameSchema,
  price: priceSchema,
  categoryId: cuidSchema,
  isFavorite: z.boolean().optional().default(false)
})

export const productSchemas = {
  create: productBase,
  update: z.object({ id: cuidSchema, data: productBase.partial() }),
  delete: z.object({ id: cuidSchema }),
  getByCategory: z.object({ categoryId: cuidSchema }),
  search: z.object({ query: z.string() })
}

export const orderSchemas = {
  create: z.object({ tableId: cuidSchema }),
  getByTable: z.object({ tableId: cuidSchema }),
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
    quantity: z.number().int().positive(),
    unitPrice: priceSchema
  }),
  updateItem: z.object({
    orderItemId: cuidSchema,
    quantity: z.number().int().positive()
  }),
  removeItem: z.object({ orderItemId: cuidSchema }),
  transfer: z.object({ orderId: cuidSchema, targetTableId: cuidSchema }),
  merge: z.object({ sourceOrderId: cuidSchema, targetOrderId: cuidSchema }),
  markItemsPaid: z.object({
    items: z.array(z.object({ id: cuidSchema, quantity: z.number().int().positive() })),
    paymentDetails: z
      .object({ amount: z.number().int().positive(), method: z.enum(['CASH', 'CARD']) })
      .optional()
  }),
  delete: z.object({ orderId: cuidSchema }),
  toggleLock: z.object({ orderId: cuidSchema, isLocked: z.boolean() }),
  getHistory: z
    .object({
      date: z.string().optional(),
      limit: z.number().int().nonnegative().optional(),
      offset: z.number().int().nonnegative().optional()
    })
    .optional()
}

export const paymentSchemas = {
  create: z.object({
    orderId: cuidSchema,
    amount: z.number().int().positive().max(999900, 'Maksimum ödeme 9999₺'),
    paymentMethod: z.enum(['CASH', 'CARD']),
    options: z
      .object({
        skipLog: z.boolean().optional(),
        // Backend'deki refactoring ile uyumlu hale getirildi (Kritik Güvenlik Yaması)
        itemsToMarkPaid: z
          .array(
            z.object({
              id: cuidSchema,
              quantity: z.number().int().positive()
            })
          )
          .optional()
      })
      .optional()
  }),
  getByOrder: z.object({ orderId: cuidSchema })
}

// DRY: Gider temel şeması
const expenseBase = z.object({
  description: z.string().min(1),
  amount: priceSchema,
  category: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD']).optional()
})

export const expenseSchemas = {
  create: expenseBase,
  update: z.object({ id: cuidSchema, data: expenseBase.partial() }),
  delete: z.object({ id: cuidSchema })
}

export const adminSchemas = {
  verifyPin: z.object({ pin: z.string().min(4) }),
  changePin: z.object({ currentPin: z.string().min(4), newPin: z.string().min(4) }),
  setRecovery: z.object({
    currentPin: z.string().min(4),
    question: z.string().min(1),
    answer: z.string().min(1)
  }),
  resetPin: z.object({ answer: z.string().min(1) })
}

export const reportSchemas = {
  getMonthly: z.object({ limit: z.number().int().optional().default(12) }),
  zReportHistory: z.object({
    limit: z.number().int().optional().default(30),
    startDate: z.union([z.string(), z.date()]).optional(),
    endDate: z.union([z.string(), z.date()]).optional()
  }),
  zReportGenerate: z.object({ actualCash: z.number().int().nonnegative().optional() })
}

// ============================================================================
// Validation Helper
// ============================================================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Daha temiz ve anlaşılır hata loglaması (Örn: "data.price: Fiyat negatif olamaz")
  const errorMessages = result.error.issues
    .map((issue) => {
      const fieldPath = issue.path.join('.')
      return fieldPath ? `[${fieldPath}]: ${issue.message}` : issue.message
    })
    .join(' | ')

  return { success: false, error: errorMessages }
}

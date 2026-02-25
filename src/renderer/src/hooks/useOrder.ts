import {
  type UseMutateFunction,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { cafeApi, type Order, type OrderItem, type PaymentMethod, type Product } from '../lib/api'
import { toast } from '../store/useToastStore'

// ============================================================================
// Pure Helpers
// ============================================================================

const generateTempId = (): string => `temp-${Math.random().toString(36).substring(2, 9)}`

// Sepet tutarını hesaplayan saf fonksiyon (Kod tekrarını önler)
const calculateTotalAmount = (items: NonNullable<Order['items']>): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

// ============================================================================
// Types
// ============================================================================

type MutationContext = { previousOrder: Order | null | undefined }

interface UseOrderResult {
  order: Order | null | undefined
  isLoading: boolean
  isRefetching: boolean
  error: unknown
  addItem: UseMutateFunction<Order, Error, { product: Product; quantity: number }, MutationContext>
  updateItem: UseMutateFunction<
    Order,
    Error,
    { orderItemId: string; quantity: number },
    MutationContext
  >
  removeItem: UseMutateFunction<Order, Error, string, MutationContext>
  processPayment: (variables: {
    amount: number
    method: PaymentMethod
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  }) => Promise<{ order: Order; completed: boolean }>
  toggleLock: UseMutateFunction<void | undefined, Error, void, MutationContext>
  deleteOrder: UseMutateFunction<void, Error, string, unknown>
  markItemsPaid: (
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: string }
  ) => Promise<Order>
  isLocked: boolean
}

// ============================================================================
// Hook
// ============================================================================

export function useOrder(tableId: string | null): UseOrderResult {
  const queryClient = useQueryClient()
  const queryKey = ['order', tableId]

  // --- Fetch Base Order ---
  const orderQuery = useQuery({
    queryKey,
    queryFn: () => (tableId ? cafeApi.orders.getOpenByTable(tableId) : null),
    enabled: !!tableId,
    staleTime: 5_000 // Mutasyonlar zaten cache'i bozduğu için 5 sn güvenli
  })

  // ============================================================================
  // Mutation Boilerplate Handlers (DRY Prensibi)
  // ============================================================================

  // 1. Ortak Optimistic Update Kurulumu
  const executeOptimisticUpdate = async (
    updater: (old: Order | null | undefined) => Order | null
  ): Promise<MutationContext> => {
    await queryClient.cancelQueries({ queryKey })
    const previousOrder = queryClient.getQueryData<Order | null>(queryKey)
    queryClient.setQueryData<Order | null>(queryKey, updater)
    return { previousOrder }
  }

  // 2. Ortak Hata Yönetimi (Rollback)
  const handleOptimisticError =
    (actionName: string) =>
    (err: Error, _vars: unknown, context: MutationContext | undefined): void => {
      if (context?.previousOrder) {
        queryClient.setQueryData(queryKey, context.previousOrder)
      }
      toast({
        title: 'İşlem Başarısız',
        description: `${actionName} sırasında hata oluştu: ${err.message}`,
        variant: 'destructive'
      })
    }

  // 3. Ortak Tamamlanma Durumu (Cache Tazeleme)
  const handleSettled = (): void => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['tables'] }) // Masalar listesini de tetikle
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  const addItemMutation = useMutation<
    Order,
    Error,
    { product: Product; quantity: number },
    MutationContext
  >({
    mutationFn: async ({ product, quantity }: { product: Product; quantity: number }) => {
      if (!tableId) throw new Error('Masa seçilmedi')

      const currentOrder = orderQuery.data
      let orderId = currentOrder?.id

      if (!orderId) {
        const newOrder = await cafeApi.orders.create(tableId)
        orderId = newOrder.id
      }
      return cafeApi.orders.addItem(orderId, product.id, quantity, product.price)
    },
    onMutate: async ({ product, quantity }): Promise<MutationContext> => {
      if (!tableId) throw new Error('Masa seçilmedi')

      return executeOptimisticUpdate((old) => {
        // Sepet boşsa sıfırdan oluştur
        if (!old) {
          return {
            id: 'temp-order',
            tableId,
            status: 'OPEN',
            items: [
              {
                id: generateTempId(),
                orderId: 'temp-order',
                productId: product.id,
                product,
                quantity,
                unitPrice: product.price,
                isPaid: false
              } as OrderItem
            ],
            totalAmount: product.price * quantity,
            createdAt: new Date(),
            updatedAt: new Date(),
            isLocked: false
          } as Order
        }

        const newItems = [...(old.items || [])]
        const existingItemIndex = newItems.findIndex((i) => i.productId === product.id && !i.isPaid)

        if (existingItemIndex > -1) {
          const existingItem = newItems[existingItemIndex]
          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + quantity
          }
        } else {
          newItems.push({
            id: generateTempId(),
            orderId: old.id,
            productId: product.id,
            product,
            quantity,
            unitPrice: product.price,
            isPaid: false
          } as OrderItem)
        }

        return {
          ...old,
          items: newItems,
          totalAmount: calculateTotalAmount(newItems as OrderItem[])
        }
      })
    },
    onError: handleOptimisticError('Ürün ekleme'),
    onSettled: handleSettled
  })

  const updateItemMutation = useMutation<
    Order,
    Error,
    { orderItemId: string; quantity: number },
    MutationContext
  >({
    mutationFn: ({ orderItemId, quantity }: { orderItemId: string; quantity: number }) =>
      cafeApi.orders.updateItem(orderItemId, quantity),
    onMutate: async ({ orderItemId, quantity }) => {
      return executeOptimisticUpdate((old) => {
        if (!old || !old.items) return old ?? null
        const newItems = old.items.map((item) =>
          item.id === orderItemId ? { ...item, quantity } : item
        )
        return { ...old, items: newItems, totalAmount: calculateTotalAmount(newItems) }
      })
    },
    onError: handleOptimisticError('Ürün güncelleme'),
    onSettled: handleSettled
  })

  const removeItemMutation = useMutation<Order, Error, string, MutationContext>({
    mutationFn: (orderItemId: string) => cafeApi.orders.removeItem(orderItemId),
    onMutate: async (orderItemId) => {
      return executeOptimisticUpdate((old) => {
        if (!old || !old.items) return old ?? null
        const newItems = old.items.filter((item) => item.id !== orderItemId)
        return { ...old, items: newItems, totalAmount: calculateTotalAmount(newItems) }
      })
    },
    onError: handleOptimisticError('Ürün silme'),
    onSettled: handleSettled
  })

  const toggleLockMutation = useMutation<void | undefined, Error, void, MutationContext>({
    mutationFn: async () => {
      const currentOrder = orderQuery.data
      if (!currentOrder) return
      await cafeApi.orders.update(currentOrder.id, { isLocked: !currentOrder.isLocked })
    },
    onMutate: async () => {
      return executeOptimisticUpdate((old) => {
        if (!old) return old ?? null
        return { ...old, isLocked: !old.isLocked }
      })
    },
    onError: handleOptimisticError('Masa kilitleme'),
    onSettled: handleSettled
  })

  // --- Non-Optimistic Mutations (Sunucu Onayı Gerektirenler) ---

  const paymentMutation = useMutation({
    mutationFn: async ({
      amount,
      method,
      options
    }: {
      amount: number
      method: PaymentMethod
      options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
    }) => {
      const currentOrder = orderQuery.data
      if (!currentOrder) throw new Error('Ödenecek adisyon bulunamadı')
      return cafeApi.payments.create(currentOrder.id, amount, method, options)
    },
    onSuccess: (data) => {
      if (data.order.status === 'CLOSED') {
        toast({ title: 'Ödeme Başarılı', description: 'Adisyon kapatıldı.', variant: 'success' })
        queryClient.setQueryData(queryKey, null)
      } else {
        toast({ title: 'Ödeme Alındı', description: 'Kısmi ödeme başarılı.', variant: 'success' })
      }
    },
    onSettled: handleSettled
  })

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => cafeApi.orders.delete(orderId),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null)
      toast({ title: 'Başarılı', description: 'Masa boşaltıldı', variant: 'success' })
    },
    onSettled: handleSettled
  })

  const markItemsPaidMutation = useMutation({
    mutationFn: async ({
      items,
      paymentDetails
    }: {
      items: { id: string; quantity: number }[]
      paymentDetails?: { amount: number; method: string }
    }) => {
      const currentOrder = orderQuery.data
      if (!currentOrder) throw new Error('Sipariş bulunamadı')
      return cafeApi.orders.markItemsPaid(items, paymentDetails)
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(queryKey, updatedOrder)
      toast({
        title: 'Başarılı',
        description: 'Ürünler ödendi olarak işaretlendi.',
        variant: 'success'
      })
    },
    onSettled: handleSettled
  })

  return {
    order: orderQuery.data,
    isLoading: orderQuery.isLoading,
    isRefetching: orderQuery.isRefetching,
    error: orderQuery.error,

    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    processPayment: paymentMutation.mutateAsync,
    toggleLock: toggleLockMutation.mutate,
    markItemsPaid: (items, paymentDetails) =>
      markItemsPaidMutation.mutateAsync({ items, paymentDetails }),
    deleteOrder: deleteOrderMutation.mutate,

    isLocked: orderQuery.data?.isLocked ?? false
  }
}

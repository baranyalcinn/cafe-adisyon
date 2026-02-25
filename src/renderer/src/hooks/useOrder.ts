import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutateFunction
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { cafeApi, type Order, type OrderItem, type PaymentMethod, type Product } from '../lib/api'
import { toast } from '../store/useToastStore'

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

type QueryKeyType = ['order', string | null]

// ============================================================================
// Pure Helpers (Render döngüsü dışında tanımlanarak RAM sızıntısı önlendi)
// ============================================================================

const generateTempId = (): string => `temp-${Math.random().toString(36).substring(2, 9)}`

const calculateTotalAmount = (items: NonNullable<Order['items']>): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

const executeOptimisticUpdate = async (
  queryClient: QueryClient,
  queryKey: QueryKeyType,
  updater: (old: Order | null | undefined) => Order | null
): Promise<MutationContext> => {
  await queryClient.cancelQueries({ queryKey })
  const previousOrder = queryClient.getQueryData<Order | null>(queryKey)
  queryClient.setQueryData<Order | null>(queryKey, updater)
  return { previousOrder }
}

const handleOptimisticError = (actionName: string) => {
  return (
    err: Error,
    _vars: unknown,
    context: MutationContext | undefined,
    queryClient: QueryClient,
    queryKey: QueryKeyType
  ): void => {
    if (context?.previousOrder) {
      queryClient.setQueryData(queryKey, context.previousOrder)
    }
    toast({
      title: 'İşlem Başarısız',
      description: `${actionName} sırasında hata oluştu: ${err.message}`,
      variant: 'destructive'
    })
  }
}

const handleSettled = (queryClient: QueryClient, queryKey: QueryKeyType): void => {
  void queryClient.invalidateQueries({ queryKey })
  void queryClient.invalidateQueries({ queryKey: ['tables'] }) // Masalar listesini de tetikle
}

// ============================================================================
// Hook
// ============================================================================

export function useOrder(tableId: string | null): UseOrderResult {
  const queryClient = useQueryClient()

  // Referans sabitleme: Her render'da yeni dizi oluşturmayı önler
  const queryKey = useMemo<QueryKeyType>(() => ['order', tableId], [tableId])

  // --- Fetch Base Order ---
  const orderQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<Order | null> => {
      if (!tableId) return null
      return cafeApi.orders.getOpenByTable(tableId)
    },
    enabled: !!tableId,
    staleTime: 5_000 // Mutasyonlar zaten cache'i bozduğu için 5 sn güvenli
  })

  // ============================================================================
  // Mutations
  // ============================================================================

  const addItemMutation = useMutation<
    Order,
    Error,
    { product: Product; quantity: number },
    MutationContext
  >({
    mutationFn: async ({ product, quantity }): Promise<Order> => {
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

      return executeOptimisticUpdate(queryClient, queryKey, (old) => {
        if (!old) {
          const newItems: OrderItem[] = [
            {
              id: generateTempId(),
              orderId: 'temp-order',
              productId: product.id,
              product,
              quantity,
              unitPrice: product.price,
              isPaid: false
            } as OrderItem
          ]
          return {
            id: 'temp-order',
            tableId,
            status: 'OPEN',
            items: newItems,
            totalAmount: calculateTotalAmount(newItems),
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
          totalAmount: calculateTotalAmount(newItems)
        }
      })
    },
    onError: (err, vars, context): void =>
      handleOptimisticError('Ürün ekleme')(err, vars, context, queryClient, queryKey),
    onSettled: (): void => handleSettled(queryClient, queryKey)
  })

  const updateItemMutation = useMutation<
    Order,
    Error,
    { orderItemId: string; quantity: number },
    MutationContext
  >({
    mutationFn: ({ orderItemId, quantity }): Promise<Order> =>
      cafeApi.orders.updateItem(orderItemId, quantity),
    onMutate: async ({ orderItemId, quantity }): Promise<MutationContext> => {
      return executeOptimisticUpdate(queryClient, queryKey, (old) => {
        if (!old || !old.items) return old ?? null
        const newItems = old.items.map((item) =>
          item.id === orderItemId ? { ...item, quantity } : item
        )
        return { ...old, items: newItems, totalAmount: calculateTotalAmount(newItems) }
      })
    },
    onError: (err, vars, context): void =>
      handleOptimisticError('Ürün güncelleme')(err, vars, context, queryClient, queryKey),
    onSettled: (): void => handleSettled(queryClient, queryKey)
  })

  const removeItemMutation = useMutation<Order, Error, string, MutationContext>({
    mutationFn: (orderItemId: string): Promise<Order> => cafeApi.orders.removeItem(orderItemId),
    onMutate: async (orderItemId): Promise<MutationContext> => {
      return executeOptimisticUpdate(queryClient, queryKey, (old) => {
        if (!old || !old.items) return old ?? null
        const newItems = old.items.filter((item) => item.id !== orderItemId)
        return { ...old, items: newItems, totalAmount: calculateTotalAmount(newItems) }
      })
    },
    onError: (err, vars, context): void =>
      handleOptimisticError('Ürün silme')(err, vars, context, queryClient, queryKey),
    onSettled: (): void => handleSettled(queryClient, queryKey)
  })

  const toggleLockMutation = useMutation<void | undefined, Error, void, MutationContext>({
    mutationFn: async (): Promise<void> => {
      const currentOrder = orderQuery.data
      if (!currentOrder) return
      await cafeApi.orders.update(currentOrder.id, { isLocked: !currentOrder.isLocked })
    },
    onMutate: async (): Promise<MutationContext> => {
      return executeOptimisticUpdate(queryClient, queryKey, (old) => {
        if (!old) return old ?? null
        return { ...old, isLocked: !old.isLocked }
      })
    },
    onError: (err, vars, context): void =>
      handleOptimisticError('Masa kilitleme')(err, vars, context, queryClient, queryKey),
    onSettled: (): void => handleSettled(queryClient, queryKey)
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
    }): Promise<{ order: Order; completed: boolean }> => {
      const currentOrder = orderQuery.data
      if (!currentOrder) throw new Error('Ödenecek adisyon bulunamadı')
      return cafeApi.payments.create(currentOrder.id, amount, method, options)
    },
    onSuccess: (data): void => {
      if (data.order.status === 'CLOSED') {
        toast({ title: 'Ödeme Başarılı', description: 'Adisyon kapatıldı.', variant: 'success' })
        queryClient.setQueryData(queryKey, null)
      } else {
        toast({ title: 'Ödeme Alındı', description: 'Kısmi ödeme başarılı.', variant: 'success' })
      }
    },
    onSettled: (): void => handleSettled(queryClient, queryKey)
  })

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string): Promise<void> => cafeApi.orders.delete(orderId),
    onSuccess: (): void => {
      queryClient.setQueryData(queryKey, null)
      toast({ title: 'Başarılı', description: 'Masa boşaltıldı', variant: 'success' })
    },
    onSettled: (): void => handleSettled(queryClient, queryKey)
  })

  const markItemsPaidMutation = useMutation({
    mutationFn: async ({
      items,
      paymentDetails
    }: {
      items: { id: string; quantity: number }[]
      paymentDetails?: { amount: number; method: string }
    }): Promise<Order> => {
      const currentOrder = orderQuery.data
      if (!currentOrder) throw new Error('Sipariş bulunamadı')
      return cafeApi.orders.markItemsPaid(items, paymentDetails)
    },
    onSuccess: (updatedOrder): void => {
      queryClient.setQueryData(queryKey, updatedOrder)
      toast({
        title: 'Başarılı',
        description: 'Ürünler ödendi olarak işaretlendi.',
        variant: 'success'
      })
    },
    onSettled: (): void => handleSettled(queryClient, queryKey)
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
    markItemsPaid: async (items, paymentDetails): Promise<Order> =>
      markItemsPaidMutation.mutateAsync({ items, paymentDetails }),
    deleteOrder: deleteOrderMutation.mutate,

    isLocked: orderQuery.data?.isLocked ?? false
  }
}

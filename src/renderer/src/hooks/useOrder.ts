import { UseMutateFunction, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cafeApi, Order, PaymentMethod, Product } from '../lib/api'
import { toast } from '../store/useToastStore'

// We need a way to generate temp IDs for optimistic updates
const generateTempId = (): string => `temp-${Math.random().toString(36).substr(2, 9)}`

interface UseOrderResult {
  order: Order | null | undefined
  isLoading: boolean
  isRefetching: boolean
  error: unknown
  addItem: UseMutateFunction<Order, Error, { product: Product; quantity: number }, unknown>
  updateItem: UseMutateFunction<Order, Error, { orderItemId: string; quantity: number }, unknown>
  removeItem: UseMutateFunction<Order, Error, string, unknown>
  processPayment: (variables: {
    amount: number
    method: PaymentMethod
    options?: { skipLog?: boolean }
  }) => Promise<{ order: Order; completed: boolean }>
  toggleLock: UseMutateFunction<void | undefined, Error, void, unknown>
  deleteOrder: UseMutateFunction<void, Error, string, unknown>
  markItemsPaid: (
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: string }
  ) => Promise<Order>
  isLocked: boolean
}

export function useOrder(tableId: string | null): UseOrderResult {
  const queryClient = useQueryClient()
  const queryKey = ['order', tableId]

  // --- Fetch Order ---
  const orderQuery = useQuery({
    queryKey,
    queryFn: () => (tableId ? cafeApi.orders.getOpenByTable(tableId) : null),
    enabled: !!tableId,
    staleTime: 5_000 // Mutations invalidate cache, so 5s is safe
  })

  // --- Mutations ---

  // 1. Add Item
  const addItemMutation = useMutation({
    mutationFn: async ({ product, quantity }: { product: Product; quantity: number }) => {
      if (!tableId) throw new Error('No table selected')

      const currentOrder = orderQuery.data
      let orderId = currentOrder?.id

      if (!orderId) {
        // Create order first
        const newOrder = await cafeApi.orders.create(tableId)
        orderId = newOrder.id
      }

      return cafeApi.orders.addItem(orderId, product.id, quantity, product.price)
    },
    onMutate: async ({ product, quantity }) => {
      if (!tableId) return

      await queryClient.cancelQueries({ queryKey })

      const previousOrder = queryClient.getQueryData<Order | null>(queryKey)

      // Optimistic Update
      queryClient.setQueryData<Order | null>(queryKey, (old) => {
        if (!old) {
          // If no order exists, we are creating one optimistically.
          return {
            id: 'temp-order',
            tableId,
            status: 'OPEN',
            items: [
              {
                id: generateTempId(),
                orderId: 'temp-order',
                productId: product.id,
                product: product,
                quantity,
                unitPrice: product.price,
                isPaid: false
              }
            ],
            totalAmount: product.price * quantity,
            createdAt: new Date(),
            updatedAt: new Date(),
            isLocked: false // Default for optimistic
          } // No cast needed if type matches Order interface
        }

        // Existing order - find only UNPAID items to increment
        const existingItemIndex = old.items?.findIndex(
          (i) => i.productId === product.id && !i.isPaid
        )
        const newItems = [...(old.items || [])]

        if (existingItemIndex !== undefined && existingItemIndex > -1) {
          // Update existing item
          const existingItem = newItems[existingItemIndex]
          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + quantity
            // totalPrice removed as it's not on OrderItem type
          }
        } else {
          // Add new item
          newItems.push({
            id: generateTempId(),
            orderId: old.id,
            productId: product.id,
            product: product, // Store full product for UI
            quantity,
            unitPrice: product.price,
            isPaid: false
          })
        }

        const newTotal = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

        return {
          ...old,
          items: newItems,
          totalAmount: newTotal
        }
      })

      return { previousOrder }
    },
    onError: (err, _variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(queryKey, context.previousOrder)
      }
      toast({
        title: 'Hata',
        description: 'Ürün eklenirken bir hata oluştu: ' + String(err),
        variant: 'destructive'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      // Also invalidate tables list to show "DOLU" status if it was empty
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }
  })

  // 2. Update Item Quantity
  const updateItemMutation = useMutation({
    mutationFn: async ({ orderItemId, quantity }: { orderItemId: string; quantity: number }) => {
      return cafeApi.orders.updateItem(orderItemId, quantity)
    },
    onMutate: async ({ orderItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousOrder = queryClient.getQueryData<Order | null>(queryKey)

      queryClient.setQueryData<Order | null>(queryKey, (old) => {
        if (!old || !old.items) return old

        const newItems = old.items.map((item) => {
          if (item.id === orderItemId) {
            return { ...item, quantity }
          }
          return item
        })

        const newTotal = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

        return { ...old, items: newItems, totalAmount: newTotal }
      })

      return { previousOrder }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousOrder)
      toast({ title: 'Hata', description: 'Güncelleme hatası', variant: 'destructive' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey })
  })

  // 3. Remove Item
  const removeItemMutation = useMutation({
    mutationFn: async (orderItemId: string) => {
      return cafeApi.orders.removeItem(orderItemId)
    },
    onMutate: async (orderItemId) => {
      await queryClient.cancelQueries({ queryKey })
      const previousOrder = queryClient.getQueryData<Order | null>(queryKey)

      queryClient.setQueryData<Order | null>(queryKey, (old) => {
        if (!old || !old.items) return old
        const newItems = old.items.filter((item) => item.id !== orderItemId)
        const newTotal = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        return { ...old, items: newItems, totalAmount: newTotal }
      })

      return { previousOrder }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousOrder)
      toast({ title: 'Hata', description: 'Silme hatası', variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['tables'] }) // Might become empty
    }
  })

  // 4. Payment
  const paymentMutation = useMutation({
    mutationFn: async ({
      amount,
      method,
      options
    }: {
      amount: number
      method: PaymentMethod
      options?: { skipLog?: boolean }
    }) => {
      const currentOrder = orderQuery.data
      if (!currentOrder) throw new Error('No order to pay')

      const result = await cafeApi.payments.create(currentOrder.id, amount, method, options)
      return result
    },
    onSuccess: (data) => {
      if (data.order.status === 'CLOSED') {
        toast({ title: 'Ödeme Başarılı', description: 'Adisyon kapatıldı.', variant: 'success' })
        // If closed, query usually returns null for "open order".
        // We can set cache to null or invalidate.
        queryClient.setQueryData(queryKey, null)
      } else {
        toast({ title: 'Ödeme Alındı', description: 'Kısmi ödeme başarılı.', variant: 'success' })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }
  })

  // 5. Toggle Lock
  const toggleLockMutation = useMutation({
    mutationFn: async () => {
      const currentOrder = orderQuery.data
      if (!currentOrder) return
      await cafeApi.orders.update(currentOrder.id, { isLocked: !currentOrder.isLocked })
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousOrder = queryClient.getQueryData<Order | null>(queryKey)

      queryClient.setQueryData<Order | null>(queryKey, (old) => {
        if (!old) return old
        return { ...old, isLocked: !old.isLocked }
      })

      return { previousOrder }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousOrder)
      toast({ title: 'Hata', description: 'Kilit işlemi başarısız', variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }
  })

  // 6. Delete Order
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await cafeApi.orders.delete(orderId)
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null)
      toast({ title: 'Başarılı', description: 'Masa boşaltıldı', variant: 'success' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }
  })

  // 7. Mark Items Paid
  const markItemsPaidMutation = useMutation({
    mutationFn: async ({
      items,
      paymentDetails
    }: {
      items: { id: string; quantity: number }[]
      paymentDetails?: { amount: number; method: string }
    }) => {
      const currentOrder = orderQuery.data
      if (!currentOrder) throw new Error('No order found')
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }
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

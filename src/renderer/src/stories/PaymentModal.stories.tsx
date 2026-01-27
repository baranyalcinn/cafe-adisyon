import type { Meta, StoryObj } from '@storybook/react'
import { PaymentModal } from '@/features/payments/PaymentModal'
import { Toaster } from '@/components/ui/toaster'

// Mock wrapper for modal state
const meta: Meta<typeof PaymentModal> = {
  title: 'Features/PaymentModal',
  component: PaymentModal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted/20">
        <Story />
        <Toaster />
      </div>
    )
  ],
  argTypes: {
    open: { control: 'boolean' },
    onClose: { action: 'closed' },
    onProcessPayment: { action: 'payment processed' },
    onMarkItemsPaid: { action: 'items marked paid' }
  }
}

export default meta
type Story = StoryObj<typeof PaymentModal>

const mockOrder = {
  id: '1',
  tableId: 't1',
  status: 'OPEN',
  totalAmount: 1250.5,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'i1',
      orderId: '1',
      productId: 'p1',
      quantity: 2,
      unitPrice: 85,
      isPaid: false,
      product: { name: 'Latte' }
    },
    {
      id: 'i2',
      orderId: '1',
      productId: 'p2',
      quantity: 1,
      unitPrice: 250,
      isPaid: false,
      product: { name: 'Burger' }
    },
    {
      id: 'i3',
      orderId: '1',
      productId: 'p3',
      quantity: 3,
      unitPrice: 276.83, // Random price to test decimals
      isPaid: false,
      product: { name: 'Special Steak' }
    }
  ],
  payments: []
}

export const Default: Story = {
  args: {
    open: true,
    order: mockOrder as any, // Type cast for simplified mock
    onProcessPayment: async () => new Promise((resolve) => setTimeout(resolve, 1000)),
    onMarkItemsPaid: async () => new Promise((resolve) => setTimeout(resolve, 500))
  }
}

export const PartialPayment: Story = {
  args: {
    ...Default.args,
    order: {
      ...mockOrder,
      payments: [{ id: 'pay1', amount: 500, method: 'CASH', createdAt: new Date() }]
    } as any
  }
}

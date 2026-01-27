import type { Meta, StoryObj } from '@storybook/react'
import { ProductCard } from '@/features/orders/ProductCard'

// Mock wrapper to provide context if needed, or simple display
const meta: Meta<typeof ProductCard> = {
  title: 'Features/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[300px] p-4 bg-background border rounded-xl">
        <Story />
      </div>
    )
  ],
  argTypes: {
    product: { control: 'object' }
  }
}

export default meta
type Story = StoryObj<typeof ProductCard>

export const Default: Story = {
  args: {
    product: {
      id: '1',
      name: 'Latte',
      price: 85,
      categoryId: 'cat1',
      isFavorite: false,
      category: { id: 'cat1', name: 'Kahveler' }
    }
  }
}

export const Favorite: Story = {
  args: {
    product: {
      id: '2',
      name: 'Special Burger',
      price: 250,
      categoryId: 'cat2',
      isFavorite: true,
      category: { id: 'cat2', name: 'Yemekler' }
    }
  }
}

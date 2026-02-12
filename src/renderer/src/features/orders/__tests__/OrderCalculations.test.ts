import { describe, it, expect } from 'vitest'

/**
 * Pure logic tests for order calculation functions.
 * These test the same math used by OrderService and useOrder hook.
 */

// Replicates the total calculation used in useOrder optimistic updates
// and OrderService.recalculateOrderTotal
function calculateOrderTotal(items: { quantity: number; unitPrice: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

// Replicates the payment cap logic used in PaymentModal
function calculateEffectivePayment(attemptedAmount: number, remainingAmount: number): number {
  return Math.min(attemptedAmount, remainingAmount)
}

// Replicates the split calculation used in PaymentModal
function calculateSplitShare(total: number, splitCount: number): number {
  return Math.ceil(total / splitCount)
}

// Replicates the remaining amount after partial payments
function calculateRemainingAmount(totalAmount: number, payments: { amount: number }[]): number {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  return totalAmount - totalPaid
}

describe('Order Total Calculation', () => {
  it('should calculate total for single item', () => {
    const items = [{ quantity: 2, unitPrice: 500 }] // 2x 5.00 TL
    expect(calculateOrderTotal(items)).toBe(1000)
  })

  it('should calculate total for multiple items', () => {
    const items = [
      { quantity: 2, unitPrice: 500 }, // 10.00 TL
      { quantity: 1, unitPrice: 1500 }, // 15.00 TL
      { quantity: 3, unitPrice: 200 } // 6.00 TL
    ]
    expect(calculateOrderTotal(items)).toBe(3100) // 31.00 TL
  })

  it('should return 0 for empty order', () => {
    expect(calculateOrderTotal([])).toBe(0)
  })

  it('should handle quantity of 1 correctly', () => {
    const items = [{ quantity: 1, unitPrice: 750 }]
    expect(calculateOrderTotal(items)).toBe(750)
  })
})

describe('Payment Cap Logic', () => {
  it('should cap payment at remaining amount', () => {
    expect(calculateEffectivePayment(6000, 5000)).toBe(5000)
  })

  it('should allow exact payment', () => {
    expect(calculateEffectivePayment(5000, 5000)).toBe(5000)
  })

  it('should allow partial payment less than remaining', () => {
    expect(calculateEffectivePayment(2000, 5000)).toBe(2000)
  })
})

describe('Split Payment Calculation', () => {
  it('should round up split amounts to avoid loss', () => {
    const splitShare = calculateSplitShare(100, 3) // 33.33... → 34
    expect(splitShare).toBe(34)
    expect(splitShare * 3).toBeGreaterThanOrEqual(100)
  })

  it('should handle perfect splits', () => {
    expect(calculateSplitShare(100, 2)).toBe(50)
    expect(calculateSplitShare(100, 4)).toBe(25)
  })

  it('should handle split by 1 (no split)', () => {
    expect(calculateSplitShare(5000, 1)).toBe(5000)
  })

  it('should round up for uneven splits', () => {
    const splitShare = calculateSplitShare(1000, 3) // 333.33 → 334
    expect(splitShare).toBe(334)
    expect(splitShare * 3).toBeGreaterThanOrEqual(1000)
  })
})

describe('Remaining Amount After Payments', () => {
  it('should calculate remaining after one payment', () => {
    const remaining = calculateRemainingAmount(5000, [{ amount: 2000 }])
    expect(remaining).toBe(3000)
  })

  it('should calculate remaining after multiple payments', () => {
    const remaining = calculateRemainingAmount(5000, [
      { amount: 1000 },
      { amount: 1500 },
      { amount: 500 }
    ])
    expect(remaining).toBe(2000)
  })

  it('should return 0 when fully paid', () => {
    const remaining = calculateRemainingAmount(5000, [{ amount: 5000 }])
    expect(remaining).toBe(0)
  })

  it('should return full amount with no payments', () => {
    const remaining = calculateRemainingAmount(5000, [])
    expect(remaining).toBe(5000)
  })
})

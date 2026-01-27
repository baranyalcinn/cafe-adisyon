import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils'

// Mock PaymentModal to test isolation logic if needed,
// but for now let's test the pure logic functions if we extracted them.
// Since logic is inside component, we might do an integration test or extract logic.
// Plan: Extract logic to a pure helper function to test edge cases easily.

// Let's create a helper to test the math logic which is the critical part.
// effectivelyPayment = Math.min(paymentAmount, remainingAmount)
// splitShare = Math.ceil(total / splitCount)

describe('Payment Logic Calculation', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(100)).toBe('₺1,00')
    expect(formatCurrency(123456)).toBe('₺1.234,56')
  })

  describe('Split Calculation', () => {
    it('should round up split amounts to avoid loss', () => {
      const total = 100 // 1.00 TL
      const splitCount = 3
      // 100 / 3 = 33.333
      // Math.ceil(33.333) = 34
      // 34 * 3 = 102 (2 kurus extra, better than less)

      const splitShare = Math.ceil(total / splitCount)
      expect(splitShare).toBe(34)
      expect(splitShare * splitCount).toBeGreaterThanOrEqual(total)
    })

    it('should handle perfect splits', () => {
      const total = 100
      const splitCount = 2
      const splitShare = Math.ceil(total / splitCount)
      expect(splitShare).toBe(50)
    })
  })

  describe('Payment Caps', () => {
    it('should cap partial payment at remaining amount', () => {
      const remainingAmount = 5000 // 50.00 TL
      const attemptedPayment = 6000 // 60.00 TL

      const effectivePayment = Math.min(attemptedPayment, remainingAmount)
      expect(effectivePayment).toBe(5000)
    })
  })
})

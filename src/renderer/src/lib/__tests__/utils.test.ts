import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('₺ 0')
  })

  it('should format small amounts (kuruş only)', () => {
    expect(formatCurrency(50)).toBe('₺ 1') // 0.50 TL rounds to 1
    expect(formatCurrency(99)).toBe('₺ 1')
  })

  it('should format whole TL amounts', () => {
    expect(formatCurrency(100)).toBe('₺ 1')
    expect(formatCurrency(500)).toBe('₺ 5')
    expect(formatCurrency(1000)).toBe('₺ 10')
  })

  it('should format large amounts with thousands separator', () => {
    expect(formatCurrency(100000)).toBe('₺ 1.000')
    expect(formatCurrency(1234500)).toBe('₺ 12.345')
  })

  it('should handle negative amounts', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('-')
    expect(result).toContain('5')
  })
})

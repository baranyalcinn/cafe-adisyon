import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Class merging helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatter
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

// Tauri Result unwrapper
export type Result<T, E> = { status: 'ok'; data: T } | { status: 'error'; error: E }

export function unwrap<T>(result: Result<T, string>): T {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  return result.data
}

// Date mappers
export function mapDate(dateStr: string | null): Date {
  if (!dateStr) return new Date() // Fallback to now if null? Or throw?
  return new Date(dateStr)
}

export function mapDateOpt(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined
  return new Date(dateStr)
}

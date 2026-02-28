import {
  formatCurrency as sharedFormatCurrency,
  formatLira as sharedFormatLira
} from '@shared/utils/currency'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const formatCurrency = sharedFormatCurrency
export const formatLira = sharedFormatLira

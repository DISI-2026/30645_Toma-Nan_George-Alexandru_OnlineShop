import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.svg'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_URL}${url}`
}

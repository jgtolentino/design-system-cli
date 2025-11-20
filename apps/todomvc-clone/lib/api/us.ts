import { U } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getUs(): Promise<U[]> {
  const res = await fetch(`${API_BASE}/u/:id`)
  if (!res.ok) throw new Error('Failed to fetch us')
  return res.json()
}

export async function getU(id: string): Promise<U> {
  const res = await fetch(`${API_BASE}/u/:id/${id}`)
  if (!res.ok) throw new Error('Failed to fetch u')
  return res.json()
}

export async function createU(data: Partial<U>): Promise<U> {
  const res = await fetch(`${API_BASE}/u/:id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create u')
  return res.json()
}

export async function updateU(id: string, data: Partial<U>): Promise<U> {
  const res = await fetch(`${API_BASE}/u/:id/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update u')
  return res.json()
}

export async function deleteU(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/u/:id/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete u')
}
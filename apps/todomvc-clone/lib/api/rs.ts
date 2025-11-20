import { R } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getRs(): Promise<R[]> {
  const res = await fetch(`${API_BASE}/r/__utm.gif`)
  if (!res.ok) throw new Error('Failed to fetch rs')
  return res.json()
}

export async function getR(id: string): Promise<R> {
  const res = await fetch(`${API_BASE}/r/__utm.gif/${id}`)
  if (!res.ok) throw new Error('Failed to fetch r')
  return res.json()
}

export async function createR(data: Partial<R>): Promise<R> {
  const res = await fetch(`${API_BASE}/r/__utm.gif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create r')
  return res.json()
}

export async function updateR(id: string, data: Partial<R>): Promise<R> {
  const res = await fetch(`${API_BASE}/r/__utm.gif/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update r')
  return res.json()
}

export async function deleteR(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/r/__utm.gif/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete r')
}
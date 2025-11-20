import { I } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getIs(): Promise<I[]> {
  const res = await fetch(`${API_BASE}/i/jot/embeds`)
  if (!res.ok) throw new Error('Failed to fetch is')
  return res.json()
}

export async function getI(id: string): Promise<I> {
  const res = await fetch(`${API_BASE}/i/jot/embeds/${id}`)
  if (!res.ok) throw new Error('Failed to fetch i')
  return res.json()
}

export async function createI(data: Partial<I>): Promise<I> {
  const res = await fetch(`${API_BASE}/i/jot/embeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create i')
  return res.json()
}

export async function updateI(id: string, data: Partial<I>): Promise<I> {
  const res = await fetch(`${API_BASE}/i/jot/embeds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update i')
  return res.json()
}

export async function deleteI(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/i/jot/embeds/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete i')
}
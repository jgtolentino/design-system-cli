import { O } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getOs(): Promise<O[]> {
  const res = await fetch(`${API_BASE}/o/oauth2/postmessageRelay`)
  if (!res.ok) throw new Error('Failed to fetch os')
  return res.json()
}

export async function getO(id: string): Promise<O> {
  const res = await fetch(`${API_BASE}/o/oauth2/postmessageRelay/${id}`)
  if (!res.ok) throw new Error('Failed to fetch o')
  return res.json()
}

export async function createO(data: Partial<O>): Promise<O> {
  const res = await fetch(`${API_BASE}/o/oauth2/postmessageRelay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create o')
  return res.json()
}

export async function updateO(id: string, data: Partial<O>): Promise<O> {
  const res = await fetch(`${API_BASE}/o/oauth2/postmessageRelay/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update o')
  return res.json()
}

export async function deleteO(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/o/oauth2/postmessageRelay/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete o')
}
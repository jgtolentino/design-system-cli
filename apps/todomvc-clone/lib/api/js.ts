import { J } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getJs(): Promise<J[]> {
  const res = await fetch(`${API_BASE}/js/plusone.js`)
  if (!res.ok) throw new Error('Failed to fetch js')
  return res.json()
}

export async function getJ(id: string): Promise<J> {
  const res = await fetch(`${API_BASE}/js/plusone.js/${id}`)
  if (!res.ok) throw new Error('Failed to fetch j')
  return res.json()
}

export async function createJ(data: Partial<J>): Promise<J> {
  const res = await fetch(`${API_BASE}/js/plusone.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create j')
  return res.json()
}

export async function updateJ(id: string, data: Partial<J>): Promise<J> {
  const res = await fetch(`${API_BASE}/js/plusone.js/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update j')
  return res.json()
}

export async function deleteJ(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/js/plusone.js/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete j')
}
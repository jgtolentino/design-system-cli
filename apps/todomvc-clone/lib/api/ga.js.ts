import { Ga.j } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getGa.js(): Promise<Ga.j[]> {
  const res = await fetch(`${API_BASE}/ga.js`)
  if (!res.ok) throw new Error('Failed to fetch ga.js')
  return res.json()
}

export async function getGa.j(id: string): Promise<Ga.j> {
  const res = await fetch(`${API_BASE}/ga.js/${id}`)
  if (!res.ok) throw new Error('Failed to fetch ga.j')
  return res.json()
}

export async function createGa.j(data: Partial<Ga.j>): Promise<Ga.j> {
  const res = await fetch(`${API_BASE}/ga.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create ga.j')
  return res.json()
}

export async function updateGa.j(id: string, data: Partial<Ga.j>): Promise<Ga.j> {
  const res = await fetch(`${API_BASE}/ga.js/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update ga.j')
  return res.json()
}

export async function deleteGa.j(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ga.js/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete ga.j')
}
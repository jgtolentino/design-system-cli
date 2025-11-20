import { Widgets.j } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getWidgets.js(): Promise<Widgets.j[]> {
  const res = await fetch(`${API_BASE}/widgets.js`)
  if (!res.ok) throw new Error('Failed to fetch widgets.js')
  return res.json()
}

export async function getWidgets.j(id: string): Promise<Widgets.j> {
  const res = await fetch(`${API_BASE}/widgets.js/${id}`)
  if (!res.ok) throw new Error('Failed to fetch widgets.j')
  return res.json()
}

export async function createWidgets.j(data: Partial<Widgets.j>): Promise<Widgets.j> {
  const res = await fetch(`${API_BASE}/widgets.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create widgets.j')
  return res.json()
}

export async function updateWidgets.j(id: string, data: Partial<Widgets.j>): Promise<Widgets.j> {
  const res = await fetch(`${API_BASE}/widgets.js/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update widgets.j')
  return res.json()
}

export async function deleteWidgets.j(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/widgets.js/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete widgets.j')
}
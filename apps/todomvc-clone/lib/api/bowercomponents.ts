import { BowerComponent } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getBowerComponents(): Promise<BowerComponent[]> {
  const res = await fetch(`${API_BASE}/bower_components/webcomponentsjs/webcomponents-lite.min.js`)
  if (!res.ok) throw new Error('Failed to fetch bowercomponents')
  return res.json()
}

export async function getBowerComponent(id: string): Promise<BowerComponent> {
  const res = await fetch(`${API_BASE}/bower_components/webcomponentsjs/webcomponents-lite.min.js/${id}`)
  if (!res.ok) throw new Error('Failed to fetch bowercomponent')
  return res.json()
}

export async function createBowerComponent(data: Partial<BowerComponent>): Promise<BowerComponent> {
  const res = await fetch(`${API_BASE}/bower_components/webcomponentsjs/webcomponents-lite.min.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create bowercomponent')
  return res.json()
}

export async function updateBowerComponent(id: string, data: Partial<BowerComponent>): Promise<BowerComponent> {
  const res = await fetch(`${API_BASE}/bower_components/webcomponentsjs/webcomponents-lite.min.js/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update bowercomponent')
  return res.json()
}

export async function deleteBowerComponent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/bower_components/webcomponentsjs/webcomponents-lite.min.js/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete bowercomponent')
}
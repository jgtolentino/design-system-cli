import { Setting } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getSettings(): Promise<Setting[]> {
  const res = await fetch(`${API_BASE}/settings`)
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export async function getSetting(id: string): Promise<Setting> {
  const res = await fetch(`${API_BASE}/settings/${id}`)
  if (!res.ok) throw new Error('Failed to fetch setting')
  return res.json()
}

export async function createSetting(data: Partial<Setting>): Promise<Setting> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create setting')
  return res.json()
}

export async function updateSetting(id: string, data: Partial<Setting>): Promise<Setting> {
  const res = await fetch(`${API_BASE}/settings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update setting')
  return res.json()
}

export async function deleteSetting(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete setting')
}
import { Widget } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getWidgets(): Promise<Widget[]> {
  const res = await fetch(`${API_BASE}/widgets/widget_iframe.2f70fb173b9000da126c79afe2098f02.html`)
  if (!res.ok) throw new Error('Failed to fetch widgets')
  return res.json()
}

export async function getWidget(id: string): Promise<Widget> {
  const res = await fetch(`${API_BASE}/widgets/widget_iframe.2f70fb173b9000da126c79afe2098f02.html/${id}`)
  if (!res.ok) throw new Error('Failed to fetch widget')
  return res.json()
}

export async function createWidget(data: Partial<Widget>): Promise<Widget> {
  const res = await fetch(`${API_BASE}/widgets/widget_iframe.2f70fb173b9000da126c79afe2098f02.html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create widget')
  return res.json()
}

export async function updateWidget(id: string, data: Partial<Widget>): Promise<Widget> {
  const res = await fetch(`${API_BASE}/widgets/widget_iframe.2f70fb173b9000da126c79afe2098f02.html/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update widget')
  return res.json()
}

export async function deleteWidget(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/widgets/widget_iframe.2f70fb173b9000da126c79afe2098f02.html/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete widget')
}
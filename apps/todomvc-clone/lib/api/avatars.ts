import { Avatar } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getAvatars(): Promise<Avatar[]> {
  const res = await fetch(`${API_BASE}/avatar/ffe68d6f71b225f7661d33f2a8908281`)
  if (!res.ok) throw new Error('Failed to fetch avatars')
  return res.json()
}

export async function getAvatar(id: string): Promise<Avatar> {
  const res = await fetch(`${API_BASE}/avatar/ffe68d6f71b225f7661d33f2a8908281/${id}`)
  if (!res.ok) throw new Error('Failed to fetch avatar')
  return res.json()
}

export async function createAvatar(data: Partial<Avatar>): Promise<Avatar> {
  const res = await fetch(`${API_BASE}/avatar/ffe68d6f71b225f7661d33f2a8908281`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create avatar')
  return res.json()
}

export async function updateAvatar(id: string, data: Partial<Avatar>): Promise<Avatar> {
  const res = await fetch(`${API_BASE}/avatar/ffe68d6f71b225f7661d33f2a8908281/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update avatar')
  return res.json()
}

export async function deleteAvatar(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/avatar/ffe68d6f71b225f7661d33f2a8908281/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete avatar')
}
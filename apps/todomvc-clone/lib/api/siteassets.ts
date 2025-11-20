import { SiteAsset } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getSiteAssets(): Promise<SiteAsset[]> {
  const res = await fetch(`${API_BASE}/site-assets/main.js`)
  if (!res.ok) throw new Error('Failed to fetch siteassets')
  return res.json()
}

export async function getSiteAsset(id: string): Promise<SiteAsset> {
  const res = await fetch(`${API_BASE}/site-assets/main.js/${id}`)
  if (!res.ok) throw new Error('Failed to fetch siteasset')
  return res.json()
}

export async function createSiteAsset(data: Partial<SiteAsset>): Promise<SiteAsset> {
  const res = await fetch(`${API_BASE}/site-assets/main.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create siteasset')
  return res.json()
}

export async function updateSiteAsset(id: string, data: Partial<SiteAsset>): Promise<SiteAsset> {
  const res = await fetch(`${API_BASE}/site-assets/main.js/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update siteasset')
  return res.json()
}

export async function deleteSiteAsset(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/site-assets/main.js/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete siteasset')
}
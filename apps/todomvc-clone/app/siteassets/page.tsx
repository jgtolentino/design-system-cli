'use client'

import { useEffect, useState } from 'react'
import { SiteAsset } from '@/lib/types'
import { getSiteAssets } from '@/lib/api/siteassets'

export default function SiteAssetListPage() {
  const [items, setItems] = useState<SiteAsset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getSiteAssets()
      setItems(data)
    } catch (error) {
      console.error('Failed to load siteassets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">SiteAssets</h1>
        <a
          href="/siteassets/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create SiteAsset
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/siteassets/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
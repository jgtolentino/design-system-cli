'use client'

import { useEffect, useState } from 'react'
import { Setting } from '@/lib/types'
import { getSettings } from '@/lib/api/settings'

export default function SettingListPage() {
  const [items, setItems] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getSettings()
      setItems(data)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <a
          href="/settings/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Setting
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/settings/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
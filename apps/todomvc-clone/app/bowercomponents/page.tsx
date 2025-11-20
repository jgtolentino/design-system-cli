'use client'

import { useEffect, useState } from 'react'
import { BowerComponent } from '@/lib/types'
import { getBowerComponents } from '@/lib/api/bowercomponents'

export default function BowerComponentListPage() {
  const [items, setItems] = useState<BowerComponent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getBowerComponents()
      setItems(data)
    } catch (error) {
      console.error('Failed to load bowercomponents:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">BowerComponents</h1>
        <a
          href="/bowercomponents/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create BowerComponent
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/bowercomponents/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
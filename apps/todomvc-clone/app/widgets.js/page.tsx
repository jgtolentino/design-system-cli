'use client'

import { useEffect, useState } from 'react'
import { Widgets.j } from '@/lib/types'
import { getWidgets.js } from '@/lib/api/widgets.js'

export default function Widgets.jListPage() {
  const [items, setItems] = useState<Widgets.j[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getWidgets.js()
      setItems(data)
    } catch (error) {
      console.error('Failed to load widgets.js:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Widgets.js</h1>
        <a
          href="/widgets.js/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Widgets.j
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/widgets.js/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { O } from '@/lib/types'
import { getOs } from '@/lib/api/os'

export default function OListPage() {
  const [items, setItems] = useState<O[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getOs()
      setItems(data)
    } catch (error) {
      console.error('Failed to load os:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Os</h1>
        <a
          href="/os/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create O
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/os/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
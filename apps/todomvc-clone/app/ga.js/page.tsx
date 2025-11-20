'use client'

import { useEffect, useState } from 'react'
import { Ga.j } from '@/lib/types'
import { getGa.js } from '@/lib/api/ga.js'

export default function Ga.jListPage() {
  const [items, setItems] = useState<Ga.j[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getGa.js()
      setItems(data)
    } catch (error) {
      console.error('Failed to load ga.js:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ga.js</h1>
        <a
          href="/ga.js/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Ga.j
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/ga.js/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
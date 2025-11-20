'use client'

import { useEffect, useState } from 'react'
import { Account } from '@/lib/types'
import { getAccounts } from '@/lib/api/accounts'

export default function AccountListPage() {
  const [items, setItems] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getAccounts()
      setItems(data)
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <a
          href="/accounts/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Account
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/accounts/${item.id}`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            
          </a>
        ))}
      </div>
    </div>
  )
}
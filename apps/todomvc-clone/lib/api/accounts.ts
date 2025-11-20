import { Account } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getAccounts(): Promise<Account[]> {
  const res = await fetch(`${API_BASE}/accounts/o/:id-postmessagerelay.js`)
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json()
}

export async function getAccount(id: string): Promise<Account> {
  const res = await fetch(`${API_BASE}/accounts/o/:id-postmessagerelay.js/${id}`)
  if (!res.ok) throw new Error('Failed to fetch account')
  return res.json()
}

export async function createAccount(data: Partial<Account>): Promise<Account> {
  const res = await fetch(`${API_BASE}/accounts/o/:id-postmessagerelay.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create account')
  return res.json()
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account> {
  const res = await fetch(`${API_BASE}/accounts/o/:id-postmessagerelay.js/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update account')
  return res.json()
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/o/:id-postmessagerelay.js/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete account')
}
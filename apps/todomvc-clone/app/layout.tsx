import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Functional App',
  description: 'Generated functional application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <a href="/" className="font-bold text-xl">Functional App</a>
          <a href="/bowercomponents" className="px-4 py-2 hover:bg-gray-100 rounded">
            BowerComponent
          </a>
          <a href="/us" className="px-4 py-2 hover:bg-gray-100 rounded">
            U
          </a>
          <a href="/siteassets" className="px-4 py-2 hover:bg-gray-100 rounded">
            SiteAsset
          </a>
          <a href="/avatars" className="px-4 py-2 hover:bg-gray-100 rounded">
            Avatar
          </a>
          <a href="/widgets.js" className="px-4 py-2 hover:bg-gray-100 rounded">
            Widgets.j
          </a>
          <a href="/js" className="px-4 py-2 hover:bg-gray-100 rounded">
            J
          </a>
          <a href="/ga.js" className="px-4 py-2 hover:bg-gray-100 rounded">
            Ga.j
          </a>
          <a href="/rs" className="px-4 py-2 hover:bg-gray-100 rounded">
            R
          </a>
          <a href="/widgets" className="px-4 py-2 hover:bg-gray-100 rounded">
            Widget
          </a>
          <a href="/os" className="px-4 py-2 hover:bg-gray-100 rounded">
            O
          </a>
          <a href="/settings" className="px-4 py-2 hover:bg-gray-100 rounded">
            Setting
          </a>
          <a href="/accounts" className="px-4 py-2 hover:bg-gray-100 rounded">
            Account
          </a>
          <a href="/is" className="px-4 py-2 hover:bg-gray-100 rounded">
            I
          </a>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
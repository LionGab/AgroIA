import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { 
  Home, 
  Map, 
  AlertTriangle, 
  Settings, 
  Plus,
  Bell,
  Search,
  Menu,
  X,
  Sprout,
  Satellite,
  TrendingUp
} from 'lucide-react'
import { useState } from 'react'
import { useAlertsStats } from '@/hooks/useAlerts'

interface LayoutProps {
  children: ReactNode
  title?: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const alertsStats = useAlertsStats()

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
    },
    {
      name: 'Fazendas',
      href: '/farms',
      icon: Sprout,
    },
    {
      name: 'Análise NDVI',
      href: '/analysis',
      icon: Satellite,
    },
    {
      name: 'Alertas',
      href: '/alerts',
      icon: AlertTriangle,
      badge: alertsStats.total,
    },
    {
      name: 'Relatórios',
      href: '/reports',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 bg-primary-600">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg">
                <Sprout className="w-5 h-5 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-white">AgroIA</h1>
            </div>
            <button
              className="lg:hidden text-white hover:text-gray-200"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className={`
                      px-2 py-1 text-xs font-semibold rounded-full
                      ${item.name === 'Alertas' && alertsStats.bySeverity.high > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/farms/new"
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Nova Fazenda
            </Link>
          </div>

          {/* Footer */}
          <div className="p-4 text-xs text-gray-500 border-t border-gray-200">
            <p>AgroIA v1.0</p>
            <p>Monitoramento Inteligente</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              className="lg:hidden text-gray-500 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            {/* Title */}
            <div className="flex-1 lg:flex-none">
              {title && (
                <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">
                  {title}
                </h1>
              )}
            </div>

            {/* Top bar actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden sm:block">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Pesquisar fazendas..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell size={20} />
                {alertsStats.total > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {alertsStats.total > 9 ? '9+' : alertsStats.total}
                  </span>
                )}
              </button>

              {/* Settings */}
              <Link
                href="/settings"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Settings size={20} />
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
import type { NextPage } from 'next'
import Layout from '@/components/Layout'
import { useFarms, useFarmsStats } from '@/hooks/useFarms'
import { useAlertsStats } from '@/hooks/useAlerts'
import { 
  Sprout, 
  AlertTriangle, 
  TrendingUp, 
  MapPin,
  Calendar,
  Activity,
  Users,
  BarChart3,
  ChevronRight,
  Eye,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Componente de Card de Estatística
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'primary' 
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  trend?: { value: number; label: string }
  color?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const colorClasses = {
    primary: 'bg-primary-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white'
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.value > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp size={14} className="mr-1" />
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

// Componente de Card de Fazenda
function FarmCard({ farm, analysis, alerts }: {
  farm: any
  analysis?: any
  alerts?: any[]
}) {
  const alertCount = alerts?.length || 0
  const highAlertCount = alerts?.filter(a => a.severity === 'high').length || 0

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {farm.crop_type}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <MapPin size={14} />
              <span>{farm.total_area} ha</span>
            </div>
            {analysis && (
              <div className="flex items-center space-x-1">
                <Activity size={14} />
                <span>NDVI: {analysis.ndvi_average?.toFixed(3) || 'N/A'}</span>
              </div>
            )}
          </div>

          {farm.last_analysis_at && (
            <p className="text-xs text-gray-500 mt-1">
              Última análise: {format(new Date(farm.last_analysis_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          {alertCount > 0 && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              highAlertCount > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {alertCount} alerta{alertCount > 1 ? 's' : ''}
            </div>
          )}
          
          <Link
            href={`/farms/${farm.id}`}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700"
          >
            Ver detalhes
            <ChevronRight size={14} className="ml-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Componente de Atividade Recente
function RecentActivity({ activities }: { activities: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
      </div>
      <div className="p-6">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma atividade recente</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  activity.type === 'alert' ? 'bg-red-100' :
                  activity.type === 'analysis' ? 'bg-blue-100' :
                  'bg-green-100'
                }`}>
                  {activity.type === 'alert' ? (
                    <AlertTriangle size={14} className="text-red-600" />
                  ) : activity.type === 'analysis' ? (
                    <Eye size={14} className="text-blue-600" />
                  ) : (
                    <Zap size={14} className="text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.farm_name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(activity.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const Home: NextPage = () => {
  const { data: farmsData, isLoading: farmsLoading } = useFarms({ active: true, limit: 20 })
  const farmsStats = useFarmsStats()
  const alertsStats = useAlertsStats()

  const farms = farmsData?.data || []

  // Simular atividades recentes (em uma implementação real, isso viria da API)
  const recentActivities = [
    {
      type: 'analysis',
      description: 'Análise NDVI concluída',
      farm_name: 'Fazenda São José',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'alert',
      description: 'Alerta de estresse hídrico',
      farm_name: 'Fazenda Santa Maria',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'farm_created',
      description: 'Nova fazenda cadastrada',
      farm_name: 'Fazenda Boa Vista',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    }
  ]

  if (farmsLoading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Estatísticas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Fazendas"
            value={farmsStats.totalFarms}
            subtitle={`${farmsStats.activeFarms} ativas`}
            icon={Sprout}
            color="primary"
          />
          <StatCard
            title="Alertas Pendentes"
            value={alertsStats.total}
            subtitle={`${alertsStats.bySeverity.high} críticos`}
            icon={AlertTriangle}
            color={alertsStats.bySeverity.high > 0 ? 'danger' : 'success'}
          />
          <StatCard
            title="Área Total"
            value={`${farmsStats.totalArea.toFixed(1)} ha`}
            subtitle="Monitorada"
            icon={MapPin}
            color="success"
          />
          <StatCard
            title="Análises Hoje"
            value="12"
            subtitle="8 concluídas"
            icon={BarChart3}
            color="primary"
          />
        </div>

        {/* Dashboard principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de fazendas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Fazendas Monitoradas</h3>
                  <Link
                    href="/farms"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Ver todas
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {farms.length === 0 ? (
                  <div className="text-center py-8">
                    <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">Nenhuma fazenda cadastrada</p>
                    <Link
                      href="/farms/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      <Sprout size={16} className="mr-2" />
                      Cadastrar primeira fazenda
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {farms.slice(0, 5).map((farm) => (
                      <FarmCard key={farm.id} farm={farm} />
                    ))}
                    {farms.length > 5 && (
                      <div className="text-center pt-4">
                        <Link
                          href="/farms"
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ver mais {farms.length - 5} fazendas
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar com atividades e estatísticas */}
          <div className="space-y-6">
            <RecentActivity activities={recentActivities} />
            
            {/* Estatísticas por cultura */}
            {Object.keys(farmsStats.farmsByCrop).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Culturas</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {Object.entries(farmsStats.farmsByCrop).map(([crop, count]) => (
                      <div key={crop} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{crop}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Links rápidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href="/farms/new"
                  className="flex items-center justify-between p-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>Nova Fazenda</span>
                  <ChevronRight size={16} />
                </Link>
                <Link
                  href="/analysis"
                  className="flex items-center justify-between p-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>Análise NDVI</span>
                  <ChevronRight size={16} />
                </Link>
                <Link
                  href="/reports"
                  className="flex items-center justify-between p-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>Relatórios</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Home
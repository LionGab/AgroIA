import type { NextPage } from 'next'
import { useState } from 'react'
import Layout from '@/components/Layout'
import MapView from '@/components/MapView'
import { useFarms } from '@/hooks/useFarms'
import { useFarmAlerts } from '@/hooks/useAlerts'
import { Farm } from '@/types'
import { 
  Search,
  Filter,
  Plus,
  MapPin,
  Calendar,
  Activity,
  AlertTriangle,
  Eye,
  Zap,
  Grid3X3,
  Map as MapIcon
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Componente de Card de Fazenda
function FarmCard({ 
  farm, 
  onSelect, 
  isSelected = false 
}: { 
  farm: Farm
  onSelect: (farm: Farm) => void
  isSelected?: boolean 
}) {
  const { data: alerts } = useFarmAlerts(farm.id, { resolved: false })
  const alertCount = alerts?.length || 0
  const highAlerts = alerts?.filter(a => a.severity === 'high').length || 0

  return (
    <div 
      className={`
        bg-white p-6 rounded-xl shadow-sm border cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-primary-500 ring-2 ring-primary-100 shadow-md' 
          : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
        }
      `}
      onClick={() => onSelect(farm)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {farm.crop_type}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <MapPin size={14} />
              <span>{farm.total_area} hectares</span>
            </div>
            {farm.owner_phone && (
              <div className="flex items-center space-x-1">
                <span>📱 {farm.owner_phone}</span>
              </div>
            )}
          </div>

          {farm.last_analysis_at && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
              <Calendar size={12} />
              <span>
                Última análise: {format(new Date(farm.last_analysis_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          {/* Status da fazenda */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            farm.active 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {farm.active ? 'Ativa' : 'Inativa'}
          </div>

          {/* Alertas */}
          {alertCount > 0 && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
              highAlerts > 0 
                ? 'bg-red-100 text-red-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              <AlertTriangle size={12} />
              <span>{alertCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <Link
            href={`/farms/${farm.id}`}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye size={14} className="mr-1" />
            Detalhes
          </Link>
          <button className="flex items-center text-sm text-gray-600 hover:text-gray-700 font-medium">
            <Zap size={14} className="mr-1" />
            Analisar
          </button>
        </div>
        
        <div className={`text-xs px-2 py-1 rounded ${
          farm.priority === 'high' 
            ? 'bg-red-50 text-red-600' 
            : farm.priority === 'medium'
            ? 'bg-yellow-50 text-yellow-600'
            : 'bg-gray-50 text-gray-600'
        }`}>
          Prioridade {farm.priority === 'high' ? 'Alta' : farm.priority === 'medium' ? 'Média' : 'Baixa'}
        </div>
      </div>
    </div>
  )
}

// Componente de Filtros
function FarmFilters({ 
  filters, 
  onFiltersChange 
}: { 
  filters: any
  onFiltersChange: (filters: any) => void 
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar fazendas..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Filtro por cultura */}
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={filters.crop_type || ''}
          onChange={(e) => onFiltersChange({ ...filters, crop_type: e.target.value || undefined })}
        >
          <option value="">Todas as culturas</option>
          <option value="soja">Soja</option>
          <option value="milho">Milho</option>
          <option value="algodao">Algodão</option>
          <option value="cana">Cana-de-açúcar</option>
          <option value="cafe">Café</option>
          <option value="citrus">Citrus</option>
          <option value="pastagem">Pastagem</option>
        </select>

        {/* Filtro por prioridade */}
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={filters.priority || ''}
          onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value || undefined })}
        >
          <option value="">Todas as prioridades</option>
          <option value="high">Alta prioridade</option>
          <option value="medium">Média prioridade</option>
          <option value="low">Baixa prioridade</option>
        </select>

        {/* Filtro por status */}
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={filters.active !== undefined ? filters.active.toString() : ''}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            active: e.target.value === '' ? undefined : e.target.value === 'true' 
          })}
        >
          <option value="">Todos os status</option>
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
        </select>
      </div>
    </div>
  )
}

const FarmsPage: NextPage = () => {
  const [filters, setFilters] = useState<any>({})
  const [selectedFarm, setSelectedFarm] = useState<Farm | undefined>()
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  const { data: farmsData, isLoading } = useFarms(filters)
  const farms = farmsData?.data || []

  const handleFarmSelect = (farm: Farm) => {
    setSelectedFarm(farm)
    if (viewMode === 'grid') {
      setViewMode('map')
    }
  }

  if (isLoading) {
    return (
      <Layout title="Fazendas">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Fazendas">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fazendas</h1>
            <p className="text-gray-600 mt-1">
              {farmsData?.pagination.total || 0} fazenda{(farmsData?.pagination.total || 0) !== 1 ? 's' : ''} cadastrada{(farmsData?.pagination.total || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Toggle de visualização */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid3X3 size={16} className="mr-2 inline" />
                Grade
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapIcon size={16} className="mr-2 inline" />
                Mapa
              </button>
            </div>

            <Link
              href="/farms/new"
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Nova Fazenda
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <FarmFilters filters={filters} onFiltersChange={setFilters} />

        {/* Conteúdo principal */}
        {viewMode === 'grid' ? (
          /* Visualização em grade */
          <div>
            {farms.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma fazenda encontrada</h3>
                <p className="text-gray-600 mb-6">
                  {Object.keys(filters).length > 0 
                    ? 'Tente ajustar os filtros para encontrar fazendas.'
                    : 'Comece cadastrando sua primeira fazenda.'}
                </p>
                <Link
                  href="/farms/new"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus size={16} className="mr-2" />
                  Cadastrar Fazenda
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farms.map((farm) => (
                  <FarmCard
                    key={farm.id}
                    farm={farm}
                    onSelect={handleFarmSelect}
                    isSelected={selectedFarm?.id === farm.id}
                  />
                ))}
              </div>
            )}

            {/* Paginação */}
            {farmsData && farmsData.pagination.total_pages > 1 && (
              <div className="flex items-center justify-center mt-8 space-x-2">
                {Array.from({ length: farmsData.pagination.total_pages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      farmsData.pagination.page === i + 1
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                    onClick={() => setFilters({ ...filters, page: i + 1 })}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Visualização em mapa */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista lateral de fazendas */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Fazendas no Mapa</h3>
                </div>
                <div className="p-4 space-y-3">
                  {farms.map((farm) => (
                    <div
                      key={farm.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFarm?.id === farm.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedFarm(farm)}
                    >
                      <h4 className="font-medium text-sm text-gray-900">{farm.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{farm.crop_type} - {farm.total_area} ha</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mapa */}
            <div className="lg:col-span-2">
              <MapView
                farms={farms}
                selectedFarm={selectedFarm}
                onFarmSelect={setSelectedFarm}
                showNDVI={!!selectedFarm}
                height="600px"
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default FarmsPage
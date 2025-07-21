import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { Farm, SatelliteAnalysis, PaginatedResponse } from '@/types'
import { farmsApi } from '@/services/api'

// Query Keys
export const FARMS_QUERY_KEYS = {
  all: ['farms'] as const,
  lists: () => [...FARMS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...FARMS_QUERY_KEYS.lists(), { filters }] as const,
  details: () => [...FARMS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...FARMS_QUERY_KEYS.details(), id] as const,
  analyses: (id: string) => [...FARMS_QUERY_KEYS.detail(id), 'analyses'] as const,
}

// Hook para listar fazendas
export function useFarms(params?: {
  page?: number
  limit?: number
  crop_type?: string
  active?: boolean
}) {
  return useQuery(
    FARMS_QUERY_KEYS.list(params || {}),
    () => farmsApi.getAll(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao carregar fazendas')
      }
    }
  )
}

// Hook para obter fazenda específica
export function useFarm(id: string) {
  return useQuery(
    FARMS_QUERY_KEYS.detail(id),
    () => farmsApi.getById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao carregar fazenda')
      }
    }
  )
}

// Hook para análises da fazenda
export function useFarmAnalyses(
  farmId: string,
  params?: { limit?: number; page?: number }
) {
  return useQuery(
    [...FARMS_QUERY_KEYS.analyses(farmId), params],
    () => farmsApi.getAnalyses(farmId, params),
    {
      enabled: !!farmId,
      staleTime: 2 * 60 * 1000, // 2 minutos (mais frequente para análises)
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao carregar análises')
      }
    }
  )
}

// Hook para criar fazenda
export function useCreateFarm() {
  const queryClient = useQueryClient()

  return useMutation(
    (farmData: Omit<Farm, 'id' | 'created_at' | 'updated_at'>) =>
      farmsApi.create(farmData),
    {
      onSuccess: (newFarm) => {
        // Invalidar e atualizar cache
        queryClient.invalidateQueries(FARMS_QUERY_KEYS.lists())
        
        // Otimisticamente adicionar à lista se tivermos dados em cache
        queryClient.setQueriesData<PaginatedResponse<Farm>>(
          FARMS_QUERY_KEYS.lists(),
          (old) => {
            if (old) {
              return {
                ...old,
                data: [newFarm, ...old.data],
                pagination: {
                  ...old.pagination,
                  total: old.pagination.total + 1
                }
              }
            }
            return old
          }
        )

        toast.success('Fazenda criada com sucesso!')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao criar fazenda')
      }
    }
  )
}

// Hook para atualizar fazenda
export function useUpdateFarm() {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: Partial<Farm> }) =>
      farmsApi.update(id, data),
    {
      onSuccess: (updatedFarm) => {
        // Atualizar cache da fazenda específica
        queryClient.setQueryData(
          FARMS_QUERY_KEYS.detail(updatedFarm.id),
          updatedFarm
        )

        // Atualizar na lista
        queryClient.setQueriesData<PaginatedResponse<Farm>>(
          FARMS_QUERY_KEYS.lists(),
          (old) => {
            if (old) {
              return {
                ...old,
                data: old.data.map(farm =>
                  farm.id === updatedFarm.id ? updatedFarm : farm
                )
              }
            }
            return old
          }
        )

        toast.success('Fazenda atualizada com sucesso!')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao atualizar fazenda')
      }
    }
  )
}

// Hook para deletar fazenda
export function useDeleteFarm() {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => farmsApi.delete(id),
    {
      onSuccess: (_, deletedId) => {
        // Remover do cache
        queryClient.removeQueries(FARMS_QUERY_KEYS.detail(deletedId))
        
        // Remover da lista
        queryClient.setQueriesData<PaginatedResponse<Farm>>(
          FARMS_QUERY_KEYS.lists(),
          (old) => {
            if (old) {
              return {
                ...old,
                data: old.data.filter(farm => farm.id !== deletedId),
                pagination: {
                  ...old.pagination,
                  total: Math.max(0, old.pagination.total - 1)
                }
              }
            }
            return old
          }
        )

        toast.success('Fazenda removida com sucesso!')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao remover fazenda')
      }
    }
  )
}

// Hook para analisar fazenda
export function useAnalyzeFarm() {
  const queryClient = useQueryClient()

  return useMutation(
    (farmId: string) => farmsApi.analyze(farmId),
    {
      onMutate: (farmId) => {
        toast.loading('Iniciando análise da fazenda...', { id: 'analyze' })
      },
      onSuccess: (analysis, farmId) => {
        // Invalidar análises para recarregar
        queryClient.invalidateQueries(FARMS_QUERY_KEYS.analyses(farmId))
        
        // Atualizar última análise na fazenda
        queryClient.setQueryData<Farm>(
          FARMS_QUERY_KEYS.detail(farmId),
          (old) => {
            if (old) {
              return {
                ...old,
                last_analysis_at: analysis.created_at
              }
            }
            return old
          }
        )

        toast.success('Análise concluída com sucesso!', { id: 'analyze' })
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro na análise da fazenda', { 
          id: 'analyze' 
        })
      }
    }
  )
}

// Hook para obter imagem NDVI
export function useNDVIImage(farmId: string, analysisId?: string) {
  return useQuery(
    ['ndvi-image', farmId, analysisId],
    async () => {
      const blob = await farmsApi.getNDVIImage(farmId, analysisId)
      return URL.createObjectURL(blob)
    },
    {
      enabled: !!farmId,
      staleTime: 10 * 60 * 1000, // 10 minutos
      onError: (error: any) => {
        toast.error('Erro ao carregar imagem NDVI')
      }
    }
  )
}

// Hook customizado para estado da fazenda selecionada
export function useSelectedFarm() {
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>()
  
  const farmQuery = useFarm(selectedFarmId || '')
  const analysesQuery = useFarmAnalyses(selectedFarmId || '', { limit: 10 })

  return {
    selectedFarm: farmQuery.data,
    analyses: analysesQuery.data?.data || [],
    isLoading: farmQuery.isLoading || analysesQuery.isLoading,
    selectFarm: setSelectedFarmId,
    clearSelection: () => setSelectedFarmId(undefined)
  }
}

// Hook para estatísticas das fazendas
export function useFarmsStats() {
  const { data: farmsData } = useFarms({ active: true })
  
  if (!farmsData) {
    return {
      totalFarms: 0,
      activeFarms: 0,
      farmsByCrop: {},
      totalArea: 0
    }
  }

  const stats = farmsData.data.reduce(
    (acc, farm) => {
      acc.activeFarms += farm.active ? 1 : 0
      acc.farmsByCrop[farm.crop_type] = (acc.farmsByCrop[farm.crop_type] || 0) + 1
      acc.totalArea += farm.total_area
      return acc
    },
    {
      totalFarms: farmsData.data.length,
      activeFarms: 0,
      farmsByCrop: {} as Record<string, number>,
      totalArea: 0
    }
  )

  return stats
}
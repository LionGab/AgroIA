import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { FarmAlert, PaginatedResponse } from '@/types'
import { alertsApi } from '@/services/api'

// Query Keys
export const ALERTS_QUERY_KEYS = {
  all: ['alerts'] as const,
  lists: () => [...ALERTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...ALERTS_QUERY_KEYS.lists(), { filters }] as const,
  byFarm: (farmId: string) => [...ALERTS_QUERY_KEYS.all, 'farm', farmId] as const,
}

// Hook para obter alertas por fazenda
export function useFarmAlerts(
  farmId: string,
  params?: { resolved?: boolean; severity?: string }
) {
  return useQuery(
    [...ALERTS_QUERY_KEYS.byFarm(farmId), params],
    () => alertsApi.getByFarm(farmId, params),
    {
      enabled: !!farmId,
      staleTime: 2 * 60 * 1000, // 2 minutos
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao carregar alertas')
      }
    }
  )
}

// Hook para obter todos os alertas (com paginação)
export function useAlerts(params?: {
  page?: number
  limit?: number
  severity?: string
  resolved?: boolean
}) {
  return useQuery(
    ALERTS_QUERY_KEYS.list(params || {}),
    () => alertsApi.getAll(params),
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao carregar alertas')
      }
    }
  )
}

// Hook para marcar alerta como visualizado
export function useMarkAlertAsViewed() {
  const queryClient = useQueryClient()

  return useMutation(
    (alertId: string) => alertsApi.markAsViewed(alertId),
    {
      onSuccess: (updatedAlert) => {
        // Atualizar cache dos alertas da fazenda
        queryClient.setQueriesData<FarmAlert[]>(
          ALERTS_QUERY_KEYS.byFarm(updatedAlert.farm_id),
          (old) => {
            if (old) {
              return old.map(alert =>
                alert.id === updatedAlert.id ? updatedAlert : alert
              )
            }
            return old
          }
        )

        // Atualizar cache da lista geral
        queryClient.setQueriesData<PaginatedResponse<FarmAlert>>(
          ALERTS_QUERY_KEYS.lists(),
          (old) => {
            if (old) {
              return {
                ...old,
                data: old.data.map(alert =>
                  alert.id === updatedAlert.id ? updatedAlert : alert
                )
              }
            }
            return old
          }
        )
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao marcar alerta como visualizado')
      }
    }
  )
}

// Hook para resolver alerta
export function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation(
    (alertId: string) => alertsApi.resolve(alertId),
    {
      onSuccess: (resolvedAlert) => {
        // Atualizar cache dos alertas da fazenda
        queryClient.setQueriesData<FarmAlert[]>(
          ALERTS_QUERY_KEYS.byFarm(resolvedAlert.farm_id),
          (old) => {
            if (old) {
              return old.map(alert =>
                alert.id === resolvedAlert.id ? resolvedAlert : alert
              )
            }
            return old
          }
        )

        // Atualizar cache da lista geral
        queryClient.setQueriesData<PaginatedResponse<FarmAlert>>(
          ALERTS_QUERY_KEYS.lists(),
          (old) => {
            if (old) {
              return {
                ...old,
                data: old.data.map(alert =>
                  alert.id === resolvedAlert.id ? resolvedAlert : alert
                )
              }
            }
            return old
          }
        )

        toast.success('Alerta resolvido com sucesso!')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Erro ao resolver alerta')
      }
    }
  )
}

// Hook para obter alertas não resolvidos (útil para notificações)
export function useUnresolvedAlerts(farmId?: string) {
  const params = { resolved: false }
  
  if (farmId) {
    return useFarmAlerts(farmId, params)
  }
  
  return useAlerts({ ...params, limit: 100 })
}

// Hook para estatísticas de alertas
export function useAlertsStats(farmId?: string) {
  const { data: unresolvedAlerts } = useUnresolvedAlerts(farmId)
  
  if (!unresolvedAlerts) {
    return {
      total: 0,
      bySeverity: {
        info: 0,
        low: 0,
        medium: 0,
        high: 0
      },
      recent: []
    }
  }

  const alerts = Array.isArray(unresolvedAlerts) ? unresolvedAlerts : unresolvedAlerts.data

  const stats = alerts.reduce(
    (acc, alert) => {
      acc.total += 1
      acc.bySeverity[alert.severity] += 1
      return acc
    },
    {
      total: 0,
      bySeverity: {
        info: 0,
        low: 0,
        medium: 0,
        high: 0
      },
      recent: alerts
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    }
  )

  return stats
}

// Hook para polling de novos alertas (útil para notificações em tempo real)
export function useAlertsPolling(farmId?: string, enabled = true) {
  const interval = 30 * 1000 // 30 segundos

  return useQuery(
    farmId ? ALERTS_QUERY_KEYS.byFarm(farmId) : ALERTS_QUERY_KEYS.list({}),
    () => {
      if (farmId) {
        return alertsApi.getByFarm(farmId, { resolved: false })
      }
      return alertsApi.getAll({ resolved: false, limit: 10 })
    },
    {
      enabled,
      refetchInterval: interval,
      refetchIntervalInBackground: false,
      staleTime: 0, // Sempre considerar stale para polling
      onError: () => {
        // Silenciar erros do polling para evitar spam de notificações
      }
    }
  )
}

// Hook customizado para gerenciar estado de alertas localmente
export function useAlertsManager(farmId?: string) {
  const { data: alerts, isLoading } = useUnresolvedAlerts(farmId)
  const markAsViewed = useMarkAlertAsViewed()
  const resolveAlert = useResolveAlert()

  const handleMarkAsViewed = (alertId: string) => {
    markAsViewed.mutate(alertId)
  }

  const handleResolve = (alertId: string) => {
    resolveAlert.mutate(alertId)
  }

  const alertsList = Array.isArray(alerts) ? alerts : (alerts?.data || [])

  return {
    alerts: alertsList,
    isLoading,
    stats: {
      total: alertsList.length,
      high: alertsList.filter(a => a.severity === 'high').length,
      medium: alertsList.filter(a => a.severity === 'medium').length,
      low: alertsList.filter(a => a.severity === 'low').length,
      info: alertsList.filter(a => a.severity === 'info').length,
    },
    actions: {
      markAsViewed: handleMarkAsViewed,
      resolve: handleResolve,
      isMarkingAsViewed: markAsViewed.isLoading,
      isResolving: resolveAlert.isLoading
    }
  }
}
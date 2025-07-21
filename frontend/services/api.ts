import axios, { AxiosResponse } from 'axios'
import { 
  Farm, 
  SatelliteAnalysis, 
  FarmAlert, 
  APIResponse, 
  PaginatedResponse,
  DashboardStats 
} from '@/types'

// Configuração base do axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token se necessário
api.interceptors.request.use(
  (config) => {
    // Adicionar token de autenticação se disponível
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratamento de respostas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado, redirecionar para login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Utilitários para tipagem das respostas
const handleResponse = <T>(response: AxiosResponse<APIResponse<T>>): T => {
  if (!response.data.success) {
    throw new Error(response.data.message || 'Erro na API')
  }
  return response.data.data
}

const handlePaginatedResponse = <T>(
  response: AxiosResponse<PaginatedResponse<T>>
): PaginatedResponse<T> => {
  return response.data
}

// === FARMS API ===

export const farmsApi = {
  // Listar fazendas
  getAll: async (params?: {
    page?: number
    limit?: number
    crop_type?: string
    active?: boolean
  }): Promise<PaginatedResponse<Farm>> => {
    const response = await api.get('/farms', { params })
    return handlePaginatedResponse(response)
  },

  // Obter fazenda por ID
  getById: async (id: string): Promise<Farm> => {
    const response = await api.get(`/farms/${id}`)
    return handleResponse(response)
  },

  // Criar nova fazenda
  create: async (farmData: Omit<Farm, 'id' | 'created_at' | 'updated_at'>): Promise<Farm> => {
    const response = await api.post('/farms', farmData)
    return handleResponse(response)
  },

  // Atualizar fazenda
  update: async (id: string, farmData: Partial<Farm>): Promise<Farm> => {
    const response = await api.put(`/farms/${id}`, farmData)
    return handleResponse(response)
  },

  // Remover fazenda
  delete: async (id: string): Promise<void> => {
    const response = await api.delete(`/farms/${id}`)
    handleResponse(response)
  },

  // Analisar fazenda
  analyze: async (id: string): Promise<SatelliteAnalysis> => {
    const response = await api.post(`/farms/${id}/analyze`)
    return handleResponse(response)
  },

  // Obter análises da fazenda
  getAnalyses: async (
    id: string,
    params?: { limit?: number; page?: number }
  ): Promise<PaginatedResponse<SatelliteAnalysis>> => {
    const response = await api.get(`/farms/${id}/analyses`, { params })
    return handlePaginatedResponse(response)
  },

  // Obter imagem NDVI
  getNDVIImage: async (id: string, analysisId?: string): Promise<Blob> => {
    const response = await api.get(`/farms/${id}/ndvi-image`, {
      params: { analysis_id: analysisId },
      responseType: 'blob'
    })
    return response.data
  },

  // Comparação temporal
  compareAnalyses: async (
    id: string,
    currentAnalysisId: string,
    previousAnalysisId: string
  ): Promise<any> => {
    const response = await api.post(`/farms/${id}/compare`, {
      current_analysis_id: currentAnalysisId,
      previous_analysis_id: previousAnalysisId
    })
    return handleResponse(response)
  }
}

// === ALERTS API ===

export const alertsApi = {
  // Obter alertas da fazenda
  getByFarm: async (
    farmId: string,
    params?: { resolved?: boolean; severity?: string }
  ): Promise<FarmAlert[]> => {
    const response = await api.get(`/farms/${farmId}/alerts`, { params })
    return handleResponse(response)
  },

  // Obter todos os alertas
  getAll: async (params?: {
    page?: number
    limit?: number
    severity?: string
    resolved?: boolean
  }): Promise<PaginatedResponse<FarmAlert>> => {
    const response = await api.get('/alerts', { params })
    return handlePaginatedResponse(response)
  },

  // Marcar alerta como visualizado
  markAsViewed: async (id: string): Promise<FarmAlert> => {
    const response = await api.put(`/alerts/${id}/view`)
    return handleResponse(response)
  },

  // Resolver alerta
  resolve: async (id: string): Promise<FarmAlert> => {
    const response = await api.put(`/alerts/${id}/resolve`)
    return handleResponse(response)
  }
}

// === SYSTEM API ===

export const systemApi = {
  // Status de saúde do sistema
  getHealth: async (): Promise<any> => {
    const response = await api.get('/health')
    return response.data
  },

  // Status detalhado dos serviços
  getStatus: async (): Promise<any> => {
    const response = await api.get('/system/status')
    return handleResponse(response)
  },

  // Relatórios do sistema
  getReports: async (): Promise<any> => {
    const response = await api.get('/system/reports')
    return handleResponse(response)
  },

  // Estatísticas do dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats')
    return handleResponse(response)
  }
}

// === ANÁLISE MANUAL ===

export const analysisApi = {
  // Executar análise manual
  runManual: async (farmId: string, options?: {
    force_new_image?: boolean
    analysis_type?: string
  }): Promise<SatelliteAnalysis> => {
    const response = await api.post(`/analysis/manual`, {
      farm_id: farmId,
      ...options
    })
    return handleResponse(response)
  },

  // Status da análise em andamento
  getStatus: async (analysisId: string): Promise<{
    status: string
    progress: number
    message: string
  }> => {
    const response = await api.get(`/analysis/${analysisId}/status`)
    return handleResponse(response)
  }
}

// === UPLOAD E IMAGENS ===

export const uploadApi = {
  // Upload de arquivo (se necessário)
  uploadFile: async (file: File, type: string): Promise<{ url: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return handleResponse(response)
  }
}

// Export da instância do axios para uso direto se necessário
export default api
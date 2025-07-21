// Tipos principais do sistema AgroIA

export interface Farm {
  id: string
  name: string
  owner_id?: string
  crop_type: string
  total_area: number
  coordinates: GeoCoordinates
  location?: LocationInfo
  planting_date?: string
  harvest_expected_date?: string
  owner_phone?: string
  technical_contacts?: Contact[]
  priority: 'low' | 'medium' | 'high'
  crop_stage?: string
  last_analysis_at?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface GeoCoordinates {
  type: 'Polygon'
  coordinates: number[][][]
  center?: [number, number]
  bounds?: [[number, number], [number, number]]
}

export interface LocationInfo {
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
}

export interface Contact {
  name: string
  phone: string
  role: string
  email?: string
}

export interface SatelliteImage {
  id: string
  farm_id: string
  sentinel_id: string
  filename: string
  local_path: string
  sensing_date: string
  cloud_coverage?: number
  image_size?: number
  bands_extracted?: string[]
  processed: boolean
  processing_status: 'pending' | 'processing' | 'completed' | 'error'
  download_date: string
  created_at: string
}

export interface SatelliteAnalysis {
  id: string
  farm_id: string
  image_id?: string
  analysis_type: 'daily' | 'manual' | 'temporal'
  ndvi_average?: number
  ndvi_min?: number
  ndvi_max?: number
  ndvi_std?: number
  ndvi_data?: NDVIData
  claude_confidence?: number
  claude_analysis?: ClaudeAnalysis
  alerts_count: number
  image_width?: number
  image_height?: number
  image_date?: string
  analysis_summary?: string
  analysis_data?: any
  processing_time?: number
  created_at: string
}

export interface NDVIData {
  statistics: {
    mean: number
    min: number
    max: number
    std: number
  }
  zones: VegetationZones
  image_path?: string
  processed_pixels: number
  valid_pixels: number
}

export interface VegetationZones {
  water: number
  bare_soil: number
  sparse_vegetation: number
  moderate_vegetation: number
  dense_vegetation: number
}

export interface ClaudeAnalysis {
  summary: string
  vegetation_health: 'poor' | 'fair' | 'good' | 'excellent'
  issues_detected: string[]
  recommendations: string[]
  confidence_score: number
  detailed_analysis: string
  comparison?: TemporalComparison
}

export interface TemporalComparison {
  trend: 'improving' | 'stable' | 'declining'
  changes_detected: string[]
  severity: 'low' | 'medium' | 'high'
}

export interface FarmAlert {
  id: string
  farm_id: string
  analysis_id?: string
  alert_type: string
  severity: 'info' | 'low' | 'medium' | 'high'
  title: string
  description: string
  recommendation?: string
  source: 'ndvi' | 'claude' | 'system'
  metadata?: any
  whatsapp_sent: boolean
  whatsapp_sent_at?: string
  viewed: boolean
  viewed_at?: string
  resolved: boolean
  resolved_at?: string
  resolved_by?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'admin' | 'farmer' | 'technician'
  active: boolean
  created_at: string
  updated_at: string
}

// Tipos para API responses
export interface APIResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// Tipos para hooks e estado global
export interface FarmStore {
  farms: Farm[]
  selectedFarm?: Farm
  isLoading: boolean
  error?: string
  setFarms: (farms: Farm[]) => void
  setSelectedFarm: (farm: Farm | undefined) => void
  addFarm: (farm: Farm) => void
  updateFarm: (id: string, farm: Partial<Farm>) => void
  deleteFarm: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | undefined) => void
}

export interface AnalysisStore {
  analyses: SatelliteAnalysis[]
  currentAnalysis?: SatelliteAnalysis
  isAnalyzing: boolean
  alerts: FarmAlert[]
  setAnalyses: (analyses: SatelliteAnalysis[]) => void
  setCurrentAnalysis: (analysis: SatelliteAnalysis | undefined) => void
  addAnalysis: (analysis: SatelliteAnalysis) => void
  setAnalyzing: (analyzing: boolean) => void
  setAlerts: (alerts: FarmAlert[]) => void
  addAlert: (alert: FarmAlert) => void
  updateAlert: (id: string, alert: Partial<FarmAlert>) => void
}

// Tipos para componentes
export interface MapProps {
  farms: Farm[]
  selectedFarm?: Farm
  onFarmSelect?: (farm: Farm) => void
  showNDVI?: boolean
  height?: string | number
  className?: string
}

export interface NDVIImageProps {
  analysis: SatelliteAnalysis
  farm: Farm
  showLegend?: boolean
  interactive?: boolean
  onPixelClick?: (ndviValue: number, coordinates: [number, number]) => void
}

export interface AlertBadgeProps {
  severity: 'info' | 'low' | 'medium' | 'high'
  count?: number
  className?: string
}

export interface FarmCardProps {
  farm: Farm
  analysis?: SatelliteAnalysis
  alerts?: FarmAlert[]
  onClick?: (farm: Farm) => void
  onAnalyze?: (farm: Farm) => void
  className?: string
}

// Tipos para filtros e ordenação
export interface FarmFilters {
  crop_type?: string
  priority?: 'low' | 'medium' | 'high'
  has_alerts?: boolean
  active?: boolean
  search?: string
}

export interface SortOptions {
  field: keyof Farm | 'last_analysis' | 'alerts_count'
  direction: 'asc' | 'desc'
}

// Tipos para estatísticas e relatórios
export interface DashboardStats {
  total_farms: number
  active_analyses: number
  pending_alerts: number
  avg_ndvi: number
  farms_by_crop: Record<string, number>
  alerts_by_severity: Record<string, number>
  recent_activity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'analysis' | 'alert' | 'farm_created' | 'farm_updated'
  farm_name: string
  description: string
  timestamp: string
  severity?: 'info' | 'low' | 'medium' | 'high'
}

// Tipos para configurações
export interface SystemConfig {
  ndvi_thresholds: {
    low: number
    normal: number
    high: number
  }
  alert_settings: {
    whatsapp_enabled: boolean
    email_enabled: boolean
    max_daily_alerts: number
  }
  analysis_settings: {
    max_cloud_coverage: number
    min_image_age_hours: number
  }
}

// Export de tipos de eventos
export type FarmEvent = 
  | { type: 'FARM_SELECTED'; payload: Farm }
  | { type: 'FARM_ANALYZED'; payload: { farm: Farm; analysis: SatelliteAnalysis } }
  | { type: 'ALERT_CREATED'; payload: FarmAlert }
  | { type: 'ALERT_RESOLVED'; payload: { alertId: string; farmId: string } }
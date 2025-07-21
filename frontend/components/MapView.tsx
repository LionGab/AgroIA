import { useEffect, useState, useRef } from 'react'
import { Farm, SatelliteAnalysis } from '@/types'

// Definir tipos para Leaflet (evitar problemas de SSR)
interface LeafletMap {
  setView: (center: [number, number], zoom: number) => void
  addLayer: (layer: any) => void
  removeLayer: (layer: any) => void
  fitBounds: (bounds: [[number, number], [number, number]], options?: any) => void
  on: (event: string, handler: Function) => void
  off: (event: string, handler: Function) => void
  invalidateSize: () => void
}

interface LeafletLayer {
  addTo: (map: LeafletMap) => void
  remove: () => void
  bindPopup: (content: string) => LeafletLayer
  on: (event: string, handler: Function) => void
}

declare global {
  interface Window {
    L: any
  }
}

interface MapViewProps {
  farms: Farm[]
  selectedFarm?: Farm
  onFarmSelect?: (farm: Farm) => void
  analyses?: Record<string, SatelliteAnalysis>
  showNDVI?: boolean
  height?: string | number
  className?: string
}

export default function MapView({
  farms,
  selectedFarm,
  onFarmSelect,
  analyses = {},
  showNDVI = false,
  height = '500px',
  className = ''
}: MapViewProps) {
  const [isClient, setIsClient] = useState(false)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<LeafletLayer[]>([])
  const ndviLayersRef = useRef<LeafletLayer[]>([])

  // Garantir que o componente só renderiza no client-side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Inicializar o mapa
  useEffect(() => {
    if (!isClient || !mapRef.current || typeof window === 'undefined' || !window.L) {
      return
    }

    const L = window.L

    // Criar o mapa
    const mapInstance = L.map(mapRef.current, {
      center: [-15.7942, -47.8822], // Centro do Brasil
      zoom: 4,
      zoomControl: true,
    })

    // Adicionar camada base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance)

    // Adicionar camada de satélite como opção
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri'
    })

    // Controle de camadas
    const baseMaps = {
      "Mapa": mapInstance._layers[Object.keys(mapInstance._layers)[0]],
      "Satélite": satelliteLayer
    }

    L.control.layers(baseMaps).addTo(mapInstance)

    setMap(mapInstance)

    // Cleanup
    return () => {
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [isClient])

  // Atualizar marcadores das fazendas
  useEffect(() => {
    if (!map || !window.L || !farms.length) {
      return
    }

    const L = window.L

    // Limpar marcadores existentes
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Adicionar marcadores para cada fazenda
    const newMarkers: LeafletLayer[] = []
    farms.forEach((farm) => {
      if (!farm.coordinates?.center) return

      const [lat, lng] = farm.coordinates.center
      const analysis = analyses[farm.id]
      
      // Determinar cor do marcador baseado no NDVI
      let markerColor = '#10b981' // Verde padrão
      if (analysis?.ndvi_average) {
        if (analysis.ndvi_average < 0.3) markerColor = '#ef4444' // Vermelho
        else if (analysis.ndvi_average < 0.5) markerColor = '#f59e0b' // Amarelo
        else markerColor = '#10b981' // Verde
      }

      // Criar ícone customizado
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ${farm.id === selectedFarm?.id ? 'transform: scale(1.5);' : ''}
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      const marker = L.marker([lat, lng], { icon: customIcon })

      // Popup com informações da fazenda
      const popupContent = `
        <div class="p-2">
          <h3 class="font-semibold text-lg">${farm.name}</h3>
          <p class="text-sm text-gray-600">${farm.crop_type} - ${farm.total_area} ha</p>
          ${analysis ? `
            <div class="mt-2 space-y-1">
              <p class="text-sm"><strong>NDVI:</strong> ${analysis.ndvi_average?.toFixed(3) || 'N/A'}</p>
              <p class="text-sm"><strong>Confiança Claude:</strong> ${analysis.claude_confidence || 0}%</p>
              ${analysis.alerts_count > 0 ? `<p class="text-sm text-red-600"><strong>Alertas:</strong> ${analysis.alerts_count}</p>` : ''}
            </div>
          ` : ''}
          <button class="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600" onclick="window.selectFarm('${farm.id}')">
            Ver Detalhes
          </button>
        </div>
      `

      marker.bindPopup(popupContent)

      // Event listener para seleção
      marker.on('click', () => {
        if (onFarmSelect) {
          onFarmSelect(farm)
        }
      })

      marker.addTo(map)
      newMarkers.push(marker)
    })

    markersRef.current = newMarkers

    // Ajustar zoom para mostrar todas as fazendas
    if (farms.length > 0) {
      const bounds = farms
        .filter(farm => farm.coordinates?.center)
        .map(farm => farm.coordinates.center as [number, number])
      
      if (bounds.length > 0) {
        const latLngs = bounds.map(([lat, lng]) => [lat, lng] as [number, number])
        map.fitBounds(latLngs, { padding: [20, 20] })
      }
    }

    // Adicionar função global para callback do popup
    if (typeof window !== 'undefined') {
      (window as any).selectFarm = (farmId: string) => {
        const farm = farms.find(f => f.id === farmId)
        if (farm && onFarmSelect) {
          onFarmSelect(farm)
        }
      }
    }

  }, [map, farms, analyses, selectedFarm, onFarmSelect])

  // Atualizar camadas NDVI
  useEffect(() => {
    if (!map || !showNDVI || !window.L || !selectedFarm) {
      // Limpar camadas NDVI se não estiver mostrando
      ndviLayersRef.current.forEach(layer => layer.remove())
      ndviLayersRef.current = []
      return
    }

    const L = window.L

    // Simular camada NDVI (em produção, isso viria da API como imagem)
    if (selectedFarm.coordinates?.coordinates?.[0]) {
      const coordinates = selectedFarm.coordinates.coordinates[0]
      const latLngs = coordinates.map(([lng, lat]) => [lat, lng])

      // Remover camadas antigas
      ndviLayersRef.current.forEach(layer => layer.remove())

      // Criar polígono com cor baseada no NDVI
      const analysis = analyses[selectedFarm.id]
      let fillColor = '#10b981'
      let fillOpacity = 0.3

      if (analysis?.ndvi_average) {
        if (analysis.ndvi_average < 0.3) {
          fillColor = '#ef4444'
          fillOpacity = 0.5
        } else if (analysis.ndvi_average < 0.5) {
          fillColor = '#f59e0b'
          fillOpacity = 0.4
        } else {
          fillColor = '#10b981'
          fillOpacity = 0.3
        }
      }

      const polygon = L.polygon(latLngs, {
        color: fillColor,
        weight: 2,
        opacity: 0.8,
        fillColor: fillColor,
        fillOpacity: fillOpacity
      })

      polygon.addTo(map)
      ndviLayersRef.current = [polygon]

      // Ajustar zoom para a fazenda selecionada
      map.fitBounds(polygon.getBounds(), { padding: [20, 20] })
    }

  }, [map, showNDVI, selectedFarm, analyses])

  // Redimensionar mapa quando necessário
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }
  }, [map, height, className])

  if (!isClient) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-gray-500">Carregando mapa...</div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg overflow-hidden border border-gray-200"
      />
      
      {/* Legenda NDVI */}
      {showNDVI && (
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-md">
          <h4 className="text-sm font-semibold mb-2">Legenda NDVI</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-red-500 rounded"></div>
              <span>Baixo (&lt; 0.3)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-yellow-500 rounded"></div>
              <span>Médio (0.3 - 0.5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-green-500 rounded"></div>
              <span>Alto (&gt; 0.5)</span>
            </div>
          </div>
        </div>
      )}

      {/* Controles customizados */}
      <div className="absolute top-4 left-4 space-y-2">
        {onFarmSelect && (
          <button
            onClick={() => onFarmSelect(undefined as any)}
            className="bg-white hover:bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
          >
            Limpar Seleção
          </button>
        )}
      </div>
    </div>
  )
}
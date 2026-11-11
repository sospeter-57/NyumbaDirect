import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Property } from '../types'
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '../utils/leaflet'

export interface MapLocation {
  latitude: number
  longitude: number
}

interface PropertyMapProps {
  properties: Property[]
  center: [number, number]
  zoom?: number
  className?: string
  showPopups?: boolean
  fitToMarkers?: boolean
  selectedId?: number | null
  onSelect?: (id: number) => void
  userLocation?: MapLocation | null
}

export function MapZoomControls() {
  const map = useMap()
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-[1000]">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 w-9 h-9 rounded-lg shadow-md flex items-center justify-center text-lg font-medium transition-colors"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 w-9 h-9 rounded-lg shadow-md flex items-center justify-center text-lg font-medium transition-colors"
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  )
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  const key = positions.map((p) => p.join(',')).join('|')

  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], Math.max(map.getZoom(), 14))
      return
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 15 })
    // positions is represented by key to avoid refitting on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])

  return null
}

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
  }, [latitude, longitude, map])

  return null
}

export default function PropertyMap({
  properties,
  center,
  zoom = 6,
  className = '',
  showPopups = true,
  fitToMarkers = false,
  selectedId = null,
  onSelect,
  userLocation = null,
}: PropertyMapProps) {
  const positions = properties.map(
    (p) => [p.latitude, p.longitude] as [number, number]
  )

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      <MapZoomControls />
      {fitToMarkers && <FitBounds positions={positions} />}
      {!fitToMarkers && <Recenter latitude={center[0]} longitude={center[1]} />}

      {userLocation && (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={7}
          pathOptions={{
            color: '#15803d',
            fillColor: '#22c55e',
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>
      )}

      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.latitude, property.longitude]}
          zIndexOffset={selectedId === property.id ? 1000 : 0}
          eventHandlers={{
            click: () => onSelect?.(property.id),
          }}
        >
          {showPopups && (
            <Popup>
              <div className="text-sm space-y-1">
                <strong className="block">
                  {property.title || `${property.house_type} Unit`}
                </strong>
                <span className="block text-slate-600">
                  {property.house_type} · KES {property.rent.toLocaleString()}/month
                </span>
                {property.location_desc && (
                  <span className="block text-slate-500 text-xs">
                    {property.location_desc}
                  </span>
                )}
                <Link
                  to={`/properties/${property.id}`}
                  className="inline-block mt-1 font-medium text-green-700 hover:text-green-800"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  )
}

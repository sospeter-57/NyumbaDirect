import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useGeolocation } from '../hooks/useGeolocation'
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '../utils/leaflet'

interface LocationPickerProps {
  latitude: number
  longitude: number
  onChange: (latitude: number, longitude: number) => void
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function ClickHandler({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), 14))
  }, [latitude, longitude, map])

  return null
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const geolocation = useGeolocation(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    if (
      geolocation.latitude !== null &&
      geolocation.longitude !== null
    ) {
      onChange(geolocation.latitude, geolocation.longitude)
    }
    // only react to successful geolocation results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.latitude, geolocation.longitude])

  const search = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchError('')
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q,
        countrycodes: 'ke',
        limit: '5',
        addressdetails: '0',
      })
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { Accept: 'application/json' } }
      )
      if (!res.ok) throw new Error('Search failed')
      const data = (await res.json()) as NominatimResult[]
      setResults(data)
      if (data.length === 0) setSearchError('No matching places found')
    } catch {
      setSearchError('Could not search right now. Try again.')
    } finally {
      setSearching(false)
    }
  }

  const chooseResult = (result: NominatimResult) => {
    onChange(parseFloat(result.lat), parseFloat(result.lon))
    setResults([])
    setQuery(result.display_name)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              search()
            }
          }}
          placeholder="Search a place, e.g. Kilimani, Nairobi"
          className="flex-1 border border-slate-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="bg-black text-white px-4 py-3 rounded-xl text-sm hover:bg-gray-800 font-medium disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={() => geolocation.request()}
          disabled={geolocation.loading}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-3 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {geolocation.loading ? 'Locating...' : 'Use my location'}
        </button>
      </div>

      {searchError && (
        <p className="text-xs text-red-600 dark:text-red-400">{searchError}</p>
      )}
      {geolocation.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{geolocation.error}</p>
      )}

      {results.length > 0 && (
        <ul className="border border-slate-200 dark:border-gray-700 rounded-xl divide-y divide-slate-100 dark:divide-gray-700 overflow-hidden">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => chooseResult(r)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <ClickHandler onPick={onChange} />
          <Recenter latitude={latitude} longitude={longitude} />
          <Marker
            position={[latitude, longitude]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng()
                onChange(p.lat, p.lng)
              },
            }}
          />
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Click or drag the pin to set the exact location. Coordinates:{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </p>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { api } from '../utils/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '../utils/leaflet'
import type { LocationResult, LocationValue } from '../types'

interface LocationPickerProps {
  value: LocationValue | null
  onChange: (value: LocationValue) => void
}

const FALLBACK_CENTER: [number, number] = [20, 0]

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

function MapController({
  target,
}: {
  target: { latitude: number; longitude: number; zoom: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!target) return
    map.flyTo([target.latitude, target.longitude], target.zoom, { duration: 0.8 })
  }, [target, map])

  return null
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const geolocation = useGeolocation(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [target, setTarget] = useState<{
    latitude: number
    longitude: number
    zoom: number
  } | null>(null)

  const skipSearchRef = useRef('')
  const reverseSeqRef = useRef(0)
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reverseAbortRef = useRef<AbortController | null>(null)

  const commitManualPoint = useCallback(
    (latitude: number, longitude: number) => {
      onChange({
        place_id: '',
        name: '',
        formatted_address: '',
        latitude,
        longitude,
      })

      const seq = ++reverseSeqRef.current
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current)
      if (reverseAbortRef.current) reverseAbortRef.current.abort()

      reverseTimerRef.current = setTimeout(async () => {
        const controller = new AbortController()
        reverseAbortRef.current = controller
        try {
          const result = await api.geocode.reverse(latitude, longitude, {
            signal: controller.signal,
          })
          if (seq !== reverseSeqRef.current || !result) return
          onChange({
            place_id: result.place_id,
            name: result.name,
            formatted_address: result.formatted_address,
            latitude,
            longitude,
          })
        } catch {
          if (seq !== reverseSeqRef.current) return
        }
      }, 450)
    },
    [onChange]
  )

  const commitSelection = useCallback(
    (result: LocationResult) => {
      ++reverseSeqRef.current
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current)
      if (reverseAbortRef.current) reverseAbortRef.current.abort()

      const label = result.name || result.formatted_address
      skipSearchRef.current = label
      setQuery(label)
      setResults([])
      setOpen(false)
      setActiveIndex(-1)
      setTarget({ latitude: result.latitude, longitude: result.longitude, zoom: 16 })
      onChange({
        place_id: result.place_id,
        name: result.name,
        formatted_address: result.formatted_address,
        latitude: result.latitude,
        longitude: result.longitude,
      })
    },
    [onChange]
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || q === skipSearchRef.current) {
      setResults([])
      setOpen(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const data = await api.geocode.search(q, {
          limit: 8,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setResults(data)
        setOpen(data.length > 0)
        setActiveIndex(data.length > 0 ? 0 : -1)
        if (data.length === 0) setSearchError('No matching places found')
      } catch {
        if (controller.signal.aborted) return
        setSearchError('Could not search right now. Try again.')
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    if (geolocation.latitude === null || geolocation.longitude === null) return
    const latitude = geolocation.latitude
    const longitude = geolocation.longitude
    setTarget({ latitude, longitude, zoom: 16 })
    commitManualPoint(latitude, longitude)
    // only react to a new geolocation fix
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.latitude, geolocation.longitude])

  const goToMyLocation = () => {
    geolocation.request()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length > 0) {
        setOpen(true)
        setActiveIndex((i) => (i + 1) % results.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length > 0) {
        setOpen(true)
        setActiveIndex((i) => (i - 1 + results.length) % results.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && activeIndex >= 0 && results[activeIndex]) {
        commitSelection(results[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const center: [number, number] = value
    ? [value.latitude, value.longitude]
    : FALLBACK_CENTER

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              skipSearchRef.current = ''
              setQuery(e.target.value)
            }}
            onFocus={() => {
              if (results.length > 0) setOpen(true)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search a school, church, business, address or landmark anywhere"
            className="w-full border border-slate-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          )}
          {open && results.length > 0 && (
            <ul
              className="absolute z-[1200] mt-1 w-full max-h-72 overflow-y-auto bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-gray-700"
              role="listbox"
            >
              {results.map((r, i) => (
                <li key={`${r.place_id}-${i}`} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commitSelection(r)}
                    className={`w-full text-left px-4 py-2.5 transition-colors ${
                      i === activeIndex
                        ? 'bg-green-50 dark:bg-gray-800'
                        : 'hover:bg-green-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {r.name || r.formatted_address}
                    </span>
                    {r.name && r.formatted_address && (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {r.formatted_address}
                      </span>
                    )}
                    {r.category && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-green-700 dark:text-green-400">
                        {r.category.replace('/', ' · ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={goToMyLocation}
          disabled={geolocation.loading}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-3 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {geolocation.loading ? 'Locating...' : 'Use my location'}
        </button>
      </div>

      {searchError && !open && (
        <p className="text-xs text-red-600 dark:text-red-400">{searchError}</p>
      )}
      {geolocation.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{geolocation.error}</p>
      )}

      <div className="relative h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700">
        <MapContainer
          center={center}
          zoom={value ? 15 : 2}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <ClickHandler onPick={commitManualPoint} />
          <MapController target={target} />
          {value && (
            <Marker
              position={[value.latitude, value.longitude]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng()
                  commitManualPoint(p.lat, p.lng)
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {value ? (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            {value.name || 'Selected location'}
          </p>
          {value.formatted_address && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              {value.formatted_address}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Search anywhere in the world, or click/drag the pin on the map to set an exact location.
        </p>
      )}
    </div>
  )
}

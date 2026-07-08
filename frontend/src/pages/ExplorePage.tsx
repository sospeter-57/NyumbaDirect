import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import { haversineDistance, formatDistance } from '../utils/haversine'
import type { Property } from '../types'

function PropertyCard({ property, userLat, userLng }: { property: Property; userLat: number | null; userLng: number | null }) {
  const distance = useMemo(() => {
    if (userLat === null || userLng === null) return null
    return formatDistance(haversineDistance(userLat, userLng, property.latitude, property.longitude))
  }, [userLat, userLng, property.latitude, property.longitude])

  const amenities: string[] = []
  if (property.has_borehole) amenities.push('Borehole')
  if (property.is_tokens_meter) amenities.push('Token Meter')
  if (property.has_hot_shower) amenities.push('Hot Shower')
  if (property.has_wifi) amenities.push('WiFi')

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="h-1.5 bg-gradient-to-r from-green-600 to-green-400" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-semibold text-black truncate">{property.title || `${property.house_type} Unit`}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{property.location_desc || 'Nairobi'}</p>
          </div>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0">
            {property.house_type}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-2xl font-bold text-black">KES {property.rent.toLocaleString()}</span>
          <span className="text-xs text-slate-400">/month</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
          {property.deposit > 0 && (
            <span className="text-slate-500">Deposit: <span className="font-medium text-black">KES {property.deposit.toLocaleString()}</span></span>
          )}
          {distance && (
            <span className="text-green-700 font-medium">{distance} away</span>
          )}
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {amenities.map((a) => (
              <span key={a} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-lg font-medium">{a}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Link to={`/properties/${property.id}`} className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors">
            View Details &rarr;
          </Link>
          {property.pets_allowed && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-medium">Pets OK</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
        () => {}
      )
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    api.properties.list({ north: 4.0, south: -5.0, east: 42.0, west: 33.0 })
      .then(setProperties)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-12 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Find Your Next Home</h1>
          <p className="text-slate-400 text-sm mt-1">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} userLat={userLat} userLng={userLng} />
        ))}
        {!loading && properties.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-400">
            <p className="text-lg font-medium">No properties found</p>
            <p className="text-sm mt-1">Check back later for new listings</p>
          </div>
        )}
      </div>
    </div>
  )
}

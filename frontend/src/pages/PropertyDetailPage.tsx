import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { haversineDistance, formatDistance } from '../utils/haversine'
import type { Property, RepairRate } from '../types'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isTenant } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [repairRates, setRepairRates] = useState<RepairRate[]>([])
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [contactInfo, setContactInfo] = useState<{
    phone: string
    whatsapp_link: string
  } | null>(null)
  const [photos, setPhotos] = useState<{ id: number; url: string; is_primary: boolean }[]>([])
  const [analytics, setAnalytics] = useState<{
    average_rent_1km: number
    deviation_1km: number
  } | null>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const propId = parseInt(id)
    Promise.all([
      api.properties.get(propId),
      api.analytics.fairness(propId).catch(() => null),
    ]).then(([propData, analyticsData]) => {
      setProperty(propData.property)
      setRepairRates(propData.repair_rates || [])
      setPhotos(propData.photos || [])
      if (analyticsData) setAnalytics(analyticsData)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude)
          setUserLng(pos.coords.longitude)
        },
        () => {}
      )
    }
  }, [])

  const handleUnlock = async () => {
    if (!id) return
    setUnlocking(true)
    try {
      const data = await api.properties.unlock(parseInt(id))
      setContactInfo(data)
      setUnlocked(true)
    } catch {
      alert('Please purchase an unlock subscription first.')
    } finally {
      setUnlocking(false)
    }
  }

  const handlePayUnlock = async () => {
    if (!id) return
    setUnlocking(true)
    try {
      const data = await api.payments.payUnlock(parseInt(id))
      if (data.checkout_request_id) {
        const status = await api.payments.subscriptionStatus('unlock')
        if (status.active) {
          setPaymentComplete(true)
          return
        }
        alert('STK Push sent to your phone. Please enter your M-Pesa PIN to complete payment.')
        const checkInterval = setInterval(async () => {
          try {
            const s = await api.payments.subscriptionStatus('unlock')
            if (s.active) {
              clearInterval(checkInterval)
              setPaymentComplete(true)
            }
          } catch {
            // keep polling
          }
        }, 3000)
        setTimeout(() => clearInterval(checkInterval), 120000)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Payment failed. Please try again.')
    } finally {
      setUnlocking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-black">Property Not Found</h1>
        <Link to="/explore" className="text-green-700 text-sm mt-2 inline-block">
          Back to Explore
        </Link>
      </div>
    )
  }

  const distance =
    userLat && userLng
      ? formatDistance(
          haversineDistance(userLat, userLng, property.latitude, property.longitude)
        )
      : null

  const amenities: string[] = []
  if (property.has_borehole) amenities.push('Borehole')
  if (property.is_tokens_meter) amenities.push('Token Meter')
  if (property.has_hot_shower) amenities.push('Hot Shower')
  if (property.has_wifi) amenities.push('WiFi')

  return (
    <div className="px-12 py-8 max-w-4xl mx-auto">
      <Link
        to="/explore"
        className="text-sm text-green-700 hover:text-green-800 mb-4 inline-block"
      >
        &larr; Back to Explore
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-black">
                  {property.title || `${property.house_type} Unit`}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {property.location_desc || 'Nairobi'}
                </p>
                {distance && (
                  <p className="text-sm text-green-700 font-medium mt-1">
                    {distance} away
                  </p>
                )}
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-lg">
                {property.house_type}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-black">
                KES {property.rent.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500">/month</span>
            </div>

            {property.deposit > 0 && (
              <p className="text-sm text-slate-600 mb-4">
                Deposit: KES {property.deposit.toLocaleString()}
              </p>
            )}

            {property.description && (
              <p className="text-sm text-slate-600 mb-4">{property.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {amenities.map((a) => (
                <span
                  key={a}
                  className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-lg"
                >
                  {a}
                </span>
              ))}
            </div>

            {photos.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:opacity-90 transition-opacity">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {property.agreement_doc && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">Tenancy Agreement</p>
                    <p className="text-xs text-green-600 truncate">{property.agreement_doc}</p>
                  </div>
                  <a href={property.agreement_doc} target="_blank" rel="noopener noreferrer" className="bg-green-700 hover:bg-green-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl shrink-0 transition-colors">
                    Download
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-1 text-sm text-slate-600">
              {property.gate_curfew_enabled && <p>Gate curfew enforced</p>}
              {property.water_rationing_active && <p>Water rationing active</p>}
              {property.pets_allowed && <p>Pets allowed</p>}
              {!property.pets_allowed && <p>No pets</p>}
            </div>
          </div>

          {analytics && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
              <h3 className="text-sm font-semibold text-black mb-2">
                Market Fairness Analysis
              </h3>
              {analytics.average_rent_1km > 0 && (
                <p className="text-sm text-slate-600">
                  1km avg: KES {analytics.average_rent_1km.toLocaleString()} —
                  <span
                    className={`font-medium ${
                      analytics.deviation_1km <= 0 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {analytics.deviation_1km > 0 ? '+' : ''}
                    {analytics.deviation_1km.toFixed(1)}% vs neighborhood
                  </span>
                </p>
              )}
            </div>
          )}

          {repairRates.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
              <h3 className="text-sm font-semibold text-black mb-2">
                Standard Repair Deductions
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {repairRates.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-1 text-black">{r.item_name}</td>
                      <td className="py-1 text-right text-black">
                        {r.cost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553-2.276A1 1 0 0021 13.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 0l-6-3" />
              </svg>
              {showMap ? 'Hide Map' : 'View on Map'}
            </button>
            {showMap && property && (
              <div className="mt-2 h-64 rounded-xl overflow-hidden border border-slate-200">
                <MapContainer
                  center={[property.latitude, property.longitude]}
                  zoom={15}
                  className="w-full h-full"
                  zoomControl={true}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[property.latitude, property.longitude]}>
                    <Popup>
                      <div className="text-sm">
                        <strong>{property.title || property.house_type}</strong>
                        <br />KES {property.rent.toLocaleString()}/month
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-20">
            {unlocked && contactInfo ? (
              <div className="space-y-3">
                  <div className="bg-green-100 text-green-800 text-sm p-3 rounded-xl">
                  <p className="font-medium">Contact Unlocked</p>
                  <p className="text-xs mt-1">{contactInfo.phone}</p>
                </div>
                <a
                  href={contactInfo.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-700 hover:bg-green-800 text-white text-center font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Chat on WhatsApp
                </a>
              </div>
            ) : paymentComplete ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-xl text-center">
                  <p className="font-medium">Payment Successful</p>
                  <p className="text-xs mt-1">Now unlock the contact to view details</p>
                </div>
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {unlocking ? 'Processing...' : 'Unlock Contact'}
                </button>
              </div>
            ) : isTenant ? (
              <div className="space-y-3">
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {unlocking ? 'Processing...' : 'Unlock Contact'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  One-time fee of KES 99 to view landlord contact
                </p>
                <button
                  onClick={handlePayUnlock}
                  disabled={unlocking}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  Pay with M-Pesa
                </button>
              </div>
            ) : user?.role === 'landlord' ? (
              <p className="text-xs text-slate-500 text-center">
                You are viewing as a landlord
              </p>
            ) : (
              <Link
                to="/login"
                className="block w-full bg-green-700 hover:bg-green-800 text-white text-center font-medium py-2.5 rounded-xl text-sm"
              >
                Sign in to Unlock
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

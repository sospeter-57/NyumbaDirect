import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api, uploadUrl } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { haversineDistance, formatDistance } from '../utils/haversine'
import type { Property, RepairRate } from '../types'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'

function ZoomControls() {
  const map = useMap()
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-[1000]">
      <button onClick={() => map.zoomIn()} className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 w-9 h-9 rounded-lg shadow-md flex items-center justify-center text-lg font-medium transition-colors">+</button>
      <button onClick={() => map.zoomOut()} className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 w-9 h-9 rounded-lg shadow-md flex items-center justify-center text-lg font-medium transition-colors">−</button>
    </div>
  )
}
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
  const [landlordRating, setLandlordRating] = useState(0)
  const [landlordRatingSubmitted, setLandlordRatingSubmitted] = useState(false)
  const [landlordRatingSending, setLandlordRatingSending] = useState(false)

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
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-black dark:text-white">Property Not Found</h1>
        <Link to="/explore" className="text-green-700 dark:text-green-400 text-sm mt-2 inline-block">
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
        className="text-sm text-green-700 dark:text-green-400 hover:text-green-800 mb-4 inline-block"
      >
        &larr; Back to Explore
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">
                  {property.title || `${property.house_type} Unit`}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {property.location_desc || 'Nairobi'}
                </p>
                {distance && (
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium mt-1">
                    {distance} away
                  </p>
                )}
              </div>
              <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-medium px-2 py-1 rounded-lg">
                {property.house_type}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-black dark:text-white">
                KES {property.rent.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
            </div>

            {property.deposit > 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Deposit: KES {property.deposit.toLocaleString()}
              </p>
            )}

            {property.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{property.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {amenities.map((a) => (
                <span
                  key={a}
                  className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-lg"
                >
                  {a}
                </span>
              ))}
            </div>

            {photos.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((p) => (
                    <a key={p.id} href={uploadUrl(p.url)} target="_blank" rel="noopener noreferrer" className="block aspect-video rounded-xl overflow-hidden bg-white/80 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:opacity-90 transition-opacity">
                      <img src={uploadUrl(p.url)} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {property.agreement_doc && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-700 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Tenancy Agreement</p>
                    <p className="text-xs text-green-600 dark:text-green-400 truncate">{property.agreement_doc}</p>
                  </div>
                  <a href={uploadUrl(property.agreement_doc)} target="_blank" rel="noopener noreferrer" className="bg-green-700 hover:bg-green-800 dark:hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-xl shrink-0 transition-colors">
                    Download
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {property.gate_curfew_enabled && <p>Gate curfew enforced</p>}
              {property.water_rationing_active && <p>Water rationing active</p>}
              {property.pets_allowed && <p>Pets allowed</p>}
              {!property.pets_allowed && <p>No pets</p>}
            </div>
          </div>

          {analytics && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mt-4">
              <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
                Market Fairness Analysis
              </h3>
              {analytics.average_rent_1km > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  1km avg: KES {analytics.average_rent_1km.toLocaleString()} —
                  <span
                    className={`font-medium ${
                      analytics.deviation_1km <= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
            <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-xl p-4 mt-4">
              <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
                Standard Repair Deductions
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-gray-700">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-right">Cost (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {repairRates.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-1 text-black dark:text-white">{r.item_name}</td>
                      <td className="py-1 text-right text-black dark:text-white">
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
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 hover:text-green-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553-2.276A1 1 0 0021 13.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 0l-6-3" />
              </svg>
              View on Map
            </button>
          </div>

          {showMap && property && (
              <div className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowMap(false)}>
              <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-gray-700 animate-in" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553-2.276A1 1 0 0021 13.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 0l-6-3" />
                    </svg>
                    <div>
                      <h3 className="font-semibold">{property.title || property.house_type}</h3>
                      <p className="text-green-200 dark:text-green-400 text-xs">KES {property.rent.toLocaleString()}/month &middot; {property.location_desc || 'Nairobi'}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowMap(false)} className="text-white/80 dark:text-white/60 hover:text-white bg-white/10 hover:bg-white/20 dark:hover:bg-white/10 rounded-xl p-2 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="relative h-[55vh] min-h-[380px]">
                  <MapContainer
                    center={[property.latitude, property.longitude]}
                    zoom={16}
                    className="w-full h-full z-0"
                    zoomControl={false}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ZoomControls />
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
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-4 sticky top-20">
            {unlocked && contactInfo ? (
              <div className="space-y-3">
                  <div className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-sm p-3 rounded-xl">
                  <p className="font-medium">Contact Unlocked</p>
                  <p className="text-xs mt-1">{contactInfo.phone}</p>
                </div>
                <a
                  href={contactInfo.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-700 hover:bg-green-800 dark:hover:bg-green-700 text-white text-center font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Chat on WhatsApp
                </a>
                <div className="border-t border-slate-200 dark:border-gray-700 pt-3 mt-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Rate this Landlord</p>
                  {landlordRatingSubmitted ? (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Rating submitted. Thank you!</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setLandlordRating(s)}
                            className="p-0.5 transition-colors"
                          >
                            <svg className={`w-5 h-5 ${s <= landlordRating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'} hover:scale-110 transition-transform`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          if (!property || landlordRating === 0) return
                          setLandlordRatingSending(true)
                          try {
                            await api.landlord.rate(property.landlord_id, landlordRating, '')
                            setLandlordRatingSubmitted(true)
                          } catch (err: unknown) {
                            if (err instanceof Error && err.message.includes('already rated')) {
                              setLandlordRatingSubmitted(true)
                            } else {
                              alert(err instanceof Error ? err.message : 'Failed to submit rating')
                            }
                          } finally {
                            setLandlordRatingSending(false)
                          }
                        }}
                        disabled={landlordRating === 0 || landlordRatingSending}
                        className="w-full text-xs bg-green-700 hover:bg-green-800 dark:hover:bg-green-700 text-white font-medium py-2 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {landlordRatingSending ? 'Submitting...' : 'Submit Rating'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : paymentComplete ? (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm p-3 rounded-xl text-center">
                  <p className="font-medium">Payment Successful</p>
                  <p className="text-xs mt-1">Now unlock the contact to view details</p>
                </div>
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full bg-green-700 hover:bg-green-800 dark:hover:bg-green-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {unlocking ? 'Processing...' : 'Unlock Contact'}
                </button>
              </div>
            ) : isTenant ? (
              <div className="space-y-3">
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full bg-green-700 hover:bg-green-800 dark:hover:bg-green-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {unlocking ? 'Processing...' : 'Unlock Contact'}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  One-time fee of KES 99 to view landlord contact
                </p>
                <button
                  onClick={handlePayUnlock}
                  disabled={unlocking}
                  className="w-full bg-black hover:bg-gray-800 dark:hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  Pay with M-Pesa
                </button>
              </div>
            ) : user?.role === 'landlord' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                You are viewing as a landlord
              </p>
            ) : (
              <Link
                to="/login"
                className="block w-full bg-green-700 hover:bg-green-800 dark:hover:bg-green-700 text-white text-center font-medium py-2.5 rounded-xl text-sm"
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

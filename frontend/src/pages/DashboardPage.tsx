import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import type { Property, RepairRate, TrafficStats } from '../types'

interface ListingWithDetails {
  property: Property
  repair_rates: RepairRate[]
  traffic: TrafficStats
}

export default function DashboardPage() {
  const [listings, setListings] = useState<ListingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.properties
      .myListings()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePay = async (propId: number) => {
    try {
      const data = await api.payments.payListing(propId)
      if (data.checkout_request_id) {
        const status = await api.payments.subscriptionStatus('listing')
        if (status.active) {
          window.location.reload()
          return
        }
        alert('STK Push sent! Check your phone and enter M-Pesa PIN.')
        const interval = setInterval(async () => {
          try {
            const s = await api.payments.subscriptionStatus('listing')
            if (s.active) {
              clearInterval(interval)
              window.location.reload()
            }
          } catch {
            // keep polling
          }
        }, 3000)
        setTimeout(() => clearInterval(interval), 120000)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Payment failed')
    }
  }

  if (loading) {
    return (
      <div className="px-12 py-8 text-center text-slate-500">Loading dashboard...</div>
    )
  }

  return (
    <div className="px-12 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">My Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your property listings</p>
        </div>
        <Link
          to="/listings/new"
          className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          + New Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">You haven't posted any listings yet.</p>
          <Link
            to="/listings/new"
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl text-sm font-medium inline-block"
          >
            Post Your First Listing
          </Link>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {listings.map(({ property, repair_rates, traffic }) => (
            <div
              key={property.id}
              className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-1.5 bg-gradient-to-r from-green-600 to-green-400" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-semibold text-black truncate">
                      {property.title || `${property.house_type} Unit`}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {property.location_desc || 'No location'}
                    </p>
                  </div>
                  <StatusBadge status={property.active_status} />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 bg-slate-50 rounded-xl p-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Rent</p>
                    <p className="text-base font-bold text-black mt-0.5">
                      KES {property.rent.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Unlocks</p>
                    <p className="text-base font-bold text-black mt-0.5">
                      {traffic?.total_unlocks ?? 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Tenants</p>
                    <p className="text-base font-bold text-black mt-0.5">
                      {traffic?.unique_tenants ?? 0}
                    </p>
                  </div>
                </div>

                {repair_rates.length > 0 && (
                  <details className="text-xs text-slate-500 mb-3">
                    <summary className="cursor-pointer hover:text-black font-medium">
                      {repair_rates.length} Repair Rate{repair_rates.length !== 1 ? 's' : ''}
                    </summary>
                    <ul className="mt-1.5 space-y-1">
                      {repair_rates.map((r) => (
                        <li key={r.id} className="flex justify-between py-0.5">
                          <span>{r.item_name}</span>
                          <span className="font-medium text-black">KES {r.cost.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {property.active_status === 'PENDING_PAY' && (
                  <button
                    onClick={() => handlePay(property.id)}
                    className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
                  >
                    Pay KES 299 to Activate
                  </button>
                )}

                {property.active_status === 'ACTIVE' && (
                  <Link
                    to={`/properties/${property.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
                  >
                    View Public Listing &rarr;
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Property['active_status'] }) {
  const styles: Record<string, string> = {
    PENDING_PAY: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    ACTIVE: 'bg-green-100 text-green-800 border border-green-200',
    FLAGGED: 'bg-red-100 text-red-800 border border-red-200',
    INACTIVE: 'bg-slate-100 text-slate-500 border border-slate-200',
  }
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${styles[status] || 'bg-slate-100'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

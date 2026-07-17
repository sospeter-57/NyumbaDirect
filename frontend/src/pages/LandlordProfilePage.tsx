import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadUrl } from '../utils/api'
import type { User, Property } from '../types'

export default function LandlordProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [ratingAvg, setRatingAvg] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.landlord.profile()
      .then((data) => {
        setUser(data.user)
        setProperties(data.properties)
        setRatingAvg(data.rating_average)
        setRatingCount(data.rating_count)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await api.upload.profilePicture(file)
      setUser((prev) => prev ? { ...prev, profile_picture: data.profile_picture } : null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div className="px-12 py-8 text-center text-slate-500 dark:text-slate-400">Loading profile...</div>
  }

  if (!user) {
    return (
      <div className="px-12 py-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Could not load profile.</p>
        <Link to="/explore" className="text-green-700 dark:text-green-400 text-sm mt-2 inline-block">Back to Explore</Link>
      </div>
    )
  }

  return (
    <div className="px-12 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-black dark:text-white mb-1">My Profile</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Manage your landlord account</p>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-2xl overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-2 ring-white/50">
                {user.profile_picture ? (
                  <img src={uploadUrl(user.profile_picture)} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user.name || user.business_name || user.phone).charAt(0).toUpperCase()
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 text-white text-xs font-medium flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? '...' : 'Change'}
              </button>
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{user.name || 'Landlord'}</h2>
              {user.business_name && <p className="text-green-200 dark:text-green-400 text-sm font-medium">{user.business_name}</p>}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Phone</p>
            <p className="text-black dark:text-white font-medium mt-0.5">{user.phone}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Role</p>
            <p className="text-black dark:text-white font-medium mt-0.5 capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Listings</p>
            <p className="text-black dark:text-white font-medium mt-0.5">{properties.length}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Member Since</p>
            <p className="text-black dark:text-white font-medium mt-0.5">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {ratingCount > 0 && (
          <div className="px-6 pb-4 border-t border-slate-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className={`w-4 h-4 ${s <= Math.round(ratingAvg) ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{ratingAvg.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-3">My Listings ({properties.length})</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No listings yet.</p>
        ) : (
          <div className="space-y-3">
            {properties.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <Link to={`/properties/${p.id}`} className="text-sm font-medium text-green-700 dark:text-green-400 hover:text-green-800">
                    {p.title || `${p.house_type} Unit`}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.house_type} &middot; KES {p.rent.toLocaleString()}/mo</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                  p.active_status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  p.active_status === 'PENDING_PAY' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-slate-100 text-slate-500'
                }`}>{p.active_status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadUrl } from '../utils/api'
import type { User } from '../types'

interface UnlockRecord {
  id: number
  property_id: number
  property_title: string
  house_type: string
  unlocked_at: string
}

interface ReviewRecord {
  id: number
  property_id: number
  property_title: string
  house_type: string
  is_fraud: boolean
  is_occupied: boolean
  extra_fees: boolean
  comments: string
  created_at: string
}

export default function TenantProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [unlocks, setUnlocks] = useState<UnlockRecord[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.tenant.profile()
      .then((data) => {
        setUser(data.user)
        setUnlocks(data.unlocks)
        setReviews(data.reviews)
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
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Your activity on NyumbaDirect</p>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-2xl overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-2 ring-white/50">
                {user.profile_picture ? (
                  <img src={uploadUrl(user.profile_picture)} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user.name || user.phone).charAt(0).toUpperCase()
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
              <h2 className="text-xl font-bold">{user.name || 'Tenant'}</h2>
              <p className="text-green-200 dark:text-green-400 text-sm capitalize">{user.role}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Phone</p>
            <p className="text-black dark:text-white font-medium mt-0.5">{user.phone}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Member Since</p>
            <p className="text-black dark:text-white font-medium mt-0.5">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-3">
          Properties Viewed ({unlocks.length})
        </h2>
        {unlocks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No properties viewed yet.</p>
        ) : (
          <div className="space-y-3">
            {unlocks.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <Link to={`/properties/${u.property_id}`} className="text-sm font-medium text-green-700 dark:text-green-400 hover:text-green-800">
                    {u.property_title || `${u.house_type} Unit`}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{u.house_type}</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(u.unlocked_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-3">
          My Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No reviews submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <Link to={`/properties/${r.property_id}`} className="text-sm font-medium text-green-700 dark:text-green-400 hover:text-green-800">
                    {r.property_title || `${r.house_type} Unit`}
                  </Link>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {r.is_fraud && <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-lg">Reported Fraud</span>}
                  {r.is_occupied && <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-lg">Occupied</span>}
                  {r.extra_fees && <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-lg">Extra Fees</span>}
                </div>
                {r.comments && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.comments}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

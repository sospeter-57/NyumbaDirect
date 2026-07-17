import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadUrl } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import type { Property } from '../types'

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) return
    const duration = 1500
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <>{display.toLocaleString()}{suffix}</>
}

export default function HomePage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [testimonials, setTestimonials] = useState<{ id: number; message: string; author: string; profile_picture: string; created_at: string }[]>([])
  const [stats, setStats] = useState<{ active_properties: number; landlords: number; contact_unlocks: number } | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  useEffect(() => {
    Promise.all([
      api.properties.list({ north: 4.0, south: -5.0, east: 42.0, west: 33.0 }).catch(() => []),
      api.feedback.list().catch(() => []),
      api.stats.get().catch(() => null),
    ]).then(([props, fb, st]) => {
      setProperties(props)
      setTestimonials(fb)
      setStats(st)
    })
  }, [])

  const featured = properties.filter((p) => p.active_status === 'ACTIVE').slice(0, 4)

  return (
    <div>
      {/* ───────────── HERO ───────────── */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950 via-green-900 to-green-800" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 -left-32 w-96 h-96 bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px]" />
        <div className="relative px-12 py-28 max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300/80 text-xs font-semibold tracking-widest uppercase">Kenya's Trusted Rental Marketplace</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight animate-fade-in-up">
              Find Your<br />
              <span className="bg-gradient-to-r from-green-300 via-emerald-300 to-green-400 bg-clip-text text-transparent">Perfect Home</span>
            </h1>
            <p className="text-lg text-white/70 mt-5 leading-relaxed max-w-lg animate-fade-in-up delay-2">
              Connect directly with landlords across Kenya. No brokers, no blind viewing fees — just real homes from real owners.
            </p>
            <div className="flex flex-wrap gap-4 mt-10 animate-fade-in-up delay-3">
              <Link
                to="/explore"
                className="bg-green-500 hover:bg-green-400 text-green-950 font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 active:scale-100"
              >
                Browse Properties
              </Link>
              {!user && (
                <Link
                  to="/register?role=landlord"
                  className="border border-white/20 hover:border-white/40 text-white/90 hover:text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all hover:scale-105 hover:bg-white/5 active:scale-100"
                >
                  List Your Property
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
      </section>

      {/* ───────────── STATS ───────────── */}
      {stats && (
        <section className="px-12 py-12">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 animate-fade-in-up delay-4">
            {[
              { label: 'Active Properties', value: stats.active_properties, icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21h6' },
              { label: 'Landlords', value: stats.landlords, icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
              { label: 'Connections Made', value: stats.contact_unlocks, icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0zm-12 9a5.97 5.97 0 00.297-1.165' },
            ].map((s, i) => (
              <div key={s.label} className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 text-center hover:shadow-lg transition-shadow group">
                <svg className="w-8 h-8 mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                <p className="text-3xl font-bold text-black dark:text-white animate-count-up" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
                  <AnimatedCounter value={s.value} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────────── HOW IT WORKS ───────────── */}
        <section className="px-12 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-black dark:text-white text-center mb-3 animate-fade-in">How It Works</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-12 max-w-lg mx-auto animate-fade-in delay-1">Whether you're looking for a home or listing one, NyumbaDirect makes it simple.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tenants column */}
            <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-3xl p-8 animate-slide-left">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-700 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white">For Tenants</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Browse Listings', desc: 'Explore available properties on the interactive map or list view. Filter by type, price, and location.' },
                  { step: '02', title: 'Pay & Unlock', desc: 'Pay KES 99 via M-Pesa to unlock the landlord\'s phone number and WhatsApp contact.' },
                  { step: '03', title: 'Connect Directly', desc: 'Chat with the landlord directly. No middlemen, no hidden fees — just you and your future home.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="text-green-700 dark:text-green-400 font-bold text-sm shrink-0 mt-0.5 w-6">{item.step}</span>
                    <div>
                      <p className="font-semibold text-black dark:text-white text-sm">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/register" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors">
                Get Started as a Tenant &rarr;
              </Link>
            </div>

            {/* Landlords column */}
            <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-3xl p-8 animate-slide-right">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-700 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white">For Landlords</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Create a Listing', desc: 'Fill in your property details, amenities, photos, and set your repair rates in our multi-step wizard.' },
                  { step: '02', title: 'Pay to Activate', desc: 'Pay KES 299 via M-Pesa to activate your listing and make it visible to thousands of tenants.' },
                  { step: '03', title: 'Receive Inquiries', desc: 'Get direct tenant inquiries with contact details. Track views and unlocks on your dashboard.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="text-green-700 dark:text-green-400 font-bold text-sm shrink-0 mt-0.5 w-6">{item.step}</span>
                    <div>
                      <p className="font-semibold text-black dark:text-white text-sm">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/register?role=landlord" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors">
                Start Listing Properties &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FEATURED LISTINGS ───────────── */}
      {featured.length > 0 && (
        <section className="px-12 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-black dark:text-white animate-fade-in">Featured Properties</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 animate-fade-in delay-1">Hand-picked homes from trusted landlords</p>
              </div>
              <Link to="/explore" className="text-sm font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors animate-fade-in delay-2">
                View All &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/properties/${p.id}`}
                  className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 group animate-fade-in-up"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <div className="h-1.5 bg-gradient-to-r from-green-600 to-green-400" />
                  <div className="p-4">
                    <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-semibold px-2 py-0.5 rounded-lg">{p.house_type}</span>
                    <h3 className="font-semibold text-black dark:text-white text-sm mt-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors truncate">{p.title || `${p.house_type} Unit`}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{p.location_desc || 'Nairobi'}</p>
                    <p className="text-lg font-bold text-black dark:text-white mt-2">KES {p.rent.toLocaleString()}<span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/mo</span></p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── TESTIMONIALS ───────────── */}
      {testimonials.length > 0 && (
      <section className="px-12 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-black dark:text-white text-center mb-3 animate-fade-in">What People Say</h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-10 max-w-lg mx-auto animate-fade-in delay-1">Real feedback from our community</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {testimonials.slice(0, 4).map((t, i) => (
                <div
                  key={t.id}
                  className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 animate-fade-in-up"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">&ldquo;{t.message}&rdquo;</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-bold overflow-hidden shrink-0">
                      {t.profile_picture ? (
                        <img src={uploadUrl(t.profile_picture)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        t.author.charAt(0).toUpperCase()
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{t.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── FEEDBACK FORM ───────────── */}
      <section className="px-12 py-16">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2 animate-fade-in">Help Us Improve</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 animate-fade-in delay-1">Your feedback shapes the future of NyumbaDirect</p>
          {user ? (
            <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-6 animate-scale-in">
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full border border-slate-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 dark:text-white dark:placeholder-slate-500"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={async () => {
                    setFeedbackSending(true)
                    try {
                      await api.feedback.send(feedbackMessage)
                      setFeedbackMessage('')
                      setFeedbackSent(true)
                      setTimeout(() => setFeedbackSent(false), 2000)
                    } catch (err: unknown) {
                      alert(err instanceof Error ? err.message : 'Failed to send feedback')
                    } finally {
                      setFeedbackSending(false)
                    }
                  }}
                  disabled={!feedbackMessage || feedbackSending}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-xl text-sm disabled:opacity-50 transition-colors"
                >
                  {feedbackSending ? 'Sending...' : 'Send Feedback'}
                </button>
                {feedbackSent && (
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium shrink-0 animate-fade-in">Sent!</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-8 animate-scale-in">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Sign in to share your thoughts</p>
              <Link
                to="/login"
                className="inline-block bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

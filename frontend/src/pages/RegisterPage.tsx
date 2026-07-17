import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.startsWith('+254')) {
      setError('Phone must be in format +254XXXXXXXXX')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    try {
      await register(phone, password, role, role === 'landlord' ? '' : name, role === 'landlord' ? name : '')
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">Create Account</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Start your journey home today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-6 space-y-4 shadow-sm">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              I am a...
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('tenant')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  role === 'tenant'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-green-700'
                }`}
              >
                Tenant
              </button>
              <button
                type="button"
                onClick={() => setRole('landlord')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  role === 'landlord'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-green-700'
                }`}
              >
                Landlord
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              {role === 'landlord' ? 'Business / Brand Name' : 'Your Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'landlord' ? 'My Property Co.' : 'John Doe'}
              className="w-full border border-slate-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2547XXXXXXXX"
              className="w-full border border-slate-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
              placeholder="At least 6 characters"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-700 dark:text-green-400 hover:text-green-800 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

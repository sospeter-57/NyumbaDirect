import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      className={`${active ? 'text-green-400' : 'text-white'} hover:text-green-300 transition-colors`}
    >
      {children}
    </Link>
  )
}

export default function Layout() {
  const { user, logout, isLandlord, isTenant } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white/60 backdrop-blur-sm">
      <header className="bg-black/95 text-white sticky top-0 z-50">
        <div className="px-12 h-18 flex items-center justify-center gap-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <img src="/favicon.png" alt="" className="w-7 h-7 rounded-lg" />
              Nyumba<span className="text-green-400">Direct</span>
            </Link>
            <span className="text-slate-500 text-sm hidden sm:inline ml-3 border-l border-slate-700 pl-3">
              It's U Snow
            </span>
          </div>
          <nav className="flex items-center gap-6 text-base ml-12">
            {user ? (
              <>
                {isLandlord && (
                  <NavLink to="/dashboard">Dashboard</NavLink>
                )}
                <NavLink to="/explore">Explore</NavLink>
                {isLandlord && (
                  <NavLink to="/listings/new">Post Listing</NavLink>
                )}
                {isTenant && (
                  <NavLink to="/profile">Profile</NavLink>
                )}
                {isLandlord && (
                  <NavLink to="/landlord/profile">Profile</NavLink>
                )}
                <span className="text-slate-400 text-sm">{user.name || user.business_name || user.phone}</span>
                <button
                  onClick={handleLogout}
                  className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/explore">Explore</NavLink>
                <NavLink to="/login">Login</NavLink>
                <Link
                  to="/register"
                  className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-black/95 text-white mt-auto">
        <div className="px-12 py-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-2">
                Nyumba<span className="text-green-400">Direct</span>
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connecting you with a home feeling. Find your perfect rental property in Kenya.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                <Link to="/explore" className="hover:text-green-300 transition-colors">Explore Properties</Link>
                {user ? (
                  <>
                    {isLandlord && <Link to="/dashboard" className="hover:text-green-300 transition-colors">Dashboard</Link>}
                    {isLandlord && <Link to="/landlord/profile" className="hover:text-green-300 transition-colors">My Profile</Link>}
                    {isTenant && <Link to="/profile" className="hover:text-green-300 transition-colors">My Profile</Link>}
                  </>
                ) : (
                  <>
                    <Link to="/login" className="hover:text-green-300 transition-colors">Sign In</Link>
                    <Link to="/register" className="hover:text-green-300 transition-colors">Create Account</Link>
                  </>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                <Link to="/faq" className="hover:text-green-300 transition-colors">FAQs</Link>
                <Link to="/privacy" className="hover:text-green-300 transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-green-300 transition-colors">Terms of Service</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Connect</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                <a href="mailto:sospeterkinyanjui57@gmail.com" className="hover:text-green-300 transition-colors">sospeterkinyanjui57@gmail.com</a>
                <a href="https://www.github.com/sospeter-57" target="_blank" rel="noopener noreferrer" className="hover:text-green-300 transition-colors">GitHub</a>
                <a href="https://www.linkedin.com/in/sospeter" target="_blank" rel="noopener noreferrer" className="hover:text-green-300 transition-colors">LinkedIn</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} NyumbaDirect. All rights reserved.</span>
            <span>Built by Sospeter Kinyanjui</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

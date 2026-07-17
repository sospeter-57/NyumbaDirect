import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../context/DarkModeContext'

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
  const { dark, toggle } = useDarkMode()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col wavy-bg">
      <header className="bg-black/95 text-white sticky top-0 z-50">
        <div className="px-12 h-18 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight shrink-0">
            <img src="/favicon.png" alt="" className="w-7 h-7 rounded-lg" />
            Nyumba<span className="text-green-400">Direct</span>
          </Link>
          <nav className="flex items-center gap-6 text-base flex-1 justify-center">
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
          <button
            onClick={toggle}
            className="shrink-0 text-xs text-slate-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-xl transition-colors font-medium flex items-center gap-1.5"
          >
            {dark ? (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg> it's daytime</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg> it's nighttime</>
            )}
          </button>
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

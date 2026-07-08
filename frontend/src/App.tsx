import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ExplorePage from './pages/ExplorePage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import NewListingPage from './pages/NewListingPage'
import DashboardPage from './pages/DashboardPage'
import TenantProfilePage from './pages/TenantProfilePage'
import LandlordProfilePage from './pages/LandlordProfilePage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import FAQPage from './pages/FAQPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children, role }: { children: ReactNode; role?: string }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/explore" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route
          path="/listings/new"
          element={
            <ProtectedRoute role="landlord">
              <NewListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="landlord">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute role="tenant">
              <TenantProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/landlord/profile"
          element={
            <ProtectedRoute role="landlord">
              <LandlordProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

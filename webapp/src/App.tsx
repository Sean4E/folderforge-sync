import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, ProtectedRoute } from './lib/auth'
import { AuthPage } from './lib/AuthUI'
import FolderForgeSync from './components/FolderForgeSync'

// Main authenticated app content
function Dashboard() {
  return <FolderForgeSync />
}

// Auth callback handler for OAuth
function AuthCallback() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400">Completing sign in...</span>
      </div>
    </div>
  )
}

// Share page handler
function SharePage() {
  const { user } = useAuth()

  // If not logged in, show auth page
  if (!user) {
    return <AuthPage />
  }

  // TODO: Handle share code acceptance
  return <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute fallback={<AuthPage />}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<AuthPage />} />
      <Route path="/share/:code" element={<SharePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  // Use base path from Vite config for GitHub Pages deployment
  const basename = import.meta.env.BASE_URL || '/';

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

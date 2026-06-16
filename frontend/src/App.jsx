import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  return user ? children : <Navigate to="/login" />
}

function Home() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">DevOps Control Panel</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.name} · {user?.role}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Sign out</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Task Log', 'Deployments', 'Calendar', 'Dashboard'].map(module => (
          <div key={module} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-2">{module}</h2>
            <p className="text-gray-400 text-sm">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

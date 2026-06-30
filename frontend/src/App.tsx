import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import HomePage from './pages/HomePage'
import DocumentPage from './pages/DocumentPage'
import AuthPage from './pages/AuthPage'
import { clearAuthToken, getAuthToken, getCurrentUser, type User } from '@/services/auth-service'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false)
      return
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        clearAuthToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = () => {
    clearAuthToken()
    setUser(null)
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Restoring your workspace...</div>
  }

  if (!user) {
    return (
      <>
        <AuthPage onAuthenticated={setUser} />
        <Toaster richColors position="top-right" />
      </>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage user={user} onLogout={logout} />} />
        <Route path="/document/:id" element={<DocumentPage user={user} onLogout={logout} />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App

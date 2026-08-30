import { Routes, Route, Navigate } from 'react-router-dom'
import TodoApp from './components/TodoApp'
import ErrorBoundary from './components/ErrorBoundary'
import Landing from './pages/Landing'
import { AuthProvider, ProtectedRoute } from './lib/auth'

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <TodoApp />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  )
}

export default App

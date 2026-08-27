import TodoApp from './components/TodoApp'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <TodoApp />
    </ErrorBoundary>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/client/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/client/*" element={<Dashboard />} />
    </Routes>
  )
}

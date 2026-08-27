import { Navigate, Route, Routes } from 'react-router-dom'
import RotaProtegida from './components/RotaProtegida'
import Boletos from './pages/Boletos'
import Consumo from './pages/Consumo'
import Contratos from './pages/Contratos'
import DetalheChamado from './pages/DetalheChamado'
import Home from './pages/Home'
import Login from './pages/Login'
import Suporte from './pages/Suporte'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RotaProtegida>
            <Home />
          </RotaProtegida>
        }
      />
      <Route
        path="/boletos"
        element={
          <RotaProtegida>
            <Boletos />
          </RotaProtegida>
        }
      />
      <Route
        path="/contratos"
        element={
          <RotaProtegida>
            <Contratos />
          </RotaProtegida>
        }
      />
      <Route
        path="/consumo"
        element={
          <RotaProtegida>
            <Consumo />
          </RotaProtegida>
        }
      />
      <Route
        path="/suporte"
        element={
          <RotaProtegida>
            <Suporte />
          </RotaProtegida>
        }
      />
      <Route
        path="/suporte/:ticketPk"
        element={
          <RotaProtegida>
            <DetalheChamado />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

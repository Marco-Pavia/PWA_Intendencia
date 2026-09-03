import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import { AuthProvider, ROLES, useAuth } from './context/AuthContext'
import CalendarizarActividades from './pages/CalendarizarActividades'
import CambioTerminal from './pages/CambioTerminal'
import CheckIn from './pages/CheckIn'
import Estancia from './pages/Estancia'
import EstatusJornada from './pages/EstatusJornada'
import HistoricoRecorrido from './pages/HistoricoRecorrido'
import Login from './pages/Login'
import ResumenHorasCalendario from './pages/ResumenHorasCalendario'
import ResumenQuincenal from './pages/ResumenQuincenal'
import VisualizacionActividades from './pages/VisualizacionActividades'
import './App.css'

function AppContent() {
  const { user, role, loading } = useAuth()
  
  // Estado de navegación entre pantallas (1 a 9)
  const [activeScreen, setActiveScreen] = useState(1)
  const [currentTerminal, setCurrentTerminal] = useState('Terminal Pipila')
  const [entryTimeStr, setEntryTimeStr] = useState('09:15 AM')

  // Establecer pantalla inicial según el rol al cargar usuario
  useEffect(() => {
    if (role === ROLES.JEFE) {
      setActiveScreen(4) // Vista Principal del Jefe
    } else {
      // Si la supervisora tiene una estancia activa guardada, ir a Pantalla 2
      const activeStay = localStorage.getItem('intendencia_active_stay')
      if (activeStay) {
        const parsed = JSON.parse(activeStay)
        setCurrentTerminal(parsed.terminal)
        setEntryTimeStr(parsed.time)
        setActiveScreen(2)
      } else {
        setActiveScreen(1) // Vista Principal de la Supervisora
      }
    }
  }, [role])

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner-large"></div>
        <p>Cargando Sistema de Intendencia...</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  // 1. Al completar Entrada (Check-In) en Pantalla 1 -> Pasa a Pantalla 2 (Estancia)
  const handleCheckInComplete = (selectedTerminalName) => {
    const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    setCurrentTerminal(selectedTerminalName)
    setEntryTimeStr(timeNow)
    localStorage.setItem('intendencia_active_stay', JSON.stringify({ terminal: selectedTerminalName, time: timeNow }))
    setActiveScreen(2)
  }

  // 2. Al cambiar de terminal en Pantalla 3 -> Regresa a Pantalla 2 con la nueva terminal
  const handleCambiarTerminal = (newTerminalName) => {
    const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    setCurrentTerminal(newTerminalName)
    setEntryTimeStr(timeNow)
    localStorage.setItem('intendencia_active_stay', JSON.stringify({ terminal: newTerminalName, time: timeNow }))
    setActiveScreen(2)
  }

  // 3. Al finalizar jornada (Salida Total) en Pantalla 3 -> Regresa a Pantalla 1
  const handleFinalizarJornada = () => {
    localStorage.removeItem('intendencia_active_stay')
    setActiveScreen(1)
  }

  return (
    <div className="app-layout">
      {/* Top Header & Drawer Navigation */}
      <Navbar currentScreen={activeScreen} onSelectScreen={setActiveScreen} />

      {/* Main Container */}
      <main className="main-content-container">
        {/* Renderizado de Pantallas 1 a 9 */}
        {activeScreen === 1 && (
          <CheckIn onCheckInSuccess={handleCheckInComplete} />
        )}

        {activeScreen === 2 && (
          <Estancia
            currentTerminal={currentTerminal}
            entryTimeStr={entryTimeStr}
            onSalidaTerminal={() => setActiveScreen(3)}
          />
        )}

        {activeScreen === 3 && (
          <CambioTerminal
            onCambiarTerminal={handleCambiarTerminal}
            onFinalizarJornada={handleFinalizarJornada}
          />
        )}

        {activeScreen === 4 && <EstatusJornada />}

        {activeScreen === 5 && <HistoricoRecorrido />}

        {activeScreen === 6 && <ResumenQuincenal />}

        {activeScreen === 7 && <ResumenHorasCalendario />}

        {activeScreen === 8 && <CalendarizarActividades />}

        {activeScreen === 9 && <VisualizacionActividades />}
      </main>

      {/* Footer info */}
      <footer className="app-footer">
        <p>Sistema de Intendencia PWA • Supabase Backend & Storage (.WebP Optimizer)</p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

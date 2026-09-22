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
import { supabase } from './lib/supabaseClient'
import './App.css'

// Helper para resolver el terminal_id obligatorio por nombre
export const getTerminalIdByName = async (terminalName) => {
  if (!terminalName) return null
  try {
    const { data } = await supabase
      .from('terminales')
      .select('id')
      .eq('name', terminalName)
      .limit(1)

    if (data && data.length > 0) {
      return data[0].id
    }

    // Fallback: Si no existe la terminal en la BD, se inserta dinámicamente
    const { data: newTerm } = await supabase
      .from('terminales')
      .insert([{ name: terminalName, code: `TERM-${Date.now()}` }])
      .select()

    if (newTerm && newTerm.length > 0) {
      return newTerm[0].id
    }
  } catch (err) {
    console.warn('Error al resolver terminal_id:', err)
  }
  return null
}

function AppContent() {
  const { user, role, loading } = useAuth()
  
  // Estado de navegación entre pantallas (1 a 9)
  const [activeScreen, setActiveScreen] = useState(1)
  const [currentTerminal, setCurrentTerminal] = useState('Terminal Pipila')
  const [entryTimeStr, setEntryTimeStr] = useState('09:15:00 AM')

  // Establecer pantalla inicial según el rol y verificar estado en Supabase DB
  useEffect(() => {
    if (role === ROLES.JEFE) {
      setActiveScreen(4) // Vista Principal del Jefe
    } else {
      const checkActiveJornadaDB = async () => {
        try {
          const today = new Date().toISOString().slice(0, 10)
          const { data: activeJornada } = await supabase
            .from('jornadas')
            .select('id, status')
            .eq('date', today)
            .eq('status', 'EN_PROGRESO')
            .limit(1)

          if (activeJornada && activeJornada.length > 0) {
            // 1. Verificar si hay estancia ACTIVA
            const { data: activeEstancia } = await supabase
              .from('estancias')
              .select('terminal_name, entry_time')
              .eq('jornada_id', activeJornada[0].id)
              .eq('status', 'ACTIVA')
              .order('created_at', { ascending: false })
              .limit(1)

            if (activeEstancia && activeEstancia.length > 0) {
              setCurrentTerminal(activeEstancia[0].terminal_name)
              const timeFormatted = new Date(activeEstancia[0].entry_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              setEntryTimeStr(timeFormatted)
              setActiveScreen(2)
              return
            }

            // 2. Si hay jornada activa pero la estancia previa fue finalizada (en traslao/cambio de terminal)
            const { data: latestEstancia } = await supabase
              .from('estancias')
              .select('terminal_name')
              .eq('jornada_id', activeJornada[0].id)
              .order('created_at', { ascending: false })
              .limit(1)

            if (latestEstancia && latestEstancia.length > 0) {
              setCurrentTerminal(latestEstancia[0].terminal_name)
              setActiveScreen(3) // Redirigir a Cambio de Terminal
              return
            }
          }
          setActiveScreen(1)
        } catch (e) {
          console.warn('Error al verificar jornada en DB:', e)
          setActiveScreen(1)
        }
      }
      checkActiveJornadaDB()
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
    const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setCurrentTerminal(selectedTerminalName)
    setEntryTimeStr(timeNow)
    setActiveScreen(2)
  }

  // 1.5 Al registrar salida de terminal en Pantalla 2 -> Cierra la estancia activa en DB e ir a Cambio de Terminal
  const handleSalidaTerminal = async () => {
    try {
      await supabase
        .from('estancias')
        .update({
          exit_time: new Date().toISOString(),
          status: 'FINALIZADA',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'ACTIVA')
    } catch (err) {
      console.warn('Error al registrar salida de estancia en DB:', err)
    }
    setActiveScreen(3)
  }

  // 2. Al cambiar de terminal en Pantalla 3 -> Cierra estancia previa, guarda Check-In y crea nueva estancia activa en DB
  const handleCambiarTerminal = async (newTerminalName) => {
    const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const today = new Date().toISOString().slice(0, 10)

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user?.id || '')
    const validUserId = isUuid ? user.id : null

    try {
      // 1. Finalizar estancia previa en DB por seguridad si no fue marcada
      const { error: exitEstErr } = await supabase
        .from('estancias')
        .update({
          exit_time: new Date().toISOString(),
          status: 'FINALIZADA',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'ACTIVA')

      if (exitEstErr) {
        console.warn('Error al cerrar estancia previa:', exitEstErr)
      }

      // 2. Registrar nuevo Check-In de Cambio de Terminal
      const record = {
        user_id: validUserId,
        user_name: user?.user_metadata?.full_name || 'Supervisora Intendencia',
        role: 'supervisora',
        terminal_name: newTerminalName,
        check_in_time: new Date().toISOString(),
        latitude: 0,
        longitude: 0,
        photo_url: null
      }

      const { error: ciErr } = await supabase
        .from('check_ins')
        .insert([record])

      if (ciErr) {
        console.warn('Error al insertar check_in de cambio de terminal:', ciErr)
      }

      // 3. Obtener o crear ID de Jornada activa para el día
      let jornadaId = null
      const { data: activeJornada } = await supabase
        .from('jornadas')
        .select('id')
        .eq('date', today)
        .eq('status', 'EN_PROGRESO')
        .limit(1)

      if (activeJornada && activeJornada.length > 0) {
        jornadaId = activeJornada[0].id
      } else {
        const { data: newJornada } = await supabase
          .from('jornadas')
          .insert([{
            supervisor_id: validUserId,
            date: today,
            start_time: new Date().toISOString(),
            status: 'EN_PROGRESO'
          }])
          .select()
        if (newJornada && newJornada.length > 0) {
          jornadaId = newJornada[0].id
        }
      }

      // 4. Obtener terminal_id obligatorio y crear nueva estancia activa en DB
      const termId = await getTerminalIdByName(newTerminalName)

      const { error: newEstErr } = await supabase
        .from('estancias')
        .insert([{
          jornada_id: jornadaId,
          terminal_id: termId,
          terminal_name: newTerminalName,
          entry_time: new Date().toISOString(),
          status: 'ACTIVA'
        }])

      if (newEstErr) {
        console.error('Error al insertar nueva estancia activa en Supabase:', newEstErr)
      }
    } catch (err) {
      console.warn('Error al registrar cambio de terminal en DB:', err)
    }

    setCurrentTerminal(newTerminalName)
    setEntryTimeStr(timeNow)
    setActiveScreen(2)
  }

  // 3. Al finalizar jornada (Salida Total) -> Cierra la estancia y la jornada en Supabase DB
  const handleFinalizarJornada = async () => {
    const today = new Date().toISOString().slice(0, 10)

    try {
      // 1. Cerrar estancia activa
      await supabase
        .from('estancias')
        .update({
          exit_time: new Date().toISOString(),
          status: 'FINALIZADA',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'ACTIVA')

      // 2. Cerrar jornada laboral en DB
      await supabase
        .from('jornadas')
        .update({
          end_time: new Date().toISOString(),
          status: 'FINALIZADA',
          updated_at: new Date().toISOString()
        })
        .eq('date', today)
        .eq('status', 'EN_PROGRESO')
    } catch (err) {
      console.warn('Error al cerrar jornada en DB:', err)
    }

    // Limpiar cualquier residuo de localStorage para evitar conflictos de cache
    try { localStorage.clear() } catch { /* ignorar */ }

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
            onSalidaTerminal={handleSalidaTerminal}
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

import { useEffect, useState } from 'react'
import { ROLES, useAuth } from '../context/AuthContext'

export default function Navbar({ currentScreen, onSelectScreen }) {
  const { role, logout, switchRole } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBtn(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBtn(false)
    }
    setDeferredPrompt(null)
  }

  const handleNavigate = (screenId) => {
    onSelectScreen(screenId)
    setMenuOpen(false)
  }

  const isSupervisora = role === ROLES.SUPERVISORA

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        {/* Hamburger Menu Trigger Button */}
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir Menú de Navegación"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand */}
        <div className="brand-group" onClick={() => handleNavigate(isSupervisora ? 1 : 4)}>
          <div className="brand-text">
            <span className="brand-title">INTENDENCIA</span>
            <span className="brand-badge">PWA</span>
          </div>
        </div>

        {/* Navbar Actions */}
        <div className="navbar-actions">
          {showInstallBtn && (
            <button type="button" className="btn-install-pwa" onClick={handleInstallClick}>
              📲 Instalar App
            </button>
          )}

          {/* Selector para cambiar de rol en desarrollo */}
          <div className="role-switcher-pill">
            <span className="role-dot"></span>
            <select
              value={role}
              onChange={(e) => {
                const newRole = e.target.value
                switchRole(newRole)
                onSelectScreen(newRole === ROLES.SUPERVISORA ? 1 : 4)
              }}
              className="role-select-inline"
            >
              <option value={ROLES.SUPERVISORA}>Supervisora</option>
              <option value={ROLES.JEFE}>Jefe Inmediato</option>
            </select>
          </div>

          <button type="button" className="btn-logout" onClick={logout} title="Cerrar Sesión">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slide-out Drawer Navigation Overlay */}
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}
      
      <div className={`navigation-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-role-tag">
            {isSupervisora ? '👩‍💼 Módulo Jefa de Intendencia' : '👨‍💼 Módulo Jefe Inmediato'}
          </div>
          <button type="button" className="drawer-close-btn" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>

        <div className="drawer-menu-list">
          {isSupervisora ? (
            <>
              <div className="menu-group-label">Flujo Operativo de Turno</div>
              <button
                type="button"
                className={`drawer-item ${currentScreen === 1 ? 'active' : ''}`}
                onClick={() => handleNavigate(1)}
              >
                <span className="screen-badge">P1</span>
                📍 Entrada (Check-In)
              </button>

              <button
                type="button"
                className={`drawer-item ${currentScreen === 2 ? 'active' : ''}`}
                onClick={() => handleNavigate(2)}
              >
                <span className="screen-badge">P2</span>
                🏢 Estancia (Fotos y Notas)
              </button>

              <button
                type="button"
                className={`drawer-item ${currentScreen === 3 ? 'active' : ''}`}
                onClick={() => handleNavigate(3)}
              >
                <span className="screen-badge">P3</span>
                🔄 Cambio de Terminal / Fin de Día
              </button>

              <div className="menu-group-label">Planificación</div>
              <button
                type="button"
                className={`drawer-item ${currentScreen === 8 ? 'active' : ''}`}
                onClick={() => handleNavigate(8)}
              >
                <span className="screen-badge">P8</span>
                📅 Calendarizar Actividades
              </button>
            </>
          ) : (
            <>
              <div className="menu-group-label">Supervisión y Monitoreo</div>
              <button
                type="button"
                className={`drawer-item ${currentScreen === 4 ? 'active' : ''}`}
                onClick={() => handleNavigate(4)}
              >
                <span className="screen-badge">P4</span>
                📊 Estatus de Jornada (Tiempo Real)
              </button>

              <button
                type="button"
                className={`drawer-item ${currentScreen === 5 ? 'active' : ''}`}
                onClick={() => handleNavigate(5)}
              >
                <span className="screen-badge">P5</span>
                📜 Histórico de Recorrido
              </button>

              <div className="menu-group-label">Reportes y Cumplimiento</div>
              <button
                type="button"
                className={`drawer-item ${currentScreen === 6 ? 'active' : ''}`}
                onClick={() => handleNavigate(6)}
              >
                <span className="screen-badge">P6</span>
                📈 Resumen Quincenal (Reportes PDF/Excel)
              </button>

              <button
                type="button"
                className={`drawer-item ${currentScreen === 7 ? 'active' : ''}`}
                onClick={() => handleNavigate(7)}
              >
                <span className="screen-badge">P7</span>
                🗓️ Resumen de Horas (Calendario)
              </button>

              <button
                type="button"
                className={`drawer-item ${currentScreen === 9 ? 'active' : ''}`}
                onClick={() => handleNavigate(9)}
              >
                <span className="screen-badge">P9</span>
                📋 Visualización de Actividades Cargadas
              </button>
            </>
          )}
        </div>

        <div className="drawer-footer">
          <p>Sistema de Intendencia PWA</p>
        </div>
      </div>
    </header>
  )
}

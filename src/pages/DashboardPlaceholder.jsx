import { ROLES, useAuth } from '../context/AuthContext'

export default function DashboardPlaceholder({ currentScreen, onSelectScreen }) {
  const { role, roleLabel } = useAuth()

  const supervisoraScreens = [
    { id: 1, name: 'Entrada (Check-In)', desc: 'Registro de inicio de turno con terminal, GPS y foto obligatoria WebP.' },
    { id: 2, name: 'Estancia (Fotos y Notas)', desc: 'Bitácora y capturas de supervisión durante el recorrido.' },
    { id: 3, name: 'Cambio de Terminal / Fin de Día', desc: 'Cierre de jornada o traslado entre terminales.' },
    { id: 8, name: 'Calendarizar Actividades', desc: 'Programación de actividades de intendencia para el personal.' }
  ]

  const jefeScreens = [
    { id: 4, name: 'Estatus de Jornada', desc: 'Monitoreo en tiempo real del turno y personal activo.' },
    { id: 5, name: 'Histórico de Recorrido', desc: 'Revisión de bitácoras, evidencias fotográficas y geolocalización.' },
    { id: 6, name: 'Resumen Quincenal', desc: 'Consolidado quincenal de asistencias y cobertura.' },
    { id: 7, name: 'Resumen de Horas (Calendario)', desc: 'Vista de calendario acumulativo de horas supervisadas.' },
    { id: 9, name: 'Visualización de Actividades Cargadas', desc: 'Seguimiento de tareas programadas y avance.' }
  ]

  const activeScreens = role === ROLES.SUPERVISORA ? supervisoraScreens : jefeScreens

  return (
    <div className="dashboard-placeholder-container">
      <div className="role-header-banner">
        <h2>Vista / Módulo: {roleLabel}</h2>
        <p>Panel Principal de Navegación del Sistema</p>
      </div>

      <div className="screen-list-grid">
        {activeScreens.map((s) => (
          <div
            key={s.id}
            className={`screen-card-item ${currentScreen === s.id ? 'active' : ''}`}
            onClick={() => onSelectScreen(s.id)}
          >
            <div className="screen-number-badge">Pantalla #{s.id}</div>
            <h3>{s.name}</h3>
            <p>{s.desc}</p>
            {s.id === 1 ? (
              <button type="button" className="btn-access active-btn">
                Ir a Pantalla 1 (Desarrollada) →
              </button>
            ) : (
              <span className="upcoming-tag">Fase Próxima ({s.name})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_FULL_LABELS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
const MESES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function VisualizacionActividades() {
  const [viewType, setViewType] = useState('semanal') // 'semanal' | 'diaria'
  const [searchQuery, setSearchQuery] = useState('')

  const currentDate = useMemo(() => new Date(), [])

  // Calcular la semana actual de Lunes a Domingo del calendario real
  const currentWeekDays = useMemo(() => {
    const dayOfWeek = currentDate.getDay() // 0: Dom, 1: Lun, ..., 6: Sáb
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(currentDate)
    monday.setDate(currentDate.getDate() + distanceToMonday)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push({
        label: DAY_LABELS[i],
        fullLabel: DAY_FULL_LABELS[i],
        num: d.getDate(),
        monthShort: MESES_SHORT[d.getMonth()],
        fullDateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        isToday: d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth()
      })
    }
    return days
  }, [currentDate])

  const [selectedDay, setSelectedDay] = useState(() => currentWeekDays[0])

  const activities = [
    {
      id: 'act-1',
      terminal: 'Terminal Pipila',
      status: 'Programado',
      description: 'Revisión del estado general de las salas de espera de ambas taquillas. Limpieza profunda.'
    },
    {
      id: 'act-2',
      terminal: 'Terminal Naolinco',
      status: 'Programado',
      description: 'Supervisión de mantenimiento y auditoría de estado general de la terminal.'
    },
    {
      id: 'act-3',
      terminal: 'Terminal Pipila',
      status: 'Programado',
      description: 'Reunión de coordinación semanal y revisión de insumos.'
    }
  ]

  const rangeTitle = `${currentWeekDays[0]?.monthShort} ${currentWeekDays[0]?.num} - ${currentWeekDays[6]?.monthShort} ${currentWeekDays[6]?.num}`

  return (
    <div className="visualizacion-actividades-container">
      <div className="screen-tag-bar">
        PANTALLA 9 · Visualización de Actividades Cargadas (Vista Jefe)
      </div>

      <div className="form-section-card">
        <h2>Supervisión de Actividades</h2>

        {/* Search Bar */}
        <div className="search-bar-input-box margin-v">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Jefe de Intendencia / Supervisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle Tabs */}
        <div className="view-toggle-tabs">
          <button
            type="button"
            className={`view-tab ${viewType === 'semanal' ? 'active' : ''}`}
            onClick={() => setViewType('semanal')}
          >
            Vista Semanal
          </button>
          <button
            type="button"
            className={`view-tab ${viewType === 'diaria' ? 'active' : ''}`}
            onClick={() => setViewType('diaria')}
          >
            Vista Diaria
          </button>
        </div>

        {/* Date Range Navigation */}
        <div className="range-nav-header margin-v">
          <h3>Semana: {rangeTitle}</h3>
        </div>

        {/* Weekly Day Selector (Lunes a Domingo Real) */}
        <div className="weekly-days-row">
          {currentWeekDays.map((d) => (
            <div
              key={d.fullDateStr}
              className={`day-circle-col ${selectedDay.fullDateStr === d.fullDateStr ? 'active-day' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              <span className="l-tag">{d.label}</span>
              <span className="n-tag">{d.num}</span>
              {d.isToday && <span style={{ fontSize: '0.5rem', background: '#10b981', color: 'white', padding: '1px 2px', borderRadius: '2px' }}>HOY</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Programmed Activities List */}
      <div className="form-section-card">
        <h3 className="day-section-title">
          {selectedDay.fullLabel}, {selectedDay.num} {selectedDay.monthShort.toUpperCase()}
        </h3>

        <div className="activities-cards-list">
          {activities.map((act) => (
            <div key={act.id} className="activity-card-item">
              <div className="act-header-line">
                <strong className="term-name">{act.terminal}</strong>
                <span className="status-programado-badge">● {act.status}</span>
              </div>
              <p className="act-desc">{act.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

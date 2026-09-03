import { useState } from 'react'

export default function VisualizacionActividades() {
  const [viewType, setViewType] = useState('semanal') // 'semanal' | 'diaria'
  const [selectedDayNum, setSelectedDayNum] = useState(13)
  const [searchQuery, setSearchQuery] = useState('')

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
          <h3>Oct 12 - Oct 18</h3>
          <div className="arrows">
            <button type="button" className="arrow-btn">&lt;</button>
            <button type="button" className="arrow-btn">&gt;</button>
          </div>
        </div>

        {/* Weekly Day Selector */}
        <div className="weekly-days-row">
          {[
            { label: 'L', num: 12 },
            { label: 'M', num: 13 },
            { label: 'M', num: 14 },
            { label: 'J', num: 15 },
            { label: 'V', num: 16 },
            { label: 'S', num: 17 },
            { label: 'D', num: 18 }
          ].map((d) => (
            <div
              key={d.num}
              className={`day-circle-col ${selectedDayNum === d.num ? 'active-day' : ''}`}
              onClick={() => setSelectedDayNum(d.num)}
            >
              <span className="l-tag">{d.label}</span>
              <span className="n-tag">{d.num}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Programmed Activities List */}
      <div className="form-section-card">
        <h3 className="day-section-title">
          {selectedDayNum === 13 ? 'MARTES, 13 OCTUBRE' : `DÍA ${selectedDayNum} OCTUBRE`}
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

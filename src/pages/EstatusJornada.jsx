import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function EstatusJornada() {
  const [selectedDate, setSelectedDate] = useState('2026-08-14')
  const [selectedSupervisor, setSelectedSupervisor] = useState('Supervisora Intendencia')
  const [jornadaData, setJornadaData] = useState({
    horasTrabajadas: '02:45',
    estatusText: 'EN ESTANCIA (Terminal Haciendita)',
    isActive: true,
    timeline: [
      {
        id: 'tl-1',
        time: '10:45 AM',
        terminal: 'Terminal Haciendita',
        type: 'LIMPIEZA',
        statusTag: 'EN PROGRESO',
        photo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80'
      },
      {
        id: 'tl-2',
        time: '08:00 AM',
        terminal: 'Terminal Pipila',
        type: 'CHECK_IN',
        statusTag: 'ENTRADA',
        photo: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80'
      }
    ]
  })

  // Cargar datos en tiempo real de Supabase o local
  useEffect(() => {
    const fetchRealtimeJornada = async () => {
      try {
        const { data } = await supabase
          .from('v_resumen_diario_jornadas')
          .select('*')
          .limit(1)

        if (data && data.length > 0) {
          const row = data[0]
          const hours = Math.floor(row.total_minutes / 60)
          const mins = row.total_minutes % 60
          setJornadaData(prev => ({
            ...prev,
            horasTrabajadas: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
          }))
        }
      } catch (err) {
        console.warn('Consulta en tiempo real:', err)
      }
    }

    fetchRealtimeJornada()
  }, [selectedDate])

  return (
    <div className="estatus-jornada-container">
      <div className="screen-tag-bar">
        PANTALLA 4 · Estatus de Jornada (Vista Principal Jefe)
      </div>

      {/* Header Dashboard Card */}
      <div className="dashboard-header-card">
        <h2>Vista de Jefe Inmediato</h2>
        <p className="subtitle">Control y Monitoreo de Intendencia en Tiempo Real</p>

        <div className="filters-row margin-v">
          <div className="filter-group">
            <label>FECHA</label>
            <input
              type="date"
              className="date-picker-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>SUPERVISOR</label>
            <select
              className="supervisor-select"
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
            >
              <option value="Supervisora Intendencia">Supervisora Intendencia</option>
              <option value="Maria Lopez">Maria López</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Clock Display */}
      <div className="kpi-clock-card">
        <div className="kpi-title-row">
          <span>HORAS TRABAJADAS HOY (ESTANCIA)</span>
          <span className="clock-icon">🕒</span>
        </div>
        <div className="clock-time-display">
          {jornadaData.horasTrabajadas} <span className="unit">HRS</span>
        </div>
      </div>

      {/* Status Card */}
      <div className="status-traffic-card">
        <div className="status-top">
          <span className="label">ESTATUS DE JORNADA</span>
          <span className={`live-badge ${jornadaData.isActive ? 'active' : ''}`}>
            ● {jornadaData.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <h3 className="status-current-text">{jornadaData.estatusText}</h3>
      </div>

      {/* Timeline Section */}
      <div className="timeline-section-card">
        <h3>🕒 Registro de Actividades</h3>

        <div className="vertical-timeline">
          {jornadaData.timeline.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-node" />
              <div className="timeline-content">
                <div className="timeline-header-row">
                  <h4>{item.terminal}</h4>
                  <span className="time-stamp">{item.time}</span>
                </div>
                
                <div className="tags-row">
                  <span className="type-pill">{item.type}</span>
                  <span className="status-tag">{item.statusTag}</span>
                </div>

                {item.photo && (
                  <div className="timeline-photo-box">
                    <img src={item.photo} alt={item.terminal} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

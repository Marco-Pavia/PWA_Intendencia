import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function EstatusJornada() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [supervisors, setSupervisors] = useState(['Supervisora Intendencia'])
  const [selectedSupervisor, setSelectedSupervisor] = useState('Supervisora Intendencia')
  
  const [horasTrabajadas, setHorasTrabajadas] = useState('00:00')
  const [currentTerminalActive, setCurrentTerminalActive] = useState('Ninguna (Sin inicio de turno)')
  const [isJornadaActive, setIsJornadaActive] = useState(false)
  const [timelineItems, setTimelineItems] = useState([])
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  // Cargar lista de supervisores desde Supabase DB
  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('role', 'supervisora')
        
        if (data && data.length > 0) {
          const names = data.map(p => p.full_name)
          setSupervisors(names)
          setSelectedSupervisor(names[0])
        }
      } catch (err) {
        console.warn('Carga de supervisores fallback:', err)
      }
    }
    fetchSupervisors()
  }, [])

  // Consulta en tiempo real de datos reales de Supabase DB + Local Storage
  const loadRealtimeJornadaData = useCallback(async () => {
    setLoadingData(true)
    try {
      // 1. Obtener check-ins del día seleccionado desde Supabase
      const { data: dbCheckIns } = await supabase
        .from('check_ins')
        .select('*')
        .order('check_in_time', { ascending: true })

      // 2. Cargar respaldo de LocalStorage
      const localCheckIns = JSON.parse(localStorage.getItem('intendencia_check_ins') || '[]')

      // 3. Verificar si hay estancia activa DEL DÍA DE HOY
      const today = new Date().toISOString().slice(0, 10)
      const activeStayRaw = localStorage.getItem('intendencia_active_stay')
      let activeStay = null
      if (activeStayRaw) {
        try {
          const parsed = JSON.parse(activeStayRaw)
          // Solo cuenta como activa si es del día de hoy
          if (parsed.date === today) activeStay = parsed
        } catch { /* ignorar */ }
      }

      // Registro de cierre explicito de jornada
      const cierreRaw = localStorage.getItem(`intendencia_cierre_${selectedDate}`)
      let cierreRecord = null
      if (cierreRaw) {
        try { cierreRecord = JSON.parse(cierreRaw) } catch { /* ignorar */ }
      }
      if (!cierreRecord) {
        const cierresList = JSON.parse(localStorage.getItem('intendencia_cierres_jornada') || '[]')
        cierreRecord = cierresList.find(c => c.date === selectedDate) || null
      }

      // 4. Filtrar por fecha seleccionada y DEDUPLICAR por id (evita duplicados DB + localStorage)
      const seenIds = new Set()
      const combinedCheckIns = [...(dbCheckIns || []), ...localCheckIns]
        .filter(item => {
          const itemDate = item.check_in_time
            ? item.check_in_time.substring(0, 10)
            : item.created_at?.substring(0, 10)
          return itemDate === selectedDate
        })
        .filter(item => {
          const key = item.id || item.check_in_time
          if (seenIds.has(key)) return false
          seenIds.add(key)
          return true
        })
        .sort((a, b) => {
          const ta = new Date(a.check_in_time || a.created_at).getTime()
          const tb = new Date(b.check_in_time || b.created_at).getTime()
          return ta - tb
        })

      // 5. Calcular tiempo real acumulado
      let totalMinutesAccumulated = 0
      const now = new Date()
      const generatedTimeline = []

      if (combinedCheckIns.length > 0) {
        combinedCheckIns.forEach((ci, idx) => {
          const ciTime = new Date(ci.check_in_time || ci.created_at || Date.now())
          const timeFormatted = ciTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })

          const isLastCheckIn = idx === combinedCheckIns.length - 1
          let segmentEndTime

          if (!isLastCheckIn) {
            // El segmento termina cuando comienza el siguiente check-in
            segmentEndTime = new Date(combinedCheckIns[idx + 1].check_in_time || combinedCheckIns[idx + 1].created_at)
          } else if (activeStay && selectedDate === today) {
            // Último check-in Y jornada ACTIVA hoy → cuenta hasta el momento actual
            segmentEndTime = now
          } else if (cierreRecord && cierreRecord.timestamp) {
            // Último check-in y jornada FINALIZADA con registro de cierre → fija la hora de salida exacta
            segmentEndTime = new Date(cierreRecord.timestamp)
          } else {
            // Jornada no activa y sin hora de cierre → el tiempo se detiene en el check-in (sin seguir sumando a now)
            segmentEndTime = ciTime
          }

          const segmentMinutes = Math.max(0, Math.round((segmentEndTime - ciTime) / 60000))
          totalMinutesAccumulated += segmentMinutes

          // Evidencias locales (notas y fotos)
          const savedNotes = localStorage.getItem(`estancia_notes_${ci.terminal_name}`)
          const savedEvidencesRaw = localStorage.getItem(`estancia_evidences_${ci.terminal_name}`)
          let localEvidences = []
          if (savedEvidencesRaw) {
            try { localEvidences = JSON.parse(savedEvidencesRaw) } catch { /* ignorar */ }
          }

          // Combinar foto de entrada (check-in) con fotos de evidencia subidas
          const entryPhoto = ci.photo_url ? [{ label: 'Foto Check-In', photo_url: ci.photo_url }] : []
          const allPhotos = [...entryPhoto, ...localEvidences]

          generatedTimeline.unshift({
            id: ci.id || `ci-${idx}`,
            time: timeFormatted,
            terminal: ci.terminal_name,
            type: idx === 0 ? 'CHECK_IN_INICIAL' : 'CAMBIO_TERMINAL',
            statusTag: idx === 0 ? 'Entrada Registrada' : 'En Estancia',
            notes: savedNotes || ci.notes || null,
            photos: allPhotos
          })
        })

        // 6. Estatus: ACTIVO solo si hay estancia activa del día de hoy Y estamos consultando hoy
        const latestCheckIn = combinedCheckIns[combinedCheckIns.length - 1]
        if (activeStay && selectedDate === today) {
          setCurrentTerminalActive(`EN ESTANCIA (${latestCheckIn.terminal_name})`)
          setIsJornadaActive(true)
        } else {
          // Jornada finalizada o consultando día pasado
          setCurrentTerminalActive(`JORNADA FINALIZADA (${latestCheckIn.terminal_name})`)
          setIsJornadaActive(false)
        }

      } else if (activeStay && selectedDate === today) {
        // Sin check-ins en DB pero hay estancia activa local del día de hoy
        const ciTime = new Date(`${today}T${activeStay.time}`)
        const segmentMinutes = Math.max(0, Math.round((now - ciTime) / 60000))
        totalMinutesAccumulated += segmentMinutes

        setCurrentTerminalActive(`EN ESTANCIA (${activeStay.terminal})`)
        setIsJornadaActive(true)

        generatedTimeline.push({
          id: 'active-1',
          time: activeStay.time,
          terminal: activeStay.terminal,
          type: 'ESTANCIA_ACTIVA',
          statusTag: 'En Progreso',
          notes: localStorage.getItem(`estancia_notes_${activeStay.terminal}`) || null,
          photo: null
        })
      } else {
        setCurrentTerminalActive('Sin actividad en la fecha seleccionada')
        setIsJornadaActive(false)
      }

      // 7. Formatear reloj de Horas Trabajadas (HH:MM) — máximo razonable 12h
      const clampedMinutes = Math.min(totalMinutesAccumulated, 720)
      const hours = Math.floor(clampedMinutes / 60)
      const mins = clampedMinutes % 60
      setHorasTrabajadas(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)

      setTimelineItems(generatedTimeline.length > 0 ? generatedTimeline : [
        {
          id: 'demo-1',
          time: '10:45',
          terminal: 'Terminal Haciendita',
          type: 'LIMPIEZA',
          statusTag: 'En Progreso',
          notes: 'Supervisión de piso, reposición de insumos de sanitarios y reporte de mantenimiento.',
          photo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80'
        },
        {
          id: 'demo-2',
          time: '08:00',
          terminal: 'Terminal Pipila',
          type: 'CHECK_IN',
          statusTag: 'Entrada Registrada',
          notes: 'Check-In inicial de turno con ubicación GPS y foto WebP requerida.',
          photo: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80'
        }
      ])

    } catch (err) {
      console.warn('Error al cargar datos en tiempo real de Supabase:', err)
    } finally {
      setLoadingData(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadRealtimeJornadaData()
  }, [loadRealtimeJornadaData])

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
            <label>FECHA A CONSULTAR</label>
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
              {supervisors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
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
          {horasTrabajadas} <span className="unit">HRS</span>
        </div>
      </div>

      {/* Status Traffic Card */}
      <div className="status-traffic-card">
        <div className="status-top">
          <span className="label">ESTATUS DE JORNADA</span>
          <span className={`live-badge ${isJornadaActive ? 'active' : ''}`}>
            ● {isJornadaActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <h3 className="status-current-text">{currentTerminalActive}</h3>
      </div>

      {/* Timeline Section */}
      <div className="timeline-section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>🕒 Registro de Actividades ({timelineItems.length} Eventos)</h3>
          <button
            type="button"
            className="btn-action-small"
            onClick={loadRealtimeJornadaData}
            title="Recargar datos en tiempo real"
          >
            🔄 {loadingData ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        <div className="vertical-timeline">
          {timelineItems.map((item) => (
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

                {/* Notas de la Estancia */}
                {item.notes && (
                  <p className="stay-notes" style={{ fontSize: '0.8rem', color: '#475569', margin: '0.4rem 0', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                    💬 {item.notes}
                  </p>
                )}

                {/* Galería de Fotografías (Check-In y Evidencias Subidas) Ampliables */}
                {item.photos && item.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {item.photos.map((ph, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => setSelectedPhotoModal({ url: ph.photo_url, title: item.terminal, time: item.time, label: ph.label || 'Evidencia' })}
                        style={{ cursor: 'pointer', position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                      >
                        <img src={ph.photo_url} alt={ph.label || 'Evidencia'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '0.55rem', padding: '2px 4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ph.label || 'VER'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Inspección de Fotografía a Pantalla Completa */}
      {selectedPhotoModal && (
        <div className="modal-overlay" onClick={() => setSelectedPhotoModal(null)}>
          <div className="modal-content" style={{ maxWidth: '90vw', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>📷 Evidencia: {selectedPhotoModal.title}</h3>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedPhotoModal(null)}
                style={{ background: '#cbd5e1', color: '#0f172a' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>Hora de registro: {selectedPhotoModal.time}</p>
            
            <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '70vh' }}>
              <img src={selectedPhotoModal.url} alt="Evidencia en HD" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <button
              type="button"
              className="btn-complete-checkin full-width"
              style={{ marginTop: '1rem', padding: '0.75rem' }}
              onClick={() => setSelectedPhotoModal(null)}
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

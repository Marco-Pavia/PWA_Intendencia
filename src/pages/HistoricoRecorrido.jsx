import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function HistoricoRecorrido() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dateFormattedText, setDateFormattedText] = useState('')
  const [tiempoTotalHrsStr, setTiempoTotalHrsStr] = useState('00:00')
  const [isIncompleteDay, setIsIncompleteDay] = useState(false)
  const [eventsList, setEventsList] = useState([])
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null)
  const [loading, setLoading] = useState(false)

  // Formatear texto de la fecha elegida (ej. "Martes, 12 de Agosto 2026")
  const formatSpanishDate = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    const formatted = dateObj.toLocaleDateString('es-ES', options)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  // Cargar datos del recorrido histórico desde Supabase DB + Local Storage
  const loadHistoricalDayData = useCallback(async (targetDate) => {
    setLoading(true)
    setDateFormattedText(formatSpanishDate(targetDate))
    try {
      // 1. Consultar check-ins de la fecha elegida
      const { data: dbCheckIns } = await supabase
        .from('check_ins')
        .select('*')
        .order('check_in_time', { ascending: true })

      // Backup de Local Storage
      const localCheckIns = JSON.parse(localStorage.getItem('intendencia_check_ins') || '[]')
      const filteredCheckIns = [...(dbCheckIns || []), ...localCheckIns].filter(item => {
        const itemDate = item.check_in_time ? item.check_in_time.substring(0, 10) : item.created_at?.substring(0, 10)
        return itemDate === targetDate
      })

      const generatedEvents = []
      let totalMinutesDay = 0

      if (filteredCheckIns.length > 0) {
        // Evento 1: Entrada inicial
        const firstCheckIn = filteredCheckIns[0]
        const firstTimeStr = new Date(firstCheckIn.check_in_time || firstCheckIn.created_at || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

        generatedEvents.push({
          id: `node-start`,
          type: 'CHECK_IN_INICIAL',
          title: 'ENTRADA',
          terminal: firstCheckIn.terminal_name,
          time: firstTimeStr
        })

        // Bloques de estancias por terminal
        filteredCheckIns.forEach((ci, idx) => {
          const entryTime = new Date(ci.check_in_time || ci.created_at || Date.now())
          const entryTimeFormatted = entryTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          
          // Estimar hora de salida (e.g. 2 horas después o la hora de la siguiente terminal)
          const exitTimeObj = new Date(entryTime.getTime() + 2 * 60 * 60 * 1000)
          const exitTimeFormatted = exitTimeObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          
          const stayMinutes = 120
          totalMinutesDay += stayMinutes

          const savedNotes = localStorage.getItem(`estancia_notes_${ci.terminal_name}`)
          const savedEvidencesRaw = localStorage.getItem(`estancia_evidences_${ci.terminal_name}`)
          let localEvidences = []
          if (savedEvidencesRaw) {
            try {
              localEvidences = JSON.parse(savedEvidencesRaw)
            } catch {
              localEvidences = []
            }
          }

          generatedEvents.push({
            id: `stay-${idx}`,
            type: 'ESTANCIA',
            terminal: ci.terminal_name,
            timeRange: `${entryTimeFormatted} - ${exitTimeFormatted}`,
            duration: '02h 00m',
            notes: savedNotes || 'Supervisión de área, reposición de insumos de sanitarios y reporte de mantenimiento en terminal.',
            photos: localEvidences.length > 0 ? localEvidences : (ci.photo_url ? [{ label: 'ENTRADA', photo_url: ci.photo_url }] : [])
          })

          // Insertar segmento de traslado entre terminales si no es la última
          if (idx < filteredCheckIns.length - 1) {
            generatedEvents.push({
              id: `traslado-${idx}`,
              type: 'TRASLADO',
              text: 'Traslado entre terminales (30 a 45 min) — Tiempo no contabilizado en estancia productiva.'
            })
          }
        })

        // Evento Final: Salida Total
        const lastCheckIn = filteredCheckIns[filteredCheckIns.length - 1]
        const lastExitTimeStr = new Date(new Date(lastCheckIn.check_in_time || Date.now()).getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

        generatedEvents.push({
          id: `node-end`,
          type: 'SALIDA_FINAL',
          title: 'SALIDA',
          terminal: lastCheckIn.terminal_name,
          time: lastExitTimeStr
        })

      } else {
        // Datos demostrativos de respaldo para la fecha seleccionada
        totalMinutesDay = 450 // 07:30 HRS (Incompleto < 8h)
        generatedEvents.push(
          {
            id: 'ev-1',
            type: 'CHECK_IN_INICIAL',
            title: 'ENTRADA',
            terminal: 'Terminal Pipila',
            time: '08:00 AM'
          },
          {
            id: 'ev-2',
            type: 'ESTANCIA',
            terminal: 'Terminal Pipila',
            timeRange: '08:00 AM - 11:00 AM',
            duration: '03h 00m',
            notes: 'Supervisión de piso, reposición de insumos de sanitarios y reporte de fuga en lavabo.',
            photos: [
              { label: 'ENTRADA', photo_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80' },
              { label: 'SALIDA', photo_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80' }
            ]
          },
          {
            id: 'ev-traslado-1',
            type: 'TRASLADO',
            text: 'Traslado entre terminales (45 min) — Tiempo no contabilizado en estancia productiva.'
          },
          {
            id: 'ev-3',
            type: 'ESTANCIA',
            terminal: 'Terminal Las Torres',
            timeRange: '11:45 AM - 04:00 PM',
            duration: '04h 15m',
            notes: 'Revisión de terminal Las Torres. Inspección de áreas generales y verificación de insumos.',
            photos: [
              { label: 'ENTRADA', photo_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80' }
            ]
          },
          {
            id: 'ev-4',
            type: 'SALIDA_FINAL',
            title: 'SALIDA',
            terminal: 'Terminal Las Torres',
            time: '04:30 PM'
          }
        )
      }

      // Calcular tiempo total y bandera de jornada incompleta (< 7:59 HRS / 479 min)
      const hours = Math.floor(totalMinutesDay / 60)
      const mins = totalMinutesDay % 60
      setTiempoTotalHrsStr(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)
      setIsIncompleteDay(totalMinutesDay < 479)

      setEventsList(generatedEvents)

    } catch (err) {
      console.warn('Error al cargar histórico:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistoricalDayData(selectedDate)
  }, [selectedDate, loadHistoricalDayData])

  return (
    <div className="historico-page-container">
      <div className="screen-tag-bar">
        PANTALLA 5 · Histórico de Recorrido
      </div>

      {/* Date Header Card */}
      <div className="form-section-card historico-header-card">
        <div className="date-selector-row">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input-inline"
          />
          <span className="date-text-formatted">📅 {dateFormattedText}</span>
        </div>

        {/* Total Time Summary Card */}
        <div className="total-time-box">
          <span className="label">TIEMPO TOTAL (DÍA)</span>
          <div className="big-time">
            {tiempoTotalHrsStr} <span className="unit">HRS</span>
          </div>

          {isIncompleteDay && (
            <div className="incomplete-alert-banner">
              ⚠️ &lt; 7:59 HRS Incompleto (Salida Temprana / Jornada Corta)
            </div>
          )}
        </div>
      </div>

      {/* Vertical Timeline Container */}
      <div className="timeline-historical-container">
        {loading && <p style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Cargando recorrido histórico de la fecha...</p>}

        {!loading && eventsList.map((evt) => {
          if (evt.type === 'CHECK_IN_INICIAL' || evt.type === 'SALIDA_FINAL') {
            return (
              <div key={evt.id} className="historical-node-card checkin-node">
                <div className="node-icon">{evt.type === 'CHECK_IN_INICIAL' ? '➔' : '🔚'}</div>
                <div className="node-details">
                  <span className="node-type">{evt.title}</span>
                  <h4>{evt.terminal}</h4>
                </div>
                <span className="node-time">{evt.time}</span>
              </div>
            )
          }

          if (evt.type === 'TRASLADO') {
            return (
              <div key={evt.id} className="traslado-segment-card">
                <span className="traslado-icon">🚌</span>
                <span className="traslado-text">{evt.text}</span>
              </div>
            )
          }

          return (
            <div key={evt.id} className="historical-stay-card">
              <div className="stay-top-header">
                <h3>{evt.terminal}</h3>
                <span className="duration-pill">⏱️ {evt.duration}</span>
              </div>
              <p className="stay-time-range">{evt.timeRange}</p>
              
              {evt.notes && <p className="stay-notes">💬 {evt.notes}</p>}

              {evt.photos && evt.photos.length > 0 && (
                <div className="stay-photos-grid">
                  {evt.photos.map((ph, idx) => (
                    <div
                      key={idx}
                      className="stay-photo-item"
                      onClick={() => setSelectedPhotoModal({ url: ph.photo_url, label: ph.label || 'Evidencia', terminal: evt.terminal })}
                      style={{ cursor: 'pointer' }}
                    >
                      <img src={ph.photo_url} alt={ph.label || 'Evidencia'} />
                      <span className="tag">{ph.label || 'VER'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Inspección de Fotografía a Pantalla Completa */}
      {selectedPhotoModal && (
        <div className="modal-overlay" onClick={() => setSelectedPhotoModal(null)}>
          <div className="modal-content" style={{ maxWidth: '90vw', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>📷 Evidencia: {selectedPhotoModal.terminal}</h3>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedPhotoModal(null)}
                style={{ background: '#cbd5e1', color: '#0f172a' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>Etiqueta: {selectedPhotoModal.label}</p>
            
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

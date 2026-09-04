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

  const loadHistoricalDayData = useCallback(async (targetDate) => {
    setLoading(true)
    setDateFormattedText(formatSpanishDate(targetDate))
    setEventsList([])
    setTiempoTotalHrsStr('00:00')
    setIsIncompleteDay(false)
    try {
      const { data: dbCheckIns } = await supabase
        .from('check_ins')
        .select('*')
        .order('check_in_time', { ascending: true })

      const localCheckIns = JSON.parse(localStorage.getItem('intendencia_check_ins') || '[]')
      const seenIds = new Set()
      const filteredCheckIns = [...(dbCheckIns || []), ...localCheckIns]
        .filter(item => {
          const itemDate = item.check_in_time
            ? item.check_in_time.substring(0, 10)
            : item.created_at?.substring(0, 10)
          return itemDate === targetDate
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

      if (filteredCheckIns.length === 0) return

      const generatedEvents = []
      let totalMinutesDay = 0
      const now = new Date()
      const today = new Date().toISOString().slice(0, 10)

      let activeStay = null
      const activeStayRaw = localStorage.getItem('intendencia_active_stay')
      if (activeStayRaw) {
        try {
          const parsed = JSON.parse(activeStayRaw)
          if (parsed.date === today) activeStay = parsed
        } catch { /* ignorar */ }
      }

      // Registro de cierre explicito de jornada
      const cierreRaw = localStorage.getItem(`intendencia_cierre_${targetDate}`)
      let cierreRecord = null
      if (cierreRaw) {
        try { cierreRecord = JSON.parse(cierreRaw) } catch { /* ignorar */ }
      }
      if (!cierreRecord) {
        const cierresList = JSON.parse(localStorage.getItem('intendencia_cierres_jornada') || '[]')
        cierreRecord = cierresList.find(c => c.date === targetDate) || null
      }

      const firstCI = filteredCheckIns[0]
      const firstTime = new Date(firstCI.check_in_time || firstCI.created_at)
      generatedEvents.push({
        id: 'node-start',
        type: 'CHECK_IN_INICIAL',
        title: 'ENTRADA',
        terminal: firstCI.terminal_name,
        time: firstTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      })

      filteredCheckIns.forEach((ci, idx) => {
        const entryTime = new Date(ci.check_in_time || ci.created_at)
        const isLast = idx === filteredCheckIns.length - 1

        let exitTime
        if (!isLast) {
          exitTime = new Date(filteredCheckIns[idx + 1].check_in_time || filteredCheckIns[idx + 1].created_at)
        } else if (activeStay && targetDate === today) {
          exitTime = now
        } else if (cierreRecord && cierreRecord.timestamp) {
          exitTime = new Date(cierreRecord.timestamp)
        } else {
          exitTime = entryTime
        }

        const stayMinutes = exitTime ? Math.max(0, Math.round((exitTime - entryTime) / 60000)) : 0
        totalMinutesDay += stayMinutes

        const durHrs = Math.floor(stayMinutes / 60)
        const durMins = stayMinutes % 60
        const durationStr = exitTime
          ? `${String(durHrs).padStart(2, '0')}h ${String(durMins).padStart(2, '0')}m`
          : '(sin cierre)'

        const exitTimeStr = exitTime
          ? exitTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : 'En curso'

        // Notas y evidencias desde localStorage (incluyendo foto de check-in nativa)
        const savedNotes = localStorage.getItem(`estancia_notes_${ci.terminal_name}`) || ci.notes || null
        const savedEvidencesRaw = localStorage.getItem(`estancia_evidences_${ci.terminal_name}`)
        let localEvidences = []
        if (savedEvidencesRaw) {
          try { localEvidences = JSON.parse(savedEvidencesRaw) } catch { /* ignorar */ }
        }

        const entryPhoto = ci.photo_url ? [{ label: 'Foto Check-In', photo_url: ci.photo_url }] : []
        const photos = [...entryPhoto, ...localEvidences]

        generatedEvents.push({
          id: `stay-${idx}`,
          type: 'ESTANCIA',
          terminal: ci.terminal_name,
          timeRange: `${entryTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${exitTimeStr}`,
          duration: durationStr,
          notes: savedNotes,
          photos
        })

        // Traslado entre terminales
        if (!isLast) {
          generatedEvents.push({
            id: `traslado-${idx}`,
            type: 'TRASLADO',
            text: 'Traslado entre terminales — Tiempo no contabilizado en estancia productiva.'
          })
        }
      })

      // Evento final: SALIDA (solo si la jornada terminó)
      const lastCI = filteredCheckIns[filteredCheckIns.length - 1]
      if (!activeStay || targetDate !== today) {
        const salidaTimeStr = cierreRecord
          ? new Date(cierreRecord.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : '—'

        generatedEvents.push({
          id: 'node-end',
          type: 'SALIDA_FINAL',
          title: 'SALIDA',
          terminal: lastCI.terminal_name,
          time: salidaTimeStr
        })
      }

      // Tiempo total (máx 12h) y bandera de jornada incompleta (< 7h59m)
      const clampedMinutes = Math.min(totalMinutesDay, 720)
      const hours = Math.floor(clampedMinutes / 60)
      const mins = clampedMinutes % 60
      setTiempoTotalHrsStr(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)
      setIsIncompleteDay(clampedMinutes < 479)
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

        {!loading && eventsList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#64748b', margin: '0 0 0.25rem' }}>Sin registros</p>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>No hay actividad registrada para la fecha seleccionada.</p>
          </div>
        )}

        {!loading && eventsList.length > 0 && eventsList.map((evt) => {
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

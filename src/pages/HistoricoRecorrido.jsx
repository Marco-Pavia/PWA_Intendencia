import { useState } from 'react'

export default function HistoricoRecorrido() {
  const [selectedDate, setSelectedDate] = useState('2026-08-12')

  const dayDetail = {
    dateFormatted: 'Martes, 12 de Agosto 2026',
    tiempoTotalHrs: '07:30',
    isIncomplete: true, // < 7:59 HRS
    events: [
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
          { label: 'ENTRADA', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80' },
          { label: 'SALIDA', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80' }
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
          { label: 'ENTRADA', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80' }
        ]
      },
      {
        id: 'ev-4',
        type: 'SALIDA_FINAL',
        title: 'SALIDA',
        terminal: 'Terminal Las Torres',
        time: '04:30 PM'
      }
    ]
  }

  return (
    <div className="historico-page-container">
      <div className="screen-tag-bar">
        PANTALLA 5 · Histórico de Recorrido
      </div>

      {/* Date Header */}
      <div className="form-section-card historico-header-card">
        <div className="date-selector-row">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input-inline"
          />
          <span className="date-text-formatted">📅 {dayDetail.dateFormatted}</span>
        </div>

        {/* Total Time Summary Card */}
        <div className="total-time-box">
          <span className="label">TIEMPO TOTAL (DÍA)</span>
          <div className="big-time">{dayDetail.tiempoTotalHrs} <span className="unit">HRS</span></div>

          {dayDetail.isIncomplete && (
            <div className="incomplete-alert-banner">
              ⚠️ &lt; 7:59 HRS Incompleto (Salida Temprana / Jornada Corta)
            </div>
          )}
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="timeline-historical-container">
        {dayDetail.events.map((evt) => {
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
              
              {evt.notes && <p className="stay-notes">{evt.notes}</p>}

              {evt.photos && (
                <div className="stay-photos-grid">
                  {evt.photos.map((ph, idx) => (
                    <div key={idx} className="stay-photo-item">
                      <img src={ph.url} alt={ph.label} />
                      <span className="tag">{ph.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

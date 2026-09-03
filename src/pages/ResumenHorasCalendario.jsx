import { useState } from 'react'

export default function ResumenHorasCalendario() {
  const [currentMonth, setCurrentMonth] = useState('Agosto 2026')

  const daysList = [
    { dayName: 'LUN', dayNum: 11, status: 'completo', color: 'green' },
    { dayName: 'MAR', dayNum: 12, status: 'incompleto', color: 'red' },
    { dayName: 'MIÉ', dayNum: 13, status: 'tardia', color: 'purple' },
    { dayName: 'JUE', dayNum: 14, status: 'completo', color: 'green' },
    { dayName: 'VIE', dayNum: 15, status: 'completo', color: 'green' },
    { dayName: 'SÁB', dayNum: 16, status: 'descanso', color: 'gray' },
    { dayName: 'DOM', dayNum: 17, status: 'descanso', color: 'gray' }
  ]

  const dayCards = [
    {
      dayName: 'LUN',
      dayNum: 11,
      hrs: '08:15',
      badgeText: '✓ Jornada Completa (≥ 8:00 HRS)',
      badgeClass: 'badge-completa-green'
    },
    {
      dayName: 'MAR',
      dayNum: 12,
      hrs: '06:45',
      badgeText: '⚠️ Horario Incompleto (< 7:59 HRS) - Salida Temprana',
      badgeClass: 'badge-incompleta-red'
    },
    {
      dayName: 'MIÉ',
      dayNum: 13,
      hrs: '08:30',
      badgeText: '🕒 Jornada Completa - Salida Tardía',
      badgeClass: 'badge-tardia-purple'
    }
  ]

  return (
    <div className="resumen-calendario-container">
      <div className="screen-tag-bar">
        PANTALLA 7 · Resumen de Horas (Calendario)
      </div>

      {/* Month Navigation Header */}
      <div className="form-section-card calendar-header-box">
        <div className="month-nav-row">
          <button type="button" className="nav-arrow">&lt;</button>
          <h2>{currentMonth}</h2>
          <button type="button" className="nav-arrow">&gt;</button>
        </div>

        {/* Days Circle Bar */}
        <div className="days-circles-bar">
          {daysList.map((d, idx) => (
            <div key={idx} className={`day-circle-item ${d.color}`}>
              <span className="day-name">{d.dayName}</span>
              <span className="day-num">{d.dayNum}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day Cards List */}
      <div className="day-cards-list">
        {dayCards.map((card, idx) => (
          <div key={idx} className="day-detail-summary-card">
            <div className="card-left-date">
              <span className="day-lbl">{card.dayName}</span>
              <strong className="day-number">{card.dayNum}</strong>
            </div>

            <div className="card-right-hours">
              <div className="big-hrs-text">
                {card.hrs} <span className="unit">HRS</span>
              </div>

              <div className={`status-banner-badge ${card.badgeClass}`}>
                {card.badgeText}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

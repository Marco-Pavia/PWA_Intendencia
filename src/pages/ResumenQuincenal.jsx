import { useState } from 'react'
import { exportToExcel, exportToPDF } from '../utils/exportUtils'

export default function ResumenQuincenal() {
  const [period, setPeriod] = useState('1ra Quincena Agosto 2026 (01 - 15 Ago)')
  const [supervisor, setSupervisor] = useState('Supervisora Intendencia')

  const dailyDetails = [
    { date: '15 Ago 2026', range: '08:00 - 16:30', totalHrs: '08:15', status: 'Completo', badgeClass: 'status-completo' },
    { date: '14 Ago 2026', range: '08:15 - 15:45', totalHrs: '06:45', status: 'Incompleto', badgeClass: 'status-incompleto' },
    { date: '13 Ago 2026', range: '08:00 - 17:30', totalHrs: '08:30', status: 'Salida Tardía', badgeClass: 'status-tardia' },
    { date: '12 Ago 2026', range: '08:00 - 16:30', totalHrs: '07:30', status: 'Incompleto', badgeClass: 'status-incompleto' },
    { date: '11 Ago 2026', range: '08:00 - 16:15', totalHrs: '08:15', status: 'Completo', badgeClass: 'status-completo' }
  ]

  const handleExportExcel = () => {
    const excelData = dailyDetails.map(d => ({
      Fecha: d.date,
      Horario: d.range,
      'Horas Totales': d.totalHrs,
      Estatus: d.status,
      Supervisor: supervisor,
      Periodo: period
    }))
    exportToExcel(excelData, `resumen_quincenal_${Date.now()}.xlsx`)
  }

  const handleExportPDF = () => {
    exportToPDF('quincenal-report-content', 'Reporte_Quincenal_Intendencia')
  }

  return (
    <div className="resumen-quincenal-container">
      <div className="screen-tag-bar">
        PANTALLA 6 · Resumen Quincenal (Reportes Exportables)
      </div>

      <div id="quincenal-report-content">
        {/* Period & Supervisor Selection Header */}
        <div className="form-section-card">
          <div className="custom-select-wrapper margin-v">
            <select className="terminal-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="1ra Quincena Agosto 2026 (01 - 15 Ago)">1ra Quincena Agosto 2026 (01 - 15 Ago)</option>
              <option value="2da Quincena Agosto 2026 (16 - 31 Ago)">2da Quincena Agosto 2026 (16 - 31 Ago)</option>
            </select>
            <div className="select-arrow">▼</div>
          </div>

          <div className="custom-select-wrapper">
            <select className="terminal-select" value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>
              <option value="Supervisora Intendencia">SUPERVISORA INTENDENCIA</option>
              <option value="Maria Lopez">MARÍA LÓPEZ</option>
            </select>
            <div className="select-arrow">▼</div>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="kpis-row-grid">
          <div className="kpi-box kpi-estancia">
            <span className="label">TOTAL ESTANCIA</span>
            <div className="val">84<span className="sub">:30 h</span></div>
          </div>

          <div className="kpi-box kpi-incompletos">
            <span className="label">DÍAS INCOMPLETOS</span>
            <div className="val">2 <span className="sub">Días (&lt;8h)</span></div>
          </div>
        </div>

        {/* Detalle Diario List */}
        <div className="form-section-card">
          <h3 className="section-title">Detalle Diario</h3>

          <div className="daily-detail-list">
            {dailyDetails.map((item, idx) => (
              <div key={idx} className="daily-detail-card">
                <div className="card-top-line">
                  <div className="date-info">
                    <strong>{item.date}</strong>
                    <span className="range">{item.range}</span>
                  </div>
                  <span className={`status-pill ${item.badgeClass}`}>
                    {item.status === 'Completo' && '✓ '}
                    {item.status === 'Incompleto' && '⚠️ '}
                    {item.status === 'Salida Tardía' && '🕒 '}
                    {item.status}
                  </span>
                </div>

                <div className="hours-worked-row">
                  <span className="lbl">Total Hrs</span>
                  <strong className="hrs-val">{item.totalHrs}</strong>
                </div>

                <div className="actions-row">
                  <button type="button" className="btn-action-small">
                    📷 Fotos
                  </button>
                  <button type="button" className="btn-action-small">
                    📄 Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Actions Container */}
      <div className="export-actions-grid margin-v">
        <button type="button" className="btn-export-pdf" onClick={handleExportPDF}>
          📥 DESCARGAR REPORTE (PDF)
        </button>
        <button type="button" className="btn-export-excel" onClick={handleExportExcel}>
          📊 EXPORTAR A EXCEL (.XLSX)
        </button>
      </div>
    </div>
  )
}

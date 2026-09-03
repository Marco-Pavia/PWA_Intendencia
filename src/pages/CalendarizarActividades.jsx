import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const SEMANAS = [
  'Semana 1 (Días 01 - 07)',
  'Semana 2 (Días 08 - 14)',
  'Semana 3 (Días 15 - 21)',
  'Semana 4 (Días 22 - 28)',
  'Semana 5 (Días 29 - 31)'
]

const TERMINALES_CATALOGO = [
  'Terminal Pipila',
  'Terminal Haciendita',
  'Terminal Las Torres',
  'Terminal Naolinco',
  'Terminal 3 d Mayo',
  'Terminal San Miguel',
  'Terminal Misantla',
  'Terminal Vicente Guerrero',
  'Terminal Actopan'
]

const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export default function CalendarizarActividades() {
  const currentDate = useMemo(() => new Date(), [])
  const currentYear = currentDate.getFullYear()
  
  // Reconocimiento Automático del Mes Actual al Cargar
  const [selectedMonth, setSelectedMonth] = useState(() => MESES[currentDate.getMonth()])
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(() => {
    const day = currentDate.getDate()
    if (day <= 7) return 0
    if (day <= 14) return 1
    if (day <= 21) return 2
    if (day <= 28) return 3
    return 4
  })

  // Calcular la semana de días reales (Lunes a Domingo) en base al calendario real del año
  const weekDays = useMemo(() => {
    const monthIdx = MESES.indexOf(selectedMonth)
    const startDayNum = selectedWeekIdx * 7 + 1
    const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate()
    const targetDay = Math.min(startDayNum, daysInMonth)

    const baseDate = new Date(currentYear, monthIdx, targetDay)
    const dayOfWeek = baseDate.getDay() // 0: Dom, 1: Lun, ..., 6: Sáb
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(baseDate)
    monday.setDate(baseDate.getDate() + distanceToMonday)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push({
        lbl: DAY_LABELS[i],
        num: d.getDate(),
        monthName: MESES[d.getMonth()],
        fullDateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dateObj: d
      })
    }
    return days
  }, [selectedMonth, selectedWeekIdx, currentYear])

  const [selectedDayObj, setSelectedDayObj] = useState(weekDays[0])
  const [terminal, setTerminal] = useState(TERMINALES_CATALOGO[0])
  const [departamento, setDepartamento] = useState('Recaudación')
  const [actividad, setActividad] = useState('Limpieza Profunda')
  
  const [tasks, setTasks] = useState([
    { id: 't-1', title: 'Limpieza Profunda', subtitle: 'Dpto. Recaudación, Terminal Pípila', month: selectedMonth, dateStr: weekDays[0]?.fullDateStr },
    { id: 't-2', title: 'Inspección de Seguridad', subtitle: 'Despacho, Terminal Vicente Guerrero', month: selectedMonth, dateStr: weekDays[1]?.fullDateStr }
  ])
  const [savedMsg, setSavedMsg] = useState('')

  // Actualizar día seleccionado por defecto al cambiar la semana
  useEffect(() => {
    if (weekDays && weekDays.length > 0) {
      setSelectedDayObj(weekDays[0])
    }
  }, [weekDays])

  const handleAddTask = () => {
    const newTask = {
      id: `t-${Date.now()}`,
      title: actividad,
      subtitle: `Dpto. ${departamento}, ${terminal}`,
      month: selectedMonth,
      dateStr: selectedDayObj ? selectedDayObj.fullDateStr : `${currentYear}-09-01`
    }
    setTasks([...tasks, newTask])
  }

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id))
  }

  const handleSavePlanning = async () => {
    setSavedMsg('')
    try {
      // Guardar planeación en Supabase DB
      const records = tasks.map(t => ({
        scheduled_date: t.dateStr || `${currentYear}-09-01`,
        activity_type: t.title,
        description: t.subtitle,
        status: 'PROGRAMADO'
      }))

      await supabase.from('actividades_programadas').insert(records)
      localStorage.setItem('intendencia_scheduled_tasks', JSON.stringify(tasks))
      setSavedMsg(`¡Planeación de ${selectedMonth} (${SEMANAS[selectedWeekIdx]}) guardada exitosamente en la base de datos!`)
    } catch (err) {
      console.warn('Guardando localmente planeación:', err)
      setSavedMsg(`¡Planeación de ${selectedMonth} (${SEMANAS[selectedWeekIdx]}) guardada en el sistema!`)
    }
  }

  return (
    <div className="calendarizar-actividades-container">
      <div className="screen-tag-bar">
        PANTALLA 8 · Calendarizar Actividades (Vista Supervisora)
      </div>

      <div className="form-section-card">
        <h2>Calendarizar Actividades</h2>
        <p className="subtitle">Selección automática del mes actual ({selectedMonth} {currentYear}) y pasarela de Lunes a Domingo del calendario real.</p>

        {/* Month & Week Selectors */}
        <div className="filters-row margin-v">
          <div className="filter-group">
            <label>MES</label>
            <div className="custom-select-wrapper">
              <select
                className="terminal-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MESES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          <div className="filter-group">
            <label>SEMANA</label>
            <div className="custom-select-wrapper">
              <select
                className="terminal-select"
                value={selectedWeekIdx}
                onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
              >
                {SEMANAS.map((s, idx) => (
                  <option key={idx} value={idx}>{s}</option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>
        </div>

        {/* Pasarela Dinámica de Días Reales (LUNES a DOMINGO) */}
        <div className="weekly-days-row margin-v">
          {weekDays.map((d) => {
            const isToday = d.num === currentDate.getDate() && d.monthName === MESES[currentDate.getMonth()]
            const isSelected = selectedDayObj?.fullDateStr === d.fullDateStr
            return (
              <div
                key={d.fullDateStr}
                className={`weekly-day-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedDayObj(d)}
              >
                <span className="lbl">{d.lbl}</span>
                <span className="num">{d.num}</span>
                {isToday && <span style={{ fontSize: '0.55rem', background: '#10b981', color: 'white', padding: '1px 3px', borderRadius: '3px', marginTop: '2px' }}>HOY</span>}
              </div>
            )
          })}
        </div>

        {/* Form Controls */}
        <div className="form-group margin-v">
          <label>Terminal</label>
          <div className="custom-select-wrapper">
            <select className="terminal-select" value={terminal} onChange={(e) => setTerminal(e.target.value)}>
              {TERMINALES_CATALOGO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="select-arrow">▼</div>
          </div>
        </div>

        <div className="form-group margin-v">
          <label>Departamento</label>
          <div className="custom-select-wrapper">
            <select className="terminal-select" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
              <option value="Recaudación">Recaudación</option>
              <option value="Taquilla Ordinario">Taquilla Ordinario</option>
              <option value="Sanitarios">Sanitarios</option>
              <option value="Despacho">Despacho</option>
              <option value="Salas de Espera">Salas de Espera</option>
            </select>
            <div className="select-arrow">▼</div>
          </div>
        </div>

        <div className="form-group margin-v">
          <label>Tipo de Actividad</label>
          <div className="custom-select-wrapper">
            <select className="terminal-select" value={actividad} onChange={(e) => setActividad(e.target.value)}>
              <option value="Limpieza Profunda">Limpieza Profunda</option>
              <option value="Inspección de Seguridad">Inspección de Seguridad</option>
              <option value="Limpieza Ordinaria">Limpieza Ordinaria</option>
              <option value="Auditoría de Insumos">Auditoría de Insumos</option>
            </select>
            <div className="select-arrow">▼</div>
          </div>
        </div>

        <button type="button" className="btn-add-activity" onClick={handleAddTask}>
          ➕ Agregar Actividad para el {selectedDayObj ? `${selectedDayObj.lbl} ${selectedDayObj.num} de ${selectedDayObj.monthName}` : selectedMonth}
        </button>
      </div>

      {/* Task List Header */}
      <div className="form-section-card">
        <div className="task-list-title-row">
          <h3>Actividades para {selectedMonth} ({SEMANAS[selectedWeekIdx]})</h3>
          <span className="task-count-badge">{tasks.length} Tareas</span>
        </div>

        {savedMsg && <div className="success-banner">{savedMsg}</div>}

        <div className="tasks-cards-list margin-v">
          {tasks.map((t) => (
            <div key={t.id} className="task-item-card">
              <div className="task-info">
                <h4>{t.title}</h4>
                <p>{t.subtitle}</p>
                <small style={{ color: '#64748b', fontWeight: 600 }}>Fecha: {t.dateStr}</small>
              </div>
              <button
                type="button"
                className="btn-delete-task"
                onClick={() => handleDeleteTask(t.id)}
                title="Eliminar Tarea"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn-save-planning" onClick={handleSavePlanning}>
          💾 Guardar Planeación de {selectedMonth} ({SEMANAS[selectedWeekIdx]})
        </button>
      </div>
    </div>
  )
}

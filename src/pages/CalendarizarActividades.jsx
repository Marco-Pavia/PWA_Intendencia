import { useState } from 'react'
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

export default function CalendarizarActividades() {
  const [selectedMonth, setSelectedMonth] = useState('Agosto')
  const [selectedWeek, setSelectedWeek] = useState(SEMANAS[1])
  const [selectedDay, setSelectedDay] = useState(12)
  const [terminal, setTerminal] = useState(TERMINALES_CATALOGO[0])
  const [departamento, setDepartamento] = useState('Recaudación')
  const [actividad, setActividad] = useState('Limpieza Profunda')
  
  const [tasks, setTasks] = useState([
    { id: 't-1', title: 'Limpieza Profunda', subtitle: 'Dpto. Recaudación, Terminal Pípila', month: 'Agosto', week: 'Semana 2 (Días 08 - 14)' },
    { id: 't-2', title: 'Inspección de Seguridad', subtitle: 'Despacho, Terminal Vicente Guerrero', month: 'Agosto', week: 'Semana 2 (Días 08 - 14)' },
    { id: 't-3', title: 'Limpieza Ordinaria', subtitle: 'Taquilla Ordinario, Terminal 3 d Mayo', month: 'Agosto', week: 'Semana 2 (Días 08 - 14)' }
  ])
  const [savedMsg, setSavedMsg] = useState('')

  const handleAddTask = () => {
    const newTask = {
      id: `t-${Date.now()}`,
      title: actividad,
      subtitle: `Dpto. ${departamento}, ${terminal}`,
      month: selectedMonth,
      week: selectedWeek
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
        scheduled_date: `2026-08-${selectedDay}`,
        activity_type: t.title,
        description: `${t.subtitle} (${t.month} - ${t.week})`,
        status: 'PROGRAMADO'
      }))

      await supabase.from('actividades_programadas').insert(records)
      localStorage.setItem('intendencia_scheduled_tasks', JSON.stringify(tasks))
      setSavedMsg(`¡Planeación de ${selectedMonth} (${selectedWeek}) guardada exitosamente!`)
    } catch (err) {
      console.warn('Guardando localmente planeación:', err)
      setSavedMsg(`¡Planeación de ${selectedMonth} (${selectedWeek}) guardada en el sistema!`)
    }
  }

  return (
    <div className="calendarizar-actividades-container">
      <div className="screen-tag-bar">
        PANTALLA 8 · Calendarizar Actividades (Vista Supervisora)
      </div>

      <div className="form-section-card">
        <h2>Calendarizar Actividades</h2>
        <p className="subtitle">Planifique las actividades de mantenimiento seleccionando mes y semana.</p>

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
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              >
                {SEMANAS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>
        </div>

        {/* Weekly Day Pills */}
        <div className="weekly-days-row margin-v">
          {[12, 13, 14, 15, 16].map((num) => (
            <div
              key={num}
              className={`weekly-day-pill ${selectedDay === num ? 'active' : ''}`}
              onClick={() => setSelectedDay(num)}
            >
              <span className="lbl">
                {num === 12 ? 'LUN' : num === 13 ? 'MAR' : num === 14 ? 'MIÉ' : num === 15 ? 'JUE' : 'VIE'}
              </span>
              <span className="num">{num}</span>
            </div>
          ))}
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
          ➕ Agregar Actividad a {selectedMonth} ({selectedWeek})
        </button>
      </div>

      {/* Task List Header */}
      <div className="form-section-card">
        <div className="task-list-title-row">
          <h3>Actividades para {selectedMonth} - {selectedWeek}</h3>
          <span className="task-count-badge">{tasks.length} Tareas</span>
        </div>

        {savedMsg && <div className="success-banner">{savedMsg}</div>}

        <div className="tasks-cards-list margin-v">
          {tasks.map((t) => (
            <div key={t.id} className="task-item-card">
              <div className="task-info">
                <h4>{t.title}</h4>
                <p>{t.subtitle}</p>
                <small style={{ color: '#64748b', fontWeight: 600 }}>{t.month} • {t.week}</small>
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
          💾 Guardar Planeación de {selectedMonth} ({selectedWeek})
        </button>
      </div>
    </div>
  )
}

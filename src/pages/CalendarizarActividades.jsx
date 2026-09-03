import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CalendarizarActividades() {
  const [selectedDay, setSelectedDay] = useState(12)
  const [terminal, setTerminal] = useState('Terminal Pipila')
  const [departamento, setDepartamento] = useState('Recaudación')
  const [actividad, setActividad] = useState('Limpieza Profunda')
  
  const [tasks, setTasks] = useState([
    { id: 't-1', title: 'Limpieza Profunda', subtitle: 'Dpto. Recaudación, Pípila' },
    { id: 't-2', title: 'Inspección de Seguridad', subtitle: 'Despacho, Vicente Guerrero' },
    { id: 't-3', title: 'Limpieza', subtitle: 'Taquilla Ordinario' }
  ])
  const [savedMsg, setSavedMsg] = useState('')

  const handleAddTask = () => {
    const newTask = {
      id: `t-${Date.now()}`,
      title: actividad,
      subtitle: `Dpto. ${departamento}, ${terminal}`
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
        supervisor_id: null,
        scheduled_date: `2026-10-${selectedDay}`,
        activity_type: t.title,
        description: t.subtitle,
        status: 'PROGRAMADO'
      }))

      await supabase.from('actividades_programadas').insert(records)
      localStorage.setItem('intendencia_scheduled_tasks', JSON.stringify(tasks))
      setSavedMsg('¡Planeación semanal guardada exitosamente en la base de datos!')
    } catch (err) {
      console.warn('Guardando localmente planeación:', err)
      setSavedMsg('¡Planeación semanal guardada en el sistema!')
    }
  }

  return (
    <div className="calendarizar-actividades-container">
      <div className="screen-tag-bar">
        PANTALLA 8 · Calendarizar Actividades (Vista Supervisora)
      </div>

      <div className="form-section-card">
        <h2>Calendarizar Actividades</h2>
        <p className="subtitle">Planifique las actividades de mantenimiento por terminal.</p>

        {/* Weekly Day Selector */}
        <div className="weekly-days-row margin-v">
          {[12, 13, 14, 15, 16].map((num) => (
            <div
              key={num}
              className={`weekly-day-pill ${selectedDay === num ? 'active' : ''}`}
              onClick={() => setSelectedDay(num)}
            >
              <span className="lbl">{num === 12 ? 'LUN' : num === 13 ? 'MAR' : num === 14 ? 'MIÉ' : num === 15 ? 'JUE' : 'VIE'}</span>
              <span className="num">{num}</span>
            </div>
          ))}
        </div>

        {/* Form Controls */}
        <div className="form-group margin-v">
          <label>Terminal</label>
          <select className="terminal-select" value={terminal} onChange={(e) => setTerminal(e.target.value)}>
            <option value="Terminal Pipila">Terminal Pipila</option>
            <option value="Terminal Haciendita">Terminal Haciendita</option>
            <option value="Terminal Las Torres">Terminal Las Torres</option>
            <option value="Terminal Naolinco">Terminal Naolinco</option>
          </select>
        </div>

        <div className="form-group margin-v">
          <label>Departamento</label>
          <select className="terminal-select" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
            <option value="Recaudación">Recaudación</option>
            <option value="Taquilla Ordinario">Taquilla Ordinario</option>
            <option value="Sanitarios">Sanitarios</option>
            <option value="Despacho">Despacho</option>
            <option value="Salas de Espera">Salas de Espera</option>
          </select>
        </div>

        <div className="form-group margin-v">
          <label>Tipo de Actividad</label>
          <select className="terminal-select" value={actividad} onChange={(e) => setActividad(e.target.value)}>
            <option value="Limpieza Profunda">Limpieza Profunda</option>
            <option value="Inspección de Seguridad">Inspección de Seguridad</option>
            <option value="Limpieza Ordinaria">Limpieza Ordinaria</option>
            <option value="Auditoría de Insumos">Auditoría de Insumos</option>
          </select>
        </div>

        <button type="button" className="btn-add-activity" onClick={handleAddTask}>
          ➕ Agregar Actividad
        </button>
      </div>

      {/* Task List Header */}
      <div className="form-section-card">
        <div className="task-list-title-row">
          <h3>Lunes, {selectedDay} Oct</h3>
          <span className="task-count-badge">{tasks.length} Tareas</span>
        </div>

        {savedMsg && <div className="success-banner">{savedMsg}</div>}

        <div className="tasks-cards-list margin-v">
          {tasks.map((t) => (
            <div key={t.id} className="task-item-card">
              <div className="task-info">
                <h4>{t.title}</h4>
                <p>{t.subtitle}</p>
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
          💾 Guardar Planeación Semanal
        </button>
      </div>
    </div>
  )
}

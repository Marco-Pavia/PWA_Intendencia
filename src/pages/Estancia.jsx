import { useEffect, useRef, useState } from 'react'
import { convertAndCompressToWebP } from '../utils/imageCompressor'

export default function Estancia({ currentTerminal = 'Terminal Pipila', entryTimeStr = '09:15 AM', onSalidaTerminal }) {
  const [notes, setNotes] = useState('')
  const [evidences, setEvidences] = useState([
    { id: 'ev-1', type: 'CHECK_IN', label: 'Entrada', photo_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80' },
    { id: 'ev-2', type: 'LIMPIEZA', label: 'Limpieza Sanitarios', photo_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80' }
  ])
  const [uploading, setUploading] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  const fileInputRef = useRef(null)

  // Cargar evidencias y notas guardadas previamente para esta terminal
  useEffect(() => {
    const savedEvidences = localStorage.getItem(`estancia_evidences_${currentTerminal}`)
    if (savedEvidences) {
      try {
        setEvidences(JSON.parse(savedEvidences))
      } catch (e) {
        console.warn('Error al cargar evidencias guardadas:', e)
      }
    }

    const savedNotes = localStorage.getItem(`estancia_notes_${currentTerminal}`)
    if (savedNotes) {
      setNotes(savedNotes)
    }
  }, [currentTerminal])

  // Subir foto e integrarla inmediatamente al estado y almacenamiento local
  const handleAddPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setSaveSuccessMsg('')
    try {
      const webpFile = await convertAndCompressToWebP(file)
      const previewUrl = URL.createObjectURL(webpFile)

      const newEvidence = {
        id: `ev-${Date.now()}`,
        type: 'LIMPIEZA',
        label: `Foto de Avance ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        photo_url: previewUrl,
        fileSize: (webpFile.size / 1024).toFixed(1)
      }

      const updated = [...evidences, newEvidence]
      setEvidences(updated)
      localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(updated))
    } catch (err) {
      console.error('Error al subir evidencia:', err)
    } finally {
      setUploading(false)
    }
  }

  // Guardado Parcial Explícito (Notas y Fotos)
  const handleSaveProgress = () => {
    localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(evidences))
    localStorage.setItem(`estancia_notes_${currentTerminal}`, notes)
    
    setSaveSuccessMsg('¡Avance guardado con éxito! Puedes cerrar la app y tus fotos/notas se conservarán intactas.')
    setTimeout(() => {
      setSaveSuccessMsg('')
    }, 4000)
  }

  return (
    <div className="estancia-page-container">
      <div className="screen-tag-bar">
        PANTALLA 2 · Estancia (Fotos y Notas)
      </div>

      {/* Mensaje de Confirmación de Guardado */}
      {saveSuccessMsg && (
        <div className="success-banner">
          {saveSuccessMsg}
        </div>
      )}

      {/* Terminal Status Card */}
      <div className="estancia-header-card">
        <div className="terminal-title-row">
          <h2>{currentTerminal}</h2>
          <span className="status-badge-estancia">● EN ESTANCIA</span>
        </div>

        <div className="entry-time-box">
          <div className="time-info">
            <span className="label">Hora Entrada</span>
            <strong className="time-val">{entryTimeStr}</strong>
          </div>
          <button type="button" className="btn-salida-terminal" onClick={onSalidaTerminal}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            REGISTRAR SALIDA DE TERMINAL
          </button>
        </div>
      </div>

      {/* Photo Evidences Section */}
      <div className="form-section-card">
        <label className="section-label">EVIDENCIAS FOTOGRÁFICAS DE ACTIVIDAD</label>
        
        <div className="evidences-grid">
          {evidences.map((ev) => (
            <div key={ev.id} className="evidence-card-item">
              <img src={ev.photo_url} alt={ev.label} />
              <div className="evidence-label-overlay">{ev.label}</div>
            </div>
          ))}

          {/* Add Evidence Trigger Card */}
          <div className="add-evidence-card" onClick={() => fileInputRef.current?.click()}>
            <div className="add-icon">+</div>
            <span>{uploading ? 'Procesando WebP...' : 'Agregar Foto de Evidencia'}</span>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden-file-input"
          onChange={handleAddPhoto}
        />
      </div>

      {/* Activity Logs Notes */}
      <div className="form-section-card">
        <label className="section-label">REGISTRO DE ACTIVIDADES</label>
        <textarea
          className="activity-notes-input"
          rows="4"
          placeholder="Escriba los detalles de las actividades realizadas en esta estancia (ej. Supervisión de área, reposición de insumos de sanitarios, reporte de mantenimiento)..."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            localStorage.setItem(`estancia_notes_${currentTerminal}`, e.target.value)
          }}
        />
      </div>

      {/* Explicit Partial Save Button */}
      <div className="margin-v">
        <button
          type="button"
          className="btn-complete-checkin full-width"
          onClick={handleSaveProgress}
        >
          💾 GUARDAR AVANCE (GUARDADO PARCIAL)
        </button>
      </div>
    </div>
  )
}

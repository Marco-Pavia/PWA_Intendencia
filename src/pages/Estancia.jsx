import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { convertAndCompressToWebP } from '../utils/imageCompressor'

const MAX_NOTES_LENGTH = 500

export default function Estancia({ currentTerminal = 'Terminal Pipila', entryTimeStr = '09:15 AM', onSalidaTerminal }) {
  const [notes, setNotes] = useState('')
  const [evidences, setEvidences] = useState([])
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
      setNotes(savedNotes.substring(0, MAX_NOTES_LENGTH))
    }
  }, [currentTerminal])

  // Convertir Blob WebP a Base64 permanente para evitar que las fotos "desaparezcan" al reiniciar la app
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Subir foto, comprimir a WebP, guardar URL pública o Base64 persistente
  const handleAddPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setSaveSuccessMsg('')
    try {
      // 1. Convertir y comprimir foto a .WebP
      const webpFile = await convertAndCompressToWebP(file)

      // 2. Generar Base64 Data URL persistente (nunca caduca ni se pierde)
      const base64Url = await fileToBase64(webpFile)
      let finalPhotoUrl = base64Url

      // 3. Intentar subir a Supabase Storage para tener respaldo en la nube
      try {
        const fileName = `estancia_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`
        const { data: storageData } = await supabase.storage
          .from('checkin-photos')
          .upload(fileName, webpFile, {
            contentType: 'image/webp',
            upsert: true
          })

        if (storageData) {
          const { data: publicUrlData } = supabase.storage
            .from('checkin-photos')
            .getPublicUrl(fileName)
          if (publicUrlData?.publicUrl) {
            finalPhotoUrl = publicUrlData.publicUrl
          }
        }
      } catch (cloudErr) {
        console.warn('Subida a nube omitida, conservando Base64 local:', cloudErr)
      }

      const newEvidence = {
        id: `ev-${Date.now()}`,
        type: 'LIMPIEZA',
        label: `Foto ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        photo_url: finalPhotoUrl,
        fileSize: (webpFile.size / 1024).toFixed(1)
      }

      const updated = [...evidences, newEvidence]
      setEvidences(updated)
      localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(updated))
      setSaveSuccessMsg('¡Foto optimizada a WebP y guardada de forma permanente!')
    } catch (err) {
      console.error('Error al subir evidencia:', err)
    } finally {
      setUploading(false)
    }
  }

  // Guardado Parcial Explícito (Notas y Fotos)
  const handleSaveProgress = () => {
    localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(evidences))
    localStorage.setItem(`estancia_notes_${currentTerminal}`, notes.substring(0, MAX_NOTES_LENGTH))

    setSaveSuccessMsg('¡Avance guardado con éxito! Tus fotos y notas están conservadas permanentemente.')
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label className="section-label" style={{ margin: 0 }}>REGISTRO DE ACTIVIDADES</label>
          <span style={{ fontSize: '0.7rem', color: notes.length >= MAX_NOTES_LENGTH ? '#dc2626' : '#64748b', fontWeight: 600 }}>
            {notes.length} / {MAX_NOTES_LENGTH} caracteres
          </span>
        </div>
        <textarea
          className="activity-notes-input"
          rows="4"
          maxLength={MAX_NOTES_LENGTH}
          placeholder="Escriba los detalles de las actividades realizadas en esta estancia (máximo 500 caracteres)..."
          value={notes}
          onChange={(e) => {
            const val = e.target.value.substring(0, MAX_NOTES_LENGTH)
            setNotes(val)
            localStorage.setItem(`estancia_notes_${currentTerminal}`, val)
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

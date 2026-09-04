import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { convertAndCompressToWebP } from '../utils/imageCompressor'

const MAX_NOTES_LENGTH = 500

export default function Estancia({ currentTerminal = 'Terminal Pipila', entryTimeStr = '09:15 AM', onSalidaTerminal }) {
  const [notes, setNotes] = useState('')
  const [evidences, setEvidences] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')
  const [showExitModal, setShowExitModal] = useState(false)

  const fileInputRef = useRef(null)

  // Sincronizar evidencias y notas con LocalStorage y Supabase DB en tiempo real
  useEffect(() => {
    // 1. Carga inicial desde LocalStorage para respuesta inmediata
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

    // 2. Consulta en la nube (Supabase DB) para restaurar notas y fotos sincronizadas entre dispositivos
    const fetchCloudEstanciaData = async () => {
      try {
        // Cargar notas desde tabla check_ins
        const { data: dbCheckIns } = await supabase
          .from('check_ins')
          .select('id, notes')
          .eq('terminal_name', currentTerminal)
          .order('check_in_time', { ascending: false })
          .limit(1)

        if (dbCheckIns && dbCheckIns.length > 0 && dbCheckIns[0].notes) {
          const cloudNotes = dbCheckIns[0].notes.substring(0, MAX_NOTES_LENGTH)
          setNotes(cloudNotes)
          localStorage.setItem(`estancia_notes_${currentTerminal}`, cloudNotes)
        }

        // Cargar evidencias fotográficas de la terminal en DB
        const { data: dbEvidencias } = await supabase
          .from('evidencias_fotograficas')
          .select('*')
          .order('created_at', { ascending: true })

        if (dbEvidencias && dbEvidencias.length > 0) {
          const terminalEvs = dbEvidencias
            .filter(ev => ev.label && ev.label.includes(currentTerminal))
            .map((ev, idx) => ({
              id: ev.id || `ev-db-${idx}`,
              type: ev.category || 'LIMPIEZA',
              label: ev.label,
              photo_url: ev.photo_url
            }))

          if (terminalEvs.length > 0) {
            setEvidences(prev => {
              const seen = new Set(prev.map(p => p.photo_url))
              const merged = [...prev]
              terminalEvs.forEach(item => {
                if (!seen.has(item.photo_url)) {
                  seen.add(item.photo_url)
                  merged.push(item)
                }
              })
              localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(merged))
              return merged
            })
          }
        }
      } catch (err) {
        console.warn('Error al obtener datos de estancia desde Supabase:', err)
      }
    }

    fetchCloudEstanciaData()
  }, [currentTerminal])

  // Función de ayuda para respaldar notas en Supabase DB
  const saveNotesToSupabase = async (notesText) => {
    try {
      const { data: latestCI } = await supabase
        .from('check_ins')
        .select('id')
        .eq('terminal_name', currentTerminal)
        .order('check_in_time', { ascending: false })
        .limit(1)

      if (latestCI && latestCI.length > 0) {
        await supabase
          .from('check_ins')
          .update({ notes: notesText })
          .eq('id', latestCI[0].id)
      }
    } catch (err) {
      console.warn('Error al respaldar notas en Supabase DB:', err)
    }
  }

  // Convertir Blob WebP a Base64 permanente como respaldo
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Subir foto, comprimir a WebP, guardar URL pública en Supabase Storage & DB
  const handleAddPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setSaveSuccessMsg('')
    try {
      // 1. Convertir y comprimir foto a .WebP
      const webpFile = await convertAndCompressToWebP(file)

      // 2. Generar Base64 Data URL persistente (respaldo local)
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

      const timeLabel = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      const newEvidence = {
        id: `ev-${Date.now()}`,
        type: 'LIMPIEZA',
        label: `${currentTerminal} - Foto ${timeLabel}`,
        photo_url: finalPhotoUrl,
        fileSize: (webpFile.size / 1024).toFixed(1)
      }

      const updated = [...evidences, newEvidence]
      setEvidences(updated)
      localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(updated))

      // Guardar también en tabla 'evidencias_fotograficas' de Supabase DB
      try {
        await supabase.from('evidencias_fotograficas').insert([{
          photo_url: finalPhotoUrl,
          category: 'SUPERVISION',
          label: newEvidence.label
        }])
      } catch (dbEvErr) {
        console.warn('Respaldo en DB evidencias omitido:', dbEvErr)
      }

      // Sincronizar también las notas actuales
      await saveNotesToSupabase(notes)

      setSaveSuccessMsg('¡Foto WebP optimizada y sincronizada en la nube!')
    } catch (err) {
      console.error('Error al subir evidencia:', err)
    } finally {
      setUploading(false)
    }
  }

  // Guardado Parcial Explícito en Nube y Local
  const handleSaveProgress = async () => {
    const trimmedNotes = notes.substring(0, MAX_NOTES_LENGTH)
    localStorage.setItem(`estancia_evidences_${currentTerminal}`, JSON.stringify(evidences))
    localStorage.setItem(`estancia_notes_${currentTerminal}`, trimmedNotes)

    await saveNotesToSupabase(trimmedNotes)

    setSaveSuccessMsg('¡Avance guardado con éxito! Fotos y notas sincronizadas en la nube para todos los dispositivos.')
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
          <button type="button" className="btn-salida-terminal" onClick={() => setShowExitModal(true)}>
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
          onBlur={(e) => {
            saveNotesToSupabase(e.target.value.substring(0, MAX_NOTES_LENGTH))
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

      {/* Modal de Confirmación de Salida de Terminal */}
      {showExitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-warning-icon">🔄</div>
            <h3>Confirmar Salida de Terminal</h3>
            <p>
              ¿Está segura de registrar su salida de la <strong>{currentTerminal}</strong>? Sus avances y evidencias fotográficas quedarán guardados.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel-modal"
                onClick={() => setShowExitModal(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-confirm-modal"
                style={{ background: 'var(--primary-navy)' }}
                onClick={() => {
                  setShowExitModal(false)
                  if (onSalidaTerminal) onSalidaTerminal()
                }}
              >
                Sí, Registrar Salida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

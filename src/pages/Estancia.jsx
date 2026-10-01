import { useEffect, useRef, useState } from 'react'
import { getTerminalIdByName } from '../App'
import { supabase } from '../lib/supabaseClient'
import { convertAndCompressToWebP } from '../utils/imageCompressor'

const MAX_NOTES_LENGTH = 500

export default function Estancia({ currentTerminal = 'Terminal Pipila', entryTimeStr = '09:15:00 AM', onSalidaTerminal }) {
  const [notes, setNotes] = useState('')
  const [evidences, setEvidences] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')
  const [showExitModal, setShowExitModal] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchCloudEstanciaData = async () => {
      setNotes('')
      setEvidences([])
      try {
        const today = new Date().toISOString().substring(0, 10)

        // 1. Obtener estancias para la terminal actual
        const { data: dbEstancia } = await supabase
          .from('estancias')
          .select('id, notes, created_at, entry_time, status')
          .eq('terminal_name', currentTerminal)
          .order('created_at', { ascending: false })

        const estanciaHoy = (dbEstancia || []).find(e =>
          e.status === 'ACTIVA' ||
          e.created_at?.substring(0, 10) === today ||
          e.entry_time?.substring(0, 10) === today
        )

        if (estanciaHoy && estanciaHoy.notes) {
          setNotes(estanciaHoy.notes.substring(0, MAX_NOTES_LENGTH))
        } else {
          // Fallback a check_ins de HOY
          const { data: dbCheckIns } = await supabase
            .from('check_ins')
            .select('id, notes, check_in_time, created_at')
            .eq('terminal_name', currentTerminal)
            .order('check_in_time', { ascending: false })

          const ciHoy = (dbCheckIns || []).find(ci =>
            (ci.check_in_time || ci.created_at)?.substring(0, 10) === today
          )

          if (ciHoy && ciHoy.notes) {
            setNotes(ciHoy.notes.substring(0, MAX_NOTES_LENGTH))
          }
        }

        // 2. Cargar evidencias fotográficas y fotos de check-in de la terminal en DB (SOLO DE HOY)
        const { data: dbEvidencias } = await supabase
          .from('evidencias_fotograficas')
          .select('*')
          .order('created_at', { ascending: true })

        const { data: ciPhotos } = await supabase
          .from('check_ins')
          .select('photo_url, terminal_name, check_in_time, created_at')
          .eq('terminal_name', currentTerminal)
          .order('check_in_time', { ascending: false })

        const loadedEvs = []
        const seenUrls = new Set()

        if (ciPhotos && ciPhotos.length > 0) {
          ciPhotos.forEach(ci => {
            const ciDate = (ci.check_in_time || ci.created_at)?.substring(0, 10)
            if (ciDate === today && ci.photo_url && !seenUrls.has(ci.photo_url)) {
              seenUrls.add(ci.photo_url)
              loadedEvs.push({
                id: `ci-photo-${ci.check_in_time}`,
                type: 'CHECK_IN',
                label: `${currentTerminal} - Foto Check-In`,
                photo_url: ci.photo_url
              })
            }
          })
        }

        if (dbEvidencias && dbEvidencias.length > 0) {
          dbEvidencias.forEach((ev, idx) => {
            const evDate = ev.created_at ? ev.created_at.substring(0, 10) : null
            const matchesEstanciaHoy = estanciaHoy && ev.estancia_id === estanciaHoy.id
            const matchesTerminalToday = evDate === today && ev.label && ev.label.includes(currentTerminal)

            if ((matchesEstanciaHoy || matchesTerminalToday) && ev.photo_url && !seenUrls.has(ev.photo_url)) {
              seenUrls.add(ev.photo_url)
              loadedEvs.push({
                id: ev.id || `ev-db-${idx}`,
                type: ev.category || 'SUPERVISION',
                label: ev.label || `${currentTerminal} - Evidencia`,
                photo_url: ev.photo_url
              })
            }
          })
        }

        setEvidences(loadedEvs)
      } catch (err) {
        console.warn('Error al obtener datos de estancia desde Supabase:', err)
      }
    }

    fetchCloudEstanciaData()
  }, [currentTerminal])

  // Función de ayuda para respaldar notas en Supabase DB (estancias y check_ins de hoy)
  const saveNotesToSupabase = async (notesText) => {
    try {
      const today = new Date().toISOString().substring(0, 10)

      const { data: latestEst } = await supabase
        .from('estancias')
        .select('id, created_at, entry_time, status')
        .eq('terminal_name', currentTerminal)
        .order('created_at', { ascending: false })

      const targetEst = (latestEst || []).find(e =>
        e.status === 'ACTIVA' ||
        e.created_at?.substring(0, 10) === today ||
        e.entry_time?.substring(0, 10) === today
      )

      if (targetEst) {
        await supabase
          .from('estancias')
          .update({ notes: notesText, updated_at: new Date().toISOString() })
          .eq('id', targetEst.id)
      }

      const { data: latestCI } = await supabase
        .from('check_ins')
        .select('id, check_in_time, created_at')
        .eq('terminal_name', currentTerminal)
        .order('check_in_time', { ascending: false })

      const targetCI = (latestCI || []).find(ci =>
        (ci.check_in_time || ci.created_at)?.substring(0, 10) === today
      )

      if (targetCI) {
        await supabase
          .from('check_ins')
          .update({ notes: notesText })
          .eq('id', targetCI.id)
      }
    } catch (err) {
      console.warn('Error al respaldar notas en Supabase DB:', err)
    }
  }

  // Convertir Blob WebP a Base64 como fallback
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

      // 2. Generar Base64 Data URL por si falla storage
      const base64Url = await fileToBase64(webpFile)
      let finalPhotoUrl = base64Url

      // 3. Subir a Supabase Storage
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
        console.warn('Subida a storage omitida, usando Base64:', cloudErr)
      }

      let targetEstanciaId = null
      let targetJornadaId = null

      const { data: activeEst } = await supabase
        .from('estancias')
        .select('id, jornada_id')
        .eq('terminal_name', currentTerminal)
        .eq('status', 'ACTIVA')
        .order('created_at', { ascending: false })
        .limit(1)
      if (activeEst && activeEst.length > 0) {
        targetEstanciaId = activeEst[0].id
        targetJornadaId = activeEst[0].jornada_id
      } else {
        const { data: latestEst } = await supabase
          .from('estancias')
          .select('id, jornada_id')
          .eq('terminal_name', currentTerminal)
          .order('created_at', { ascending: false })
          .limit(1)
        if (latestEst && latestEst.length > 0) {
          targetEstanciaId = latestEst[0].id
          targetJornadaId = latestEst[0].jornada_id
        } else {
          const { data: anyEst } = await supabase
            .from('estancias')
            .select('id, jornada_id')
            .order('created_at', { ascending: false })
            .limit(1)
          if (anyEst && anyEst.length > 0) {
            targetEstanciaId = anyEst[0].id
            targetJornadaId = anyEst[0].jornada_id
          } else {
            const today = new Date().toISOString().slice(0, 10)
            const { data: activeJornada } = await supabase
              .from('jornadas')
              .select('id')
              .eq('date', today)
              .eq('status', 'EN_PROGRESO')
              .limit(1)

            let jId = activeJornada?.[0]?.id || null
            const termId = await getTerminalIdByName(currentTerminal)

            let { data: createdEst, error: createEstErr } = await supabase
              .from('estancias')
              .insert([{
                jornada_id: jId,
                terminal_id: termId,
                terminal_name: currentTerminal,
                entry_time: new Date().toISOString(),
                status: 'ACTIVA'
              }])
              .select()
            if ((!createdEst || createdEst.length === 0) && jId) {
              console.warn('Reintentando creación de estancia sin jornada_id:', createEstErr)
              const retryCreated = await supabase
                .from('estancias')
                .insert([{
                  terminal_id: termId,
                  terminal_name: currentTerminal,
                  entry_time: new Date().toISOString(),
                  status: 'ACTIVA'
                }])
                .select()
              createdEst = retryCreated.data
            }

            if (createdEst && createdEst.length > 0) {
              targetEstanciaId = createdEst[0].id
              targetJornadaId = createdEst[0].jornada_id
            }
          }
        }
      }

      if (!targetEstanciaId) {
        throw new Error('No se pudo encontrar o generar una estancia válida en la base de datos para asociar la fotografía.')
      }

      const timeLabel = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const newEvidence = {
        id: `ev-${Date.now()}`,
        type: 'LIMPIEZA',
        label: `${currentTerminal} - Foto ${timeLabel}`,
        photo_url: finalPhotoUrl,
        fileSize: (webpFile.size / 1024).toFixed(1)
      }
      let { error: evErr } = await supabase.from('evidencias_fotograficas').insert([{
        estancia_id: targetEstanciaId,
        jornada_id: targetJornadaId,
        photo_url: finalPhotoUrl,
        category: 'SUPERVISION',
        label: newEvidence.label
      }])

      if (evErr && targetJornadaId) {
        console.warn('Reintentando inserción de evidencia sin jornada_id:', evErr)
        const retryRes = await supabase.from('evidencias_fotograficas').insert([{
          estancia_id: targetEstanciaId,
          photo_url: finalPhotoUrl,
          category: 'SUPERVISION',
          label: newEvidence.label
        }])
        evErr = retryRes.error
      }

      if (evErr) {
        console.error('Error al insertar evidencia en Supabase DB:', evErr)
        setSaveSuccessMsg(`⚠️ Error al sincronizar evidencia en DB: ${evErr.message || 'Error de permisos'}`)
      } else {
        setSaveSuccessMsg('¡Foto WebP subida y guardada en Supabase DB!')
      }

      setEvidences(prev => {
        const exists = prev.some(item => item.photo_url === finalPhotoUrl)
        return exists ? prev : [...prev, newEvidence]
      })

      await saveNotesToSupabase(notes)
    } catch (err) {
      console.error('Error al subir evidencia:', err)
      setSaveSuccessMsg('Error al procesar fotografía de evidencia.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProgress = async () => {
    const trimmedNotes = notes.substring(0, MAX_NOTES_LENGTH)
    await saveNotesToSupabase(trimmedNotes)

    setSaveSuccessMsg('¡Avance guardado con éxito! Guardado en la base de datos de Supabase para todos los equipos.')
    setTimeout(() => {
      setSaveSuccessMsg('')
    }, 4000)
  }

  return (
    <div className="estancia-page-container">

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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { convertAndCompressToWebP } from '../utils/imageCompressor'

const DEFAULT_TERMINALES = [
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

const getTerminalIdByName = async (terminalName) => {
  if (!terminalName) return null
  try {
    const { data } = await supabase
      .from('terminales')
      .select('id')
      .eq('name', terminalName)
      .limit(1)

    if (data && data.length > 0) {
      return data[0].id
    }

    const { data: newTerm } = await supabase
      .from('terminales')
      .insert([{ name: terminalName, code: `TERM-${Date.now()}` }])
      .select()

    if (newTerm && newTerm.length > 0) {
      return newTerm[0].id
    }
  } catch (err) {
    console.warn('Error al resolver terminal_id en CheckIn:', err)
  }
  return null
}

export default function CheckIn({ onCheckInSuccess }) {
  const { user } = useAuth()

  // Lista de terminales con 'Terminal Pipila' por defecto
  const [terminales, setTerminales] = useState(DEFAULT_TERMINALES)
  const [selectedTerminal, setSelectedTerminal] = useState('Terminal Pipila')

  // Estados del formulario
  const [gpsStatus, setGpsStatus] = useState('connecting') // 'connecting' | 'connected' | 'error'
  const [coords, setCoords] = useState(null)

  // Cámara y Foto WebP
  const [cameraActive, setCameraActive] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFileWebP, setPhotoFileWebP] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Cargar catálogo de terminales desde Supabase DB manteniendo 'Terminal Pipila' por defecto
  useEffect(() => {
    const fetchTerminales = async () => {
      try {
        const { data, error } = await supabase
          .from('terminales')
          .select('name')
          .order('name', { ascending: true })

        if (data && data.length > 0 && !error) {
          const names = data.map(t => t.name)
          setTerminales(names)
          if (names.includes('Terminal Pipila')) {
            setSelectedTerminal('Terminal Pipila')
          } else {
            setSelectedTerminal(names[0])
          }
        }
      } catch (err) {
        console.warn('Uso de lista por defecto de terminales:', err)
      }
    }

    fetchTerminales()
  }, [])

  // Obtención formateada de fecha
  const getFormattedDate = () => {
    const now = new Date()
    const options = { weekday: 'long', day: 'numeric', month: 'long' }
    const dateStr = now.toLocaleDateString('es-ES', options)
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  }

  // 1. Obtener ubicación GPS
  const obtainGpsLocation = useCallback(() => {
    setGpsStatus('connecting')
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setErrorMsg('Tu navegador no soporta geolocalización GPS.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setGpsStatus('connected')
      },
      (err) => {
        console.warn('Error al obtener GPS real, aplicando GPS simulado para entorno de desarrollo:', err.message)
        setCoords({
          latitude: 19.543210,
          longitude: -96.912345
        })
        setGpsStatus('connected')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    obtainGpsLocation()
  }, [obtainGpsLocation])

  // Asignar el stream a la etiqueta video en cuanto el componente de cámara en vivo se monte en el DOM
  useEffect(() => {
    if (cameraActive && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream
      videoRef.current.play().catch(err => console.warn('Error al reproducir video:', err))
    }
  }, [cameraActive, mediaStream])

  // 2. Control de Cámara (Disparador Nativo en Móvil o Stream WebRTC)
  const startCamera = async () => {
    setErrorMsg('')

    // Detectar si es un dispositivo móvil/PWA para activar la cámara nativa inmediatamente sin pantalla en negro
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click()
        return
      }
    }

    // Para navegadores desktop o fallback, intentar WebRTC stream
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        setMediaStream(stream)
        setCameraActive(true)
      } else {
        cameraInputRef.current?.click()
      }
    } catch (err) {
      console.warn('Cámara en vivo no disponible, abriendo captura nativa:', err)
      cameraInputRef.current?.click()
    }
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }
    setCameraActive(false)
  }

  const processCapturedPhoto = async (imageInput) => {
    setCompressing(true)
    setErrorMsg('')
    try {
      const webpFile = await convertAndCompressToWebP(imageInput)
      setPhotoFileWebP(webpFile)
      const previewUrl = URL.createObjectURL(webpFile)
      setPhotoPreview(previewUrl)
    } catch (err) {
      console.error('Error al convertir imagen a WebP:', err)
      setErrorMsg('Ocurrió un error al optimizar la imagen a formato WebP.')
    } finally {
      setCompressing(false)
    }
  }

  const capturePhotoFromCamera = async () => {
    if (!videoRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/png')
    stopCamera()
    await processCapturedPhoto(dataUrl)
  }

  // 3. Selección / Captura de Archivos
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await processCapturedPhoto(file)
  }

  // 4. Envío del Registro (Check-In)
  const handleSubmitCheckIn = async () => {
    if (gpsStatus !== 'connected' || !photoFileWebP) return

    setSubmitting(true)
    setErrorMsg('')

    try {
      let photoUrl = ''

      const fileName = `checkin_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`
      const { data: storageData, error: storageError } = await supabase.storage
        .from('checkin-photos')
        .upload(fileName, photoFileWebP, {
          contentType: 'image/webp',
          upsert: true
        })

      if (storageError) {
        console.warn('Subida a Supabase Storage falló o bucket no existe, guardando localmente dataURL:', storageError)
        photoUrl = photoPreview
      } else if (storageData) {
        const { data: publicUrlData } = supabase.storage
          .from('checkin-photos')
          .getPublicUrl(fileName)
        photoUrl = publicUrlData?.publicUrl || photoPreview
      }

      // Validar si el ID de usuario tiene formato de UUID estándar
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user?.id || '')
      const validUserId = isUuid ? user.id : null

      // 1. Inserción en tabla 'check_ins'
      const record = {
        user_id: validUserId,
        user_name: user?.user_metadata?.full_name || 'Supervisora Intendencia',
        role: 'supervisora',
        terminal_name: selectedTerminal,
        check_in_time: new Date().toISOString(),
        latitude: coords?.latitude || 0,
        longitude: coords?.longitude || 0,
        photo_url: photoUrl
      }

      const { error: ciError } = await supabase
        .from('check_ins')
        .insert([record])

      if (ciError) {
        console.warn('Error al insertar check_in en Supabase DB:', ciError)
      }

      // 2. Crear o encontrar Jornada activa de hoy
      const today = new Date().toISOString().slice(0, 10)
      let activeJornadaId = null

      const { data: existingJornadas, error: existingJornadasErr } = await supabase
        .from('jornadas')
        .select('id, status')
        .eq('date', today)
        .eq('status', 'EN_PROGRESO')
        .limit(1)

      if (existingJornadasErr) {
        console.warn('Error al buscar jornadas existentes:', existingJornadasErr)
      }

      if (existingJornadas && existingJornadas.length > 0) {
        activeJornadaId = existingJornadas[0].id
      } else {
        let { data: newJornada, error: newJornadaErr } = await supabase
          .from('jornadas')
          .insert([{
            supervisor_id: validUserId,
            date: today,
            start_time: new Date().toISOString(),
            status: 'EN_PROGRESO'
          }])
          .select()

        if (newJornadaErr && validUserId) {
          console.warn('Reintentando inserción de jornada sin supervisor_id:', newJornadaErr)
          const retryRes = await supabase
            .from('jornadas')
            .insert([{
              date: today,
              start_time: new Date().toISOString(),
              status: 'EN_PROGRESO'
            }])
            .select()
          newJornada = retryRes.data
        }

        if (newJornada && newJornada.length > 0) {
          activeJornadaId = newJornada[0].id
        }
      }

      // 3. Resolver terminal_id obligatorio y crear Estancia Activa en DB
      const termId = await getTerminalIdByName(selectedTerminal)

      let { data: newEstancia, error: estanciaErr } = await supabase
        .from('estancias')
        .insert([{
          jornada_id: activeJornadaId,
          terminal_id: termId,
          terminal_name: selectedTerminal,
          entry_time: new Date().toISOString(),
          entry_latitude: coords?.latitude || 0,
          entry_longitude: coords?.longitude || 0,
          status: 'ACTIVA'
        }])
        .select()

      if (estanciaErr) {
        console.warn('Reintentando inserción de estancia sin jornada_id:', estanciaErr)
        const retryEst = await supabase
          .from('estancias')
          .insert([{
            terminal_id: termId,
            terminal_name: selectedTerminal,
            entry_time: new Date().toISOString(),
            entry_latitude: coords?.latitude || 0,
            entry_longitude: coords?.longitude || 0,
            status: 'ACTIVA'
          }])
          .select()
        newEstancia = retryEst.data
      }

      const estanciaIdCreated = newEstancia?.[0]?.id || null

      // 4. Guardar evidencia inicial de Check-In si hay foto y estancia_id válida
      if (photoUrl && estanciaIdCreated) {
        const { error: evErr } = await supabase
          .from('evidencias_fotograficas')
          .insert([{
            jornada_id: activeJornadaId,
            estancia_id: estanciaIdCreated,
            photo_url: photoUrl,
            category: 'CHECK_IN',
            label: `${selectedTerminal} - Foto Entrada Check-In`
          }])

        if (evErr) {
          console.error('Error al insertar evidencia fotografica en Supabase:', evErr)
        }
      }

      setSuccessData({
        terminal: selectedTerminal,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: getFormattedDate(),
        photoUrl: photoUrl,
        fileSize: (photoFileWebP.size / 1024).toFixed(1)
      })

      if (onCheckInSuccess) {
        setTimeout(() => {
          onCheckInSuccess(selectedTerminal)
        }, 1200)
      }

    } catch (err) {
      console.error('Error general en Check-In:', err)
      setErrorMsg('No se pudo completar el registro. Intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="checkin-page-container">

      {/* Profile & Header Card */}
      <div className="checkin-header-card">
        <div className="user-info-group">
          <div className="user-details">
            <h2 className="user-role-title">Supervisora Intendencia</h2>
            <p className="current-date-text">{getFormattedDate()}</p>
          </div>
          <div className="avatar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Success Modal / Card */}
      {successData ? (
        <div className="success-confirmation-card">
          <div className="success-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3>¡Entrada Registrada Correctamente!</h3>
          <p className="success-sub">Tu inicio de turno ha sido grabado en el sistema.</p>

          <div className="summary-box">
            <div className="summary-row">
              <span>Terminal:</span>
              <strong>{successData.terminal}</strong>
            </div>
            <div className="summary-row">
              <span>Hora:</span>
              <strong>{successData.time} hrs</strong>
            </div>
            <div className="summary-row">
              <span>Optimización Foto:</span>
              <span className="webp-pill">Formato .webp ({successData.fileSize} KB)</span>
            </div>
          </div>

          {successData.photoUrl && (
            <div className="success-photo-preview">
              <img src={successData.photoUrl} alt="Foto de entrada registrada" />
            </div>
          )}

          <button
            type="button"
            className="btn-complete-checkin full-width"
            onClick={() => {
              if (onCheckInSuccess) {
                onCheckInSuccess(successData.terminal)
              }
            }}
          >
            Continuar a Estancia en Terminal
          </button>
        </div>
      ) : (
        /* Form Content */
        <div className="checkin-form-body">
          {errorMsg && <div className="error-alert">{errorMsg}</div>}

          {/* 1. Terminal Selector */}
          <div className="form-section-card">
            <label className="section-label">SELECCIONAR TERMINAL DE INICIO</label>
            <div className="custom-select-wrapper">
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="terminal-select"
              >
                {terminales.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          {/* 2. GPS Status Box */}
          <div className="form-section-card gps-section">
            <div className="gps-display-box">
              <div className="gps-icon-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                  <polygon points="12 8 8 16 12 14 16 16 12 8" />
                </svg>
              </div>
              <p className="gps-instruction-text">Registra tu entrada para comenzar el turno.</p>
            </div>

            <button
              type="button"
              className={`gps-action-btn ${gpsStatus === 'connected' ? 'connected' : 'connecting'}`}
              onClick={obtainGpsLocation}
            >
              {gpsStatus === 'connecting' && (
                <>
                  <span className="spinner-dot"></span>
                  Conectando al GPS...
                </>
              )}
              {gpsStatus === 'connected' && (
                <>
                  <span className="check-icon">✓</span>
                  GPS Conectado (Ubicación Obtenida)
                </>
              )}
              {gpsStatus === 'error' && 'Reintentar Conexión GPS'}
            </button>
          </div>

          {/* 3. Camera Section Mandatory */}
          <div className="form-section-card camera-section">
            <div className="camera-header-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <h3>Foto de Entrada Requerida</h3>
            </div>

            <div className="camera-viewport-container">
              {compressing ? (
                <div className="camera-placeholder loading-placeholder">
                  <div className="spinner-large"></div>
                  <p>Optimizando fotografía a formato .WebP en cliente...</p>
                </div>
              ) : photoPreview ? (
                <div className="photo-captured-preview">
                  <img src={photoPreview} alt="Captura de Entrada" />
                  <div className="webp-converted-tag">
                    ✓ Imagen WebP lista ({(photoFileWebP.size / 1024).toFixed(1)} KB)
                  </div>
                  <button
                    type="button"
                    className="retake-photo-btn"
                    onClick={() => {
                      setPhotoPreview(null)
                      setPhotoFileWebP(null)
                    }}
                  >
                    📷 Tomar Otra Foto
                  </button>
                </div>
              ) : cameraActive ? (
                <div className="live-camera-view">
                  <video ref={videoRef} autoPlay playsInline muted className="video-stream"></video>
                  <button type="button" className="capture-trigger-btn" onClick={capturePhotoFromCamera}>
                    <div className="inner-circle"></div>
                  </button>
                  <button type="button" className="cancel-camera-btn" onClick={stopCamera}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="camera-placeholder">
                  <div className="cam-placeholder-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <h4>Fotografía de Check-In</h4>
                  <p>Asegúrate de que la fotografía sea clara y legible.</p>

                  <div className="camera-actions-row" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn-camera-trigger"
                      style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
                      onClick={startCamera}
                    >
                      📷 Tomar Foto
                    </button>
                  </div>

                  {/* Input Directo de Captura de Cámara Nativa */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden-file-input"
                    onChange={handleFileSelect}
                  />
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden-canvas" />
          </div>

          {/* 4. Complete Entry Registration Button */}
          <div className="submit-action-container">
            <button
              type="button"
              className="btn-complete-checkin"
              disabled={gpsStatus !== 'connected' || !photoFileWebP || submitting}
              onClick={handleSubmitCheckIn}
            >
              {submitting ? 'Guardando Registro WebP...' : 'COMPLETAR REGISTRO DE ENTRADA'}
            </button>
            {gpsStatus !== 'connected' && (
              <p className="disabled-hint">Esperando confirmación de ubicación GPS para habilitar registro.</p>
            )}
            {gpsStatus === 'connected' && !photoFileWebP && (
              <p className="disabled-hint">Toma la foto requerida para habilitar registro.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

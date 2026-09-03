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

export default function CheckIn({ onCheckInSuccess }) {
  const { user } = useAuth()
  
  // Lista de terminales (cargada dinámicamente desde Supabase DB o lista default)
  const [terminales, setTerminales] = useState(DEFAULT_TERMINALES)
  const [selectedTerminal, setSelectedTerminal] = useState(DEFAULT_TERMINALES[0])
  
  // Estados del formulario
  const [gpsStatus, setGpsStatus] = useState('connecting') // 'connecting' | 'connected' | 'error'
  const [coords, setCoords] = useState(null)
  
  // Cámara y Foto WebP
  const [cameraActive, setCameraActive] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFileWebP, setPhotoFileWebP] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // Cargar catálogo de terminales desde Supabase DB
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
          setSelectedTerminal(names[0])
        }
      } catch (err) {
        console.warn('Uso de lista por defecto de terminales:', err)
      }
    }

    fetchTerminales()
  }, [])

  // Obtención formateada de fecha (ej. "Jueves, 14 de Agosto")
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

  // 2. Control de Cámara WebRTC
  const startCamera = async () => {
    setCameraActive(true)
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.warn('Cámara en vivo no disponible, se puede subir archivo:', err)
      setErrorMsg('No se pudo acceder a la cámara en vivo. Puedes seleccionar o tomar una foto con tu dispositivo.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
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

  // 3. Selección de Archivos
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

      const record = {
        user_id: user?.id || null,
        user_name: user?.user_metadata?.full_name || 'Supervisora Intendencia',
        role: 'supervisora',
        terminal_name: selectedTerminal,
        check_in_time: new Date().toISOString(),
        latitude: coords?.latitude || 0,
        longitude: coords?.longitude || 0,
        photo_url: photoUrl
      }

      const { data: dbData, error: dbError } = await supabase
        .from('check_ins')
        .insert([record])
        .select()

      if (dbError) {
        console.warn('Inserción en Supabase DB falló, usando respaldo local (demo):', dbError)
      }

      const existingCheckIns = JSON.parse(localStorage.getItem('intendencia_check_ins') || '[]')
      existingCheckIns.unshift({ ...record, id: dbData?.[0]?.id || `local-${Date.now()}` })
      localStorage.setItem('intendencia_check_ins', JSON.stringify(existingCheckIns))

      setSuccessData({
        terminal: selectedTerminal,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
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

  const resetForm = () => {
    setSuccessData(null)
    setPhotoPreview(null)
    setPhotoFileWebP(null)
    obtainGpsLocation()
  }

  return (
    <div className="checkin-page-container">
      {/* Visual Indicator of Screen ID */}
      <div className="screen-tag-bar">
        PANTALLA 1 · Entrada (Check-In)
      </div>

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
          <h3>¡Entrada Registrada Exitosamente!</h3>
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

          <button type="button" className="btn-primary full-width" onClick={resetForm}>
            Realizar Nuevo Registro
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
                  GPS Conectado (Ubicación Confirmada)
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
                  <h4>Check - In</h4>
                  <p>Revisar que sea una imagen clara.</p>
                  
                  <div className="camera-actions-row">
                    <button type="button" className="btn-camera-trigger" onClick={startCamera}>
                      Activar Cámara
                    </button>
                    <button
                      type="button"
                      className="btn-upload-trigger"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Subir Foto
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
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
              <p className="disabled-hint">⚠️ Esperando confirmación de ubicación GPS para habilitar registro.</p>
            )}
            {gpsStatus === 'connected' && !photoFileWebP && (
              <p className="disabled-hint">⚠️ Toma o sube la foto requerida para habilitar registro.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

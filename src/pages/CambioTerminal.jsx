import { useCallback, useState } from 'react'

const TERMINALES = [
  'Terminal Haciendita',
  'Terminal Las Torres',
  'Terminal Naolinco',
  'Terminal Pipila',
  'Terminal 3 d Mayo',
  'Terminal San Miguel',
  'Terminal Misantla',
  'Terminal Vicente Guerrero',
  'Terminal Actopan'
]

export default function CambioTerminal({ onCambiarTerminal, onFinalizarJornada }) {
  const [selectedTerminal, setSelectedTerminal] = useState(TERMINALES[0])
  const [gpsStatus, setGpsStatus] = useState('unverified') // 'unverified' | 'verifying' | 'verified'
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const verifyGps = useCallback(() => {
    setGpsStatus('verifying')
    setTimeout(() => {
      setGpsStatus('verified')
    }, 1200)
  }, [])

  const handleRegistrarCambio = () => {
    if (gpsStatus !== 'verified') return
    onCambiarTerminal(selectedTerminal)
  }

  return (
    <div className="cambio-terminal-container">
      <div className="screen-tag-bar">
        PANTALLA 3 · Cambio de Terminal / Fin de Día
      </div>

      {/* Card 1: Cambio de Terminal */}
      <div className="form-section-card transition-card">
        <h3>Seleccionar Nueva Terminal</h3>
        
        <div className="custom-select-wrapper margin-v">
          <select
            value={selectedTerminal}
            onChange={(e) => setSelectedTerminal(e.target.value)}
            className="terminal-select"
          >
            {TERMINALES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="select-arrow">▼</div>
        </div>

        <button
          type="button"
          className={`btn-verify-gps ${gpsStatus}`}
          onClick={verifyGps}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12 8 8 16 12 14 16 16 12 8" />
          </svg>
          {gpsStatus === 'unverified' && 'VERIFICAR GPS'}
          {gpsStatus === 'verifying' && 'Verificando GPS...'}
          {gpsStatus === 'verified' && '✓ GPS VERIFICADO'}
        </button>

        <button
          type="button"
          className="btn-cambio-terminal"
          disabled={gpsStatus !== 'verified'}
          onClick={handleRegistrarCambio}
        >
          🔄 REGISTRAR CAMBIO DE TERMINAL
        </button>
      </div>

      <div className="visual-or-divider">o</div>

      {/* Card 2: Finalizar Jornada */}
      <div className="form-section-card finish-card">
        <div className="finish-header">
          <div className="finish-icon">➔</div>
          <h3>Finalizar Jornada</h3>
        </div>

        <p className="finish-subtext">
          Al marcar salida total, se cerrará tu registro de asistencia por hoy.
        </p>

        <button
          type="button"
          className="btn-finish-day"
          onClick={() => setShowConfirmModal(true)}
        >
          ⛔ TERMINAR DÍA (SALIDA TOTAL)
        </button>
      </div>

      {/* Modal de Confirmación Irreversible */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-warning-icon">⚠️</div>
            <h3>Confirmar Cierre de Jornada</h3>
            <p>
              ¿Está segura de finalizar su jornada de trabajo por hoy? Esta acción cerrará el registro de asistencia del día.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel-modal"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-confirm-modal"
                onClick={() => {
                  setShowConfirmModal(false)
                  onFinalizarJornada()
                }}
              >
                Sí, Finalizar Jornada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

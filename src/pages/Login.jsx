import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import logoIntendencia from '../logo_intendencia.jpg'

export default function Login() {
  const { loginWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      await loginWithEmail(email, password)
    } catch (err) {
      console.error('Error de autenticación en Supabase:', err)
      
      let errorText = 'Credenciales inválidas. Por favor verifica tu correo y contraseña.'
      if (err.message === 'Invalid login credentials') {
        errorText = 'La contraseña o el correo electrónico introducidos no son correctos.'
      } else if (err.message) {
        errorText = err.message
      }
      
      setErrorMsg(errorText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Branding Header */}
        <div className="login-brand">
          <div className="brand-logo">
            <img
              src={logoIntendencia}
              style={{ width: '130px', height: '90px', borderRadius: '3%', border: '2px solid #ffffffff' }}
              alt="Intendencia"
            />
          </div>
          <h1>Sistema de Intendencia</h1>
        </div>

        {errorMsg && (
          <div className="error-alert">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="credentials-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              required
              placeholder="Ingresa tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              placeholder="*******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn full-width" disabled={loading}>
            {loading ? 'Verificando en Supabase...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    </div>
  )
}

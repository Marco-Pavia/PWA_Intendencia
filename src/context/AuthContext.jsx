import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ROLES, ROLE_LABELS } from './roles'

const AuthContext = createContext()

export { ROLES, ROLE_LABELS }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(ROLES.SUPERVISORA)
  const [loading, setLoading] = useState(true)

  // Función para obtener y asignar automáticamente el rol del usuario desde Supabase
  const fetchAndSetUserRole = async (sessionUser) => {
    if (!sessionUser) return ROLES.SUPERVISORA

    try {
      // 1. Intentar consultar en la tabla public.profiles de Supabase
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', sessionUser.id)
        .single()

      if (profile && profile.role) {
        console.log(`[Auth] Rol leído de la BD Supabase para ${sessionUser.email}:`, profile.role)
        setRole(profile.role)
        return profile.role
      }

      if (error) {
        console.warn('[Auth] No se encontró perfil en BD o hubo error, verificando metadata:', error.message)
      }

      // 2. Si no hay fila en profiles, leer de user_metadata o por defecto según el correo
      let fallbackRole = sessionUser.user_metadata?.role
      if (!fallbackRole) {
        if (sessionUser.email?.toLowerCase().includes('jefe')) {
          fallbackRole = ROLES.JEFE
        } else {
          fallbackRole = ROLES.SUPERVISORA
        }
      }

      // Intentar autocrear la fila de perfil en Supabase
      await supabase.from('profiles').upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0],
        role: fallbackRole
      })

      setRole(fallbackRole)
      return fallbackRole
    } catch (err) {
      console.error('[Auth] Error al determinar el rol del usuario:', err)
      setRole(ROLES.SUPERVISORA)
      return ROLES.SUPERVISORA
    }
  }

  useEffect(() => {
    // Inicializar verificación de sesión
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchAndSetUserRole(session.user)
        } else {
          // Si hay sesión demo guardada
          const savedDemoUser = localStorage.getItem('intendencia_demo_user')
          if (savedDemoUser) {
            const parsed = JSON.parse(savedDemoUser)
            setUser(parsed.user)
            setRole(parsed.role)
          }
        }
      } catch (err) {
        console.warn('Error inicializando autenticación:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Escuchar cambios de estado en Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchAndSetUserRole(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Inicio de sesión por Email y Contraseña (con lectura automática de rol)
  const loginWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    if (data.user) {
      setUser(data.user)
      const detectedRole = await fetchAndSetUserRole(data.user)
      return { user: data.user, role: detectedRole }
    }
    return data
  }

  // Demo Login directo para facilidades de desarrollo/pruebas
  const loginAsRole = (selectedRole) => {
    const isJefe = selectedRole === ROLES.JEFE
    const demoUser = {
      id: isJefe ? 'demo-jefe-01' : 'demo-supervisora-01',
      email: isJefe ? 'jefe@intendencia.com' : 'supervisora@intendencia.com',
      user_metadata: {
        full_name: isJefe ? 'Jefe Inmediato Directo' : 'Supervisora Intendencia'
      }
    }
    setUser(demoUser)
    setRole(selectedRole)
    localStorage.setItem('intendencia_demo_user', JSON.stringify({ user: demoUser, role: selectedRole }))
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignorar error si es demo local
    }
    setUser(null)
    localStorage.removeItem('intendencia_demo_user')
  }

  const switchRole = (newRole) => {
    setRole(newRole)
    if (user && user.id?.startsWith('demo-')) {
      const isJefe = newRole === ROLES.JEFE
      const updatedUser = {
        ...user,
        email: isJefe ? 'jefe@intendencia.com' : 'supervisora@intendencia.com',
        user_metadata: {
          full_name: isJefe ? 'Jefe Inmediato Directo' : 'Supervisora Intendencia'
        }
      }
      setUser(updatedUser)
      localStorage.setItem('intendencia_demo_user', JSON.stringify({ user: updatedUser, role: newRole }))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roleLabel: ROLE_LABELS[role] || 'Usuario',
        loading,
        loginWithEmail,
        loginAsRole,
        logout,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

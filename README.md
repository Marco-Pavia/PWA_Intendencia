# 📱 Sistema de Intendencia PWA

Aplicación web progresiva (PWA) desarrollada con **React**, **Vite**, **Supabase** (Autenticación, Base de Datos y Storage con optimización cliente a WebP) y **Vercel** para la supervisión y control de turnos de intendencia.

---

## 🌟 Características Principales

1. **Manejo de Roles**:
   - **Supervisora Intendencia** (Check-In, Estancia, Cambio de Terminal, Calendarización de Actividades).
   - **Jefe Inmediato** (Estatus de Jornada, Histórico de Recorrido, Resumen Quincenal, Calendario de Horas).
2. **PWA Instalable**:
   - Manifiesto Web completo, Service Worker y banner de instalación para pantallas de inicio móviles e iOS/Android.
3. **Pantalla 1 · Entrada (Check-In)**:
   - Selector desplegable de terminal de inicio (ej. Terminal Pípila).
   - Validación de GPS (coordenadas en tiempo real y confirmación de estado).
   - Módulo de cámara obligatoria con captura en vivo o selector de archivos.
   - **Conversión a WebP en el Cliente**: Procesa y comprime automáticamente las imágenes capturadas a formato `.webp` en el navegador antes de enviarlas a Supabase Storage.
4. **Respaldo Inteligente (Demo Mode)**:
   - En caso de trabajar offline o sin conexión directa a Supabase Cloud, la app mantiene funcionalidad completa con persistencia en `localStorage`.

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos
- Node.js >= 18
- Cuenta en [Supabase](https://supabase.com) y [Vercel](https://vercel.com)

### 2. Instalación Local
```bash
# Clonar o entrar al repositorio
cd intendencia-app

# Instalación de dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```

### 3. Configuración de Supabase
Crear un archivo `.env.local` con las credenciales de tu proyecto Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

Ejecutar el script [supabase_schema.sql](file:///c:/software/intendencia/intendencia-app/supabase_schema.sql) en el **SQL Editor** de Supabase para inicializar las tablas `profiles`, `check_ins` y el bucket `checkin-photos`.

---

## 📦 Despliegue en Vercel y GitHub

### 1. Repositorio en GitHub
```bash
git init
git add .
git commit -m "feat: Sistema de Intendencia PWA con Supabase, WebP y Pantalla 1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/intendencia-app.git
git push -u origin main
```

### 2. Despliegue en Vercel
1. Ingresa a [Vercel Dashboard](https://vercel.com/new).
2. Importa el repositorio de GitHub `intendencia-app`.
3. Configura las variables de entorno en el panel de Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Haz clic en **Deploy**. El archivo `vercel.json` incluido resolverá automáticamente las rutas de la Single Page Application (SPA).

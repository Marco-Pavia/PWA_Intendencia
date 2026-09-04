-- ====================================================================
-- ESQUEMA RELACIONAL INTEGRAL - SISTEMA DE INTENDENCIA (PANTALLAS 1 A 9)
-- Soporta los roles: 'supervisora' (Jefa de Intendencia) y 'jefe' (Jefe Inmediato)
-- ====================================================================

-- 1. Tabla de Perfiles de Usuario con Roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'supervisora' CHECK (role IN ('supervisora', 'jefe')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Catálogo de Terminales
CREATE TABLE IF NOT EXISTS public.terminales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar terminales de catálogo por defecto
INSERT INTO public.terminales (name, code) VALUES
  ('Terminal Pipila', 'TERM-PIPILA'),
  ('Terminal Haciendita', 'TERM-HACIENDITA'),
  ('Terminal Las Torres', 'TERM-TORRES'),
  ('Terminal Naolinco', 'TERM-NAOLINCO'),
  ('Terminal 3 d Mayo', 'TERM-3DMAYO'),
  ('Terminal San Miguel', 'TERM-SANMIGUEL'),
  ('Terminal Misantla', 'TERM-MISANTLA'),
  ('Terminal Vicente Guerrero', 'TERM-VICENTEGUERRERO'),
  ('Terminal Actopan', 'TERM-ACTOPAN')
ON CONFLICT (name) DO NOTHING;

-- 3. Catálogo de Departamentos (para Pantalla 8)
CREATE TABLE IF NOT EXISTS public.departamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.departamentos (name, code) VALUES
  ('Recaudación', 'DEP-RECAUDACION'),
  ('Taquilla Ordinario', 'DEP-TAQUILLA'),
  ('Sanitarios', 'DEP-SANITARIOS'),
  ('Despacho', 'DEP-DESPACHO'),
  ('Salas de Espera', 'DEP-ESPERA'),
  ('Áreas Generales', 'DEP-GENERAL')
ON CONFLICT (name) DO NOTHING;

-- 4. Tabla de Check-Ins / Entradas de Turno (Pantalla 1)
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  role TEXT DEFAULT 'supervisora',
  terminal_name TEXT NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Jornadas Laborales (Turnos Diarios)
CREATE TABLE IF NOT EXISTS public.jornadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_estancia_minutes INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'EN_PROGRESO' CHECK (status IN ('EN_PROGRESO', 'FINALIZADA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de Estancias en Terminales (Pantallas 2 y 3)
CREATE TABLE IF NOT EXISTS public.estancias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jornada_id UUID REFERENCES public.jornadas(id) ON DELETE CASCADE,
  terminal_id UUID REFERENCES public.terminales(id) ON DELETE RESTRICT,
  terminal_name TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  entry_latitude NUMERIC(10, 7),
  entry_longitude NUMERIC(10, 7),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'FINALIZADA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla de Evidencias Fotográficas WebP
CREATE TABLE IF NOT EXISTS public.evidencias_fotograficas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estancia_id UUID REFERENCES public.estancias(id) ON DELETE CASCADE,
  jornada_id UUID REFERENCES public.jornadas(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'SUPERVISION' CHECK (category IN ('CHECK_IN', 'CHECK_OUT', 'LIMPIEZA', 'MANTENIMIENTO', 'SUPERVISION', 'OTRO')),
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabla de Actividades Programadas / Calendarización (Pantallas 8 y 9)
CREATE TABLE IF NOT EXISTS public.actividades_programadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  terminal_id UUID REFERENCES public.terminales(id) ON DELETE RESTRICT,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PROGRAMADO' CHECK (status IN ('PROGRAMADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- CONTROL DE ACCESO (ROW LEVEL SECURITY - RLS POR ROL)
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_fotograficas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_programadas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Lectura de perfiles" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Lectura de terminales" ON public.terminales FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Lectura de departamentos" ON public.departamentos FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Lectura de check_ins" ON public.check_ins FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Inserción de check_ins" ON public.check_ins FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Lectura de jornadas por autenticados" ON public.jornadas FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Escritura de jornadas para supervisora" ON public.jornadas FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Lectura de estancias por autenticados" ON public.estancias FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Escritura de estancias para supervisora" ON public.estancias FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Lectura de evidencias" ON public.evidencias_fotograficas FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Inserción de evidencias" ON public.evidencias_fotograficas FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Lectura de actividades para jefe y supervisora" ON public.actividades_programadas FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Gestión de actividades programadas para supervisora" ON public.actividades_programadas FOR ALL TO authenticated, anon USING (true);

-- ====================================================================
-- TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ====================================================================

-- 1. Trigger de Autocreación de Perfil en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'supervisora')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger para Calcular Duración de Estancia en Minutos
CREATE OR REPLACE FUNCTION public.update_estancia_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
    NEW.duration_minutes := ROUND(EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 60);
    NEW.status := 'FINALIZADA';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_estancia_closed ON public.estancias;
CREATE TRIGGER on_estancia_closed
  BEFORE UPDATE ON public.estancias
  FOR EACH ROW EXECUTE FUNCTION public.update_estancia_duration();

-- ====================================================================
-- VISTAS SQL REUTILIZABLES PARA REPORTES (PANTALLAS 6 Y 7)
-- ====================================================================

-- Vista de resumen diario acumulado (horas totales por día y estatus)
CREATE OR REPLACE VIEW public.v_resumen_diario_jornadas AS
SELECT 
  j.id AS jornada_id,
  j.supervisor_id,
  p.full_name AS supervisor_name,
  j.date,
  j.start_time,
  j.end_time,
  COALESCE(SUM(e.duration_minutes), 0) AS total_minutes,
  ROUND(COALESCE(SUM(e.duration_minutes), 0) / 60.0, 2) AS total_hours,
  CASE 
    WHEN COALESCE(SUM(e.duration_minutes), 0) >= 480 THEN 'COMPLETO'
    WHEN j.end_time IS NOT NULL AND COALESCE(SUM(e.duration_minutes), 0) < 479 THEN 'INCOMPLETO'
    WHEN EXTRACT(HOUR FROM j.end_time) >= 17 THEN 'SALIDA_TARDIA'
    ELSE 'EN_PROGRESO'
  END AS day_status
FROM public.jornadas j
JOIN public.profiles p ON j.supervisor_id = p.id
LEFT JOIN public.estancias e ON e.jornada_id = j.id
GROUP BY j.id, j.supervisor_id, p.full_name, j.date, j.start_time, j.end_time;

-- ====================================================================
-- CONFIGURACIÓN DE BUCKET DE STORAGE PARA FOTOS WEBP
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Subida de fotos WebP" ON storage.objects FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'checkin-photos');
CREATE POLICY "Lectura pública de fotos WebP" ON storage.objects FOR SELECT TO authenticated, anon USING (bucket_id = 'checkin-photos');

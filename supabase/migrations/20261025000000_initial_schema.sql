-- ==============================================================================
-- Öğrenci Haftalık Puan Takip Sistemi - Supabase PostgreSQL Şeması ve RLS Kuralları
-- ==============================================================================

-- 1. UUID Uzantısı
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiller Tablosu (auth.users ile senkronize)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  student_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Sınıflar Tablosu
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Dersler Tablosu
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Sınıf - Ders İlişkisi Tablosu
CREATE TABLE IF NOT EXISTS public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_class_subject UNIQUE (class_id, subject_id)
);

-- 6. Öğrenci Kayıtları (Enrollments)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_student_class_subject UNIQUE (student_id, class_id, subject_id)
);

-- 7. Haftalık Çalışmalar ve Etkinlikler (Weekly Activities)
CREATE TABLE IF NOT EXISTS public.weekly_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  activity_date DATE DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (max_score > 0),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Puanlar Tablosu (Grades)
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.weekly_activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
  comment TEXT,
  entered_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_activity_student UNIQUE (activity_id, student_id)
);

-- Puan doğrulama fonksiyonu: score <= weekly_activities.max_score
CREATE OR REPLACE FUNCTION public.check_grade_score_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_score NUMERIC;
BEGIN
  SELECT max_score INTO v_max_score FROM public.weekly_activities WHERE id = NEW.activity_id;
  IF v_max_score IS NOT NULL AND NEW.score > v_max_score THEN
    RAISE EXCEPTION 'Girilen puan (%) etkinliğin en yüksek puanını (%) aşamaz!', NEW.score, v_max_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_grade_score ON public.grades;
CREATE TRIGGER trg_check_grade_score
  BEFORE INSERT OR UPDATE OF score, activity_id ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.check_grade_score_limit();

-- Güvenli Kullanıcı Rolü Sorgulama Fonksiyonu (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Yeni Kayıt Olan Kullanıcı İçin Profil Tetikleyicisi
-- NOT: Yeni kullanıcılar zorunlu olarak 'student' rolüyle başlatılır, 'teacher' rolüne kendi kendini yükseltemez.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role, student_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Yeni'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Öğrenci'),
    'student', -- Güvenlik kuralı: Dışarıdan rol override edilemez
    NEW.raw_user_meta_data->>'student_number'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS
-- Öğrenci sadece kendi profilini görebilir; Öğretmen tüm profilleri listeleyebilir
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id OR public.get_user_role() = 'teacher'
  );

-- Kullanıcı sadece kendi adını/soyadını güncelleyebilir, ROLÜNÜ DEĞİŞTİREMEZ
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Yeni kaydolan kullanıcının öğrenci profilini ekleyebilmesine izin ver
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id AND role = 'student'
  );

-- 2. CLASSES RLS
-- Öğretmen sınıfları görebilir ve yönetebilir
CREATE POLICY "classes_teacher_all" ON public.classes
  FOR ALL
  USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

-- Öğrenci yalnızca kayıtlı olduğu sınıfları görebilir
CREATE POLICY "classes_student_select" ON public.classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = classes.id AND e.student_id = auth.uid()
    )
  );

-- 3. SUBJECTS RLS
-- Öğretmen dersleri görebilir ve yönetebilir
CREATE POLICY "subjects_teacher_all" ON public.subjects
  FOR ALL
  USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

-- Öğrenci yalnızca kayıtlı olduğu dersleri görebilir
CREATE POLICY "subjects_student_select" ON public.subjects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.subject_id = subjects.id AND e.student_id = auth.uid()
    )
  );

-- 4. CLASS_SUBJECTS RLS
CREATE POLICY "class_subjects_teacher_all" ON public.class_subjects
  FOR ALL
  USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

CREATE POLICY "class_subjects_student_select" ON public.class_subjects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = class_subjects.class_id
        AND e.subject_id = class_subjects.subject_id
        AND e.student_id = auth.uid()
    )
  );

-- 5. ENROLLMENTS RLS
-- Öğretmen kayıtları yönetebilir
CREATE POLICY "enrollments_teacher_all" ON public.enrollments
  FOR ALL
  USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

-- Öğrenci yalnızca kendi kayıtlarını görebilir
CREATE POLICY "enrollments_student_select" ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- 6. WEEKLY_ACTIVITIES RLS
-- Öğretmen etkinlikleri yönetebilir
CREATE POLICY "weekly_activities_teacher_all" ON public.weekly_activities
  FOR ALL
  USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

-- Öğrenci kayıtlı olduğu ders ve sınıftaki etkinlikleri görebilir
CREATE POLICY "weekly_activities_student_select" ON public.weekly_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = weekly_activities.class_id
        AND e.subject_id = weekly_activities.subject_id
        AND e.student_id = auth.uid()
    )
  );

-- 7. GRADES RLS (EN KRİTİK GÜVENLİK ALANI)
-- Öğretmen sorumlu olduğu etkinliklerin puanlarını yönetebilir
CREATE POLICY "grades_teacher_manage" ON public.grades
  FOR ALL
  USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

-- Öğrenci KESİNLİKLE VE YALNIZCA KENDİ PUANINI GÖREBİLİR (BAŞKA ÖĞRENCİYİ ASLA GÖREMEZ)
-- Öğrenci puan ekleyemez, güncelleyemez, silemez!
CREATE POLICY "grades_student_select_own" ON public.grades
  FOR SELECT
  USING (student_id = auth.uid());

-- ==============================================================================
-- TOPLU PUAN GİRİŞİ TRANSACTION FONKSİYONU
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.bulk_upsert_grades(
  p_activity_id UUID,
  p_grades_json JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_item JSONB;
  v_saved_count INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
  v_score NUMERIC;
  v_student_id UUID;
  v_comment TEXT;
  v_max_score NUMERIC;
BEGIN
  -- Öğretmen yetkisi kontrolü
  IF public.get_user_role() <> 'teacher' THEN
    RAISE EXCEPTION 'Bu işlemi sadece yetkili öğretmenler gerçekleştirebilir.';
  END IF;

  v_teacher_id := auth.uid();

  -- Etkinliğin maksimum puanını doğrula
  SELECT max_score INTO v_max_score FROM public.weekly_activities WHERE id = p_activity_id;
  IF v_max_score IS NULL THEN
    RAISE EXCEPTION 'Haftalık çalışma bulunamadı.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_grades_json)
  LOOP
    v_student_id := (v_item->>'student_id')::uuid;
    v_score := (v_item->>'score')::numeric;
    v_comment := v_item->>'comment';

    -- Doğrulama: Puan sınırları
    IF v_score < 0 OR v_score > v_max_score THEN
      v_errors := v_errors || jsonb_build_object(
        'student_id', v_student_id,
        'error', format('Puan 0 ile %s arasında olmalıdır.', v_max_score)
      );
      CONTINUE;
    END IF;

    -- Upsert işlemi
    INSERT INTO public.grades (activity_id, student_id, score, comment, entered_by, updated_at)
    VALUES (p_activity_id, v_student_id, v_score, v_comment, v_teacher_id, timezone('utc'::text, now()))
    ON CONFLICT (activity_id, student_id)
    DO UPDATE SET
      score = EXCLUDED.score,
      comment = EXCLUDED.comment,
      entered_by = EXCLUDED.entered_by,
      updated_at = timezone('utc'::text, now());

    v_saved_count := v_saved_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'saved_count', v_saved_count,
    'errors', v_errors
  );
END;
$$;

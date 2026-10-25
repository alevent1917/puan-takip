import React, { useState } from 'react';
import { Database, Copy, Check, Terminal, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';

export const SqlSetupView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, sqlText: string) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const FULL_SQL = `-- ==============================================================================
-- ÖĞRENCİ HAFTALIK PUAN TAKİP SİSTEMİ - SUPABASE TAM SQL MIGRATION
-- Çalıştırma Yeri: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. UUID Uzantısı
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiller Tablosu (auth.users ile senkron)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
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

-- 5. Sınıf - Ders Eşleştirme Tablosu
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

-- 7. Haftalık Çalışmalar ve Etkinlikler Tablosu
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

-- İndeksler (Sorgu performansı ve hızlı filtreleme için)
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_activity_id ON public.grades(activity_id);
CREATE INDEX IF NOT EXISTS idx_activities_class_subject ON public.weekly_activities(class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);

-- Puan Doğrulama Tetikleyici Fonksiyonu (Etkinliğin max_score sınırını aşamaz)
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

-- Güvenli Rol Sorgulama Fonksiyonu (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Yeni Kayıt Olan Kullanıcılar İçin Profil Tetikleyicisi (Varsayılan daima 'student')
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
    'student', -- Öğrenci rolü zorunludur
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

-- Profiller: Öğrenci sadece kendisini görür, Öğretmen hepsini görebilir
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.get_user_role() = 'teacher');

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- Sınıflar: Öğretmen yönetir, öğrenci kayıtlı olduğu sınıfı görür
CREATE POLICY "classes_teacher_all" ON public.classes
  FOR ALL USING (public.get_user_role() = 'teacher');

CREATE POLICY "classes_student_select" ON public.classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = classes.id AND e.student_id = auth.uid())
  );

-- Dersler: Öğretmen yönetir, öğrenci kayıtlı olduğu dersi görür
CREATE POLICY "subjects_teacher_all" ON public.subjects
  FOR ALL USING (public.get_user_role() = 'teacher');

CREATE POLICY "subjects_student_select" ON public.subjects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.subject_id = subjects.id AND e.student_id = auth.uid())
  );

-- Sınıf - Ders İlişkisi
CREATE POLICY "class_subjects_teacher_all" ON public.class_subjects
  FOR ALL USING (public.get_user_role() = 'teacher');

CREATE POLICY "class_subjects_student_select" ON public.class_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e 
      WHERE e.class_id = class_subjects.class_id 
        AND e.subject_id = class_subjects.subject_id 
        AND e.student_id = auth.uid()
    )
  );

-- Kayıtlar (Enrollments)
CREATE POLICY "enrollments_teacher_all" ON public.enrollments
  FOR ALL USING (public.get_user_role() = 'teacher');

CREATE POLICY "enrollments_student_select" ON public.enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Haftalık Çalışmalar
CREATE POLICY "weekly_activities_teacher_all" ON public.weekly_activities
  FOR ALL USING (public.get_user_role() = 'teacher');

CREATE POLICY "weekly_activities_student_select" ON public.weekly_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e 
      WHERE e.class_id = weekly_activities.class_id 
        AND e.subject_id = weekly_activities.subject_id 
        AND e.student_id = auth.uid()
    )
  );

-- Puanlar (Grades): Öğrenci KESİNLİKLE sadece kendi puanını görebilir!
CREATE POLICY "grades_teacher_manage" ON public.grades
  FOR ALL USING (public.get_user_role() = 'teacher')
  WITH CHECK (public.get_user_role() = 'teacher');

CREATE POLICY "grades_student_select_own" ON public.grades
  FOR SELECT USING (student_id = auth.uid());

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
  IF public.get_user_role() <> 'teacher' THEN
    RAISE EXCEPTION 'Bu işlemi sadece yetkili öğretmenler gerçekleştirebilir.';
  END IF;

  v_teacher_id := auth.uid();

  SELECT max_score INTO v_max_score FROM public.weekly_activities WHERE id = p_activity_id;
  IF v_max_score IS NULL THEN
    RAISE EXCEPTION 'Haftalık çalışma bulunamadı.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_grades_json)
  LOOP
    v_student_id := (v_item->>'student_id')::uuid;
    v_score := (v_item->>'score')::numeric;
    v_comment := v_item->>'comment';

    IF v_score < 0 OR v_score > v_max_score THEN
      v_errors := v_errors || jsonb_build_object(
        'student_id', v_student_id,
        'error', format('Puan 0 ile %s arasında olmalıdır.', v_max_score)
      );
      CONTINUE;
    END IF;

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
$$;`;

  const PROMOTE_TEACHER_SQL = `-- İlk Öğretmen Hesabını Yetkilendirme (Kayıt olduktan sonra çalıştırın)
UPDATE public.profiles
SET role = 'teacher'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ogretmen@okul.k12.tr'
);`;

  const SEED_SQL = `-- 1. Örnek Sınıfları Oluştur (10/A, 10/B, 11/A)
INSERT INTO public.classes (id, name, school_year) VALUES
  ('a1111111-1111-1111-1111-111111111111', '10/A', '2026-2027'),
  ('a2222222-2222-2222-2222-222222222222', '10/B', '2026-2027'),
  ('a3333333-3333-3333-3333-333333333333', '11/A', '2026-2027')
ON CONFLICT (id) DO NOTHING;

-- 2. En son kayıt olan kullanıcıyı öğretmen yap ve örnek dersleri bağla
DO $$
DECLARE
  v_teacher_id UUID;
BEGIN
  SELECT id INTO v_teacher_id FROM auth.users ORDER BY created_at DESC LIMIT 1;

  IF v_teacher_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (v_teacher_id, 'Öğretmen', 'Yönetici', 'teacher')
    ON CONFLICT (id) DO UPDATE SET role = 'teacher';

    INSERT INTO public.subjects (id, name, description, teacher_id) VALUES
      ('b1111111-1111-1111-1111-111111111111', 'Yazılım Geliştirme', 'Algoritmalar ve Web Mimarisi', v_teacher_id),
      ('b2222222-2222-2222-2222-222222222222', 'İleri Matematik', 'Fonksiyonlar ve Analitik Geometri', v_teacher_id),
      ('b3333333-3333-3333-3333-333333333333', 'Fizik Lab', 'Kuvvet ve Enerji Uygulamaları', v_teacher_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.class_subjects (class_id, subject_id) VALUES
      ('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'),
      ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'),
      ('a2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111')
    ON CONFLICT (class_id, subject_id) DO NOTHING;
  END IF;
END $$;`;

  return (
    <div className="space-y-6">
      {/* Başlık ve Genel Bilgi */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-700" />
              <span>Supabase Veritabanı Kurulum ve Adım Adım SQL Kılavuzu</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tabloların, tetikleyicilerin, RLS politikalarının ve fonksiyonların Supabase üzerinde gerçekten oluşturulması için izlenecek adımlar.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard('full', FULL_SQL)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            {copiedKey === 'full' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>Tüm SQL Kodunu Tek Tıkla Kopyala</span>
          </button>
        </div>
      </div>

      {/* Adım Adım Talimatlar Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Supabase Dashboard'a Giriş</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-slate-900 font-semibold underline inline-flex items-center gap-1"
            >
              supabase.com/dashboard <ExternalLink className="w-3 h-3" />
            </a> adresine gidin ve projenizi seçin.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
            <span>SQL Editor Sekmesini Açın</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Sol menüdeki <strong>SQL Editor</strong> simgesine tıklayın ve ardından <strong>New query</strong> (+ Yeni Sorgu) butonuna basın.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Yapıştırın ve "Run"a Basın</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Aşağıdaki SQL kodunu editöre yapıştırın ve sağ alttaki yeşil <strong>Run</strong> butonuna tıklayın. 1 saniye içinde tüm yapı hazır olur!
          </p>
        </div>
      </div>

      {/* İlk Öğretmen Hesabını Yetkilendirme SQL'i */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Kritik Adım: İlk Öğretmen Hesabını Atama</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Güvenlik gereği yeni kayıt olan herkes varsayılan <code>student</code> rolü alır. İlk öğretmen hesabını açtıktan sonra SQL Editor'de şu sorguyu çalıştırarak rolünü yükseltin:
            </p>
          </div>
          <button
            onClick={() => copyToClipboard('promote', PROMOTE_TEACHER_SQL)}
            className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 font-medium"
          >
            {copiedKey === 'promote' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Kopyala</span>
          </button>
        </div>

        <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
{PROMOTE_TEACHER_SQL}
        </pre>
      </div>

      {/* Örnek Sınıflar ve Dersler (Seed Data) SQL'i */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-700" />
              <span>Örnek Sınıfları ve Dersleri Veritabanına Yükleme (Seed Data)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Veritabanınız tamamen boşsa, 10/A, 10/B sınıflarını ve örnek dersleri tek seferde eklemek için bu kodu SQL Editor'de çalıştırın:
            </p>
          </div>
          <button
            onClick={() => copyToClipboard('seed', SEED_SQL)}
            className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 font-medium"
          >
            {copiedKey === 'seed' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Kodu Kopyala</span>
          </button>
        </div>

        <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
{SEED_SQL}
        </pre>
      </div>

      {/* Tam SQL Kodu Görüntüleyici */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-900">
              Tam Migration SQL Kodu (Tablolar + Tetikleyiciler + RLS Kuralları + Fonksiyon)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Dosya: supabase/migrations/20261025000000_initial_schema.sql
          </span>
        </div>

        <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs max-h-[500px] overflow-y-auto leading-relaxed">
          <pre>{FULL_SQL}</pre>
        </div>
      </div>
    </div>
  );
};

-- ==============================================================================
-- ÖĞRENCİ HAFTALIK PUAN TAKİP SİSTEMİ - SUPABASE BAŞLANGIÇ VERİLERİ (SEED SQL)
-- Supabase Dashboard -> SQL Editor alanına yapıştırıp "Run" butonuna basın.
-- ==============================================================================

-- 1. Örnek Sınıfları Oluştur
INSERT INTO public.classes (id, name, school_year) VALUES
  ('a1111111-1111-1111-1111-111111111111', '10/A', '2026-2027'),
  ('a2222222-2222-2222-2222-222222222222', '10/B', '2026-2027'),
  ('a3333333-3333-3333-3333-333333333333', '11/A', '2026-2027')
ON CONFLICT (id) DO NOTHING;

-- 2. İlk Kayıtlı Kullanıcıyı Öğretmen Olarak Yetkilendir
-- (Eğer henüz üye olduysanız, en son kayıt olan kullanıcıyı otomatik öğretmen yapar)
DO $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- En son kayıt olan kullanıcıyı al veya mevcut öğretmeni bul
  SELECT id INTO v_teacher_id FROM auth.users ORDER BY created_at DESC LIMIT 1;

  IF v_teacher_id IS NOT NULL THEN
    -- Profilini öğretmen yap
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (v_teacher_id, 'Öğretmen', 'Yönetici', 'teacher')
    ON CONFLICT (id) DO UPDATE SET role = 'teacher';

    -- 3. Örnek Müfredat Derslerini Bu Öğretmene Bağla
    INSERT INTO public.subjects (id, name, description, teacher_id) VALUES
      ('b1111111-1111-1111-1111-111111111111', 'Yazılım Geliştirme', 'Algoritmalar ve Web Mimarisi', v_teacher_id),
      ('b2222222-2222-2222-2222-222222222222', 'İleri Matematik', 'Fonksiyonlar ve Analitik Geometri', v_teacher_id),
      ('b3333333-3333-3333-3333-333333333333', 'Fizik Lab', 'Kuvvet ve Enerji Uygulamaları', v_teacher_id)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Sınıf ile Dersleri Eşleştir
    INSERT INTO public.class_subjects (class_id, subject_id) VALUES
      ('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'),
      ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'),
      ('a2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111'),
      ('a3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333')
    ON CONFLICT (class_id, subject_id) DO NOTHING;

    -- 5. Örnek Haftalık Çalışmalar Tanımla
    INSERT INTO public.weekly_activities (id, class_id, subject_id, week_number, activity_date, title, description, max_score, teacher_id) VALUES
      ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 1, CURRENT_DATE - INTERVAL '21 days', 'Hafta 1: Değişkenler ve Veri Tipleri', 'Temel tipler ödevi', 100, v_teacher_id),
      ('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 2, CURRENT_DATE - INTERVAL '14 days', 'Hafta 2: Koşul İfadeleri ve Karar Yapıları', 'if-else ve switch case', 100, v_teacher_id),
      ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 3, CURRENT_DATE - INTERVAL '7 days', 'Hafta 3: Döngüler ve Dizi Manipülasyonu', 'for ve while döngüleri', 100, v_teacher_id)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Örnek sınıflar, dersler ve haftalık çalışmalar başarıyla yüklendi! Öğretmen ID: %', v_teacher_id;
  ELSE
    RAISE NOTICE 'Sınıflar eklendi. Ancak henüz Supabase Auth üzerinde hiçbir kullanıcı kayıtlı değil. Uygulamadan kayıt olduktan sonra bu sorguyu tekrar çalıştırabilirsiniz.';
  END IF;
END $$;

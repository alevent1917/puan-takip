-- ==============================================================================
-- Öğrenci Haftalık Puan Takip Sistemi - Seed Verileri ve İlk Öğretmen Kurulumu
-- ==============================================================================

-- 1. İLK ÖĞRETMEN HESABINI ATAMA (Yalnızca SQL Editor veya Admin tarafından çalıştırılır)
-- Kayıt olduktan sonra kullanıcının e-posta adresini öğretmen rolüne yükseltmek için:
/*
UPDATE public.profiles 
SET role = 'teacher' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ogretmen@okul.k12.tr'
);
*/

-- 2. Örnek Sınıflar
INSERT INTO public.classes (id, name, school_year) VALUES
  ('a1111111-1111-1111-1111-111111111111', '10/A', '2026-2027'),
  ('a2222222-2222-2222-2222-222222222222', '10/B', '2026-2027'),
  ('a3333333-3333-3333-3333-333333333333', '11/A', '2026-2027')
ON CONFLICT (id) DO NOTHING;

-- Not: Aşağıdaki insert'ler teacher profili oluşturulduktan sonra ilişkili teacher_id ile eşleştirilir.

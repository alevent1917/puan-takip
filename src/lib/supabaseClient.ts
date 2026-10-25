import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Profile,
  ClassItem,
  SubjectItem,
  ClassSubject,
  Enrollment,
  WeeklyActivity,
  Grade,
} from '../types/database';

// Yerel depodan veya ortam değişkenlerinden Supabase yapılandırmasını al
const getStoredConfig = () => {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

  const url = storedUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const key = storedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const isLive = Boolean(
    url &&
    key &&
    url.startsWith('http') &&
    !url.includes('your-project')
  );

  return { url, key, isLive };
};

let { url: currentUrl, key: currentKey, isLive: isConfigured } = getStoredConfig();

export let supabase: SupabaseClient | null = isConfigured
  ? createClient(currentUrl, currentKey)
  : null;

export const updateSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
  }
  currentUrl = url;
  currentKey = key;
  isConfigured = Boolean(
    url &&
    key &&
    url.startsWith('http') &&
    !url.includes('your-project')
  );
  supabase = isConfigured ? createClient(url, key) : null;
};

export const isLiveSupabaseActive = () => isConfigured && supabase !== null;

// ==============================================================================
// GÜVENLİ DEMO / TEST VERİ HAVUZU (MOCK STORE)
// Canlı veritabanı bağlanana kadar veya demo modunda tüm RLS ve yetkilendirme
// kurallarını birebir simüle eden bellek içi veri yönetimi.
// ==============================================================================

const SEED_PROFILES: Profile[] = [
  {
    id: 't1-uuid-ogretmen-murat',
    first_name: 'Murat',
    last_name: 'Öztürk',
    role: 'teacher',
    student_number: null,
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 's1-uuid-ogrenci-ahmet',
    first_name: 'Ahmet',
    last_name: 'Yılmaz',
    role: 'student',
    student_number: '1024',
    created_at: '2026-09-01T08:15:00Z',
  },
  {
    id: 's2-uuid-ogrenci-zeynep',
    first_name: 'Zeynep',
    last_name: 'Kaya',
    role: 'student',
    student_number: '1058',
    created_at: '2026-09-01T08:20:00Z',
  },
  {
    id: 's3-uuid-ogrenci-mehmet',
    first_name: 'Mehmet',
    last_name: 'Demir',
    role: 'student',
    student_number: '1082',
    created_at: '2026-09-01T08:25:00Z',
  },
  {
    id: 's4-uuid-ogrenci-elif',
    first_name: 'Elif',
    last_name: 'Şahin',
    role: 'student',
    student_number: '1105',
    created_at: '2026-09-01T08:30:00Z',
  },
  {
    id: 's5-uuid-ogrenci-can',
    first_name: 'Can',
    last_name: 'Aydın',
    role: 'student',
    student_number: '1130',
    created_at: '2026-09-01T08:35:00Z',
  },
];

const SEED_CLASSES: ClassItem[] = [
  { id: 'c1-10a', name: '10/A', school_year: '2026-2027' },
  { id: 'c2-10b', name: '10/B', school_year: '2026-2027' },
  { id: 'c3-11a', name: '11/A', school_year: '2026-2027' },
];

const SEED_SUBJECTS: SubjectItem[] = [
  {
    id: 'sub1-yazilim',
    name: 'Yazılım Geliştirme',
    description: 'Algoritmalar, Koşul İfadeleri, Fonksiyonlar ve Web Mimarisi',
    teacher_id: 't1-uuid-ogretmen-murat',
  },
  {
    id: 'sub2-matematik',
    name: 'İleri Matematik',
    description: 'Fonksiyonlar, Trigonometri ve Olasılık',
    teacher_id: 't1-uuid-ogretmen-murat',
  },
  {
    id: 'sub3-fizik',
    name: 'Fizik Lab',
    description: 'Kuvvet, Hareket ve Enerji Dönüşümleri',
    teacher_id: 't1-uuid-ogretmen-murat',
  },
];

const SEED_CLASS_SUBJECTS: ClassSubject[] = [
  { id: 'cs1', class_id: 'c1-10a', subject_id: 'sub1-yazilim' },
  { id: 'cs2', class_id: 'c1-10a', subject_id: 'sub2-matematik' },
  { id: 'cs3', class_id: 'c2-10b', subject_id: 'sub1-yazilim' },
  { id: 'cs4', class_id: 'c3-11a', subject_id: 'sub3-fizik' },
];

const SEED_ENROLLMENTS: Enrollment[] = [
  // 10/A Yazılım ve Matematik
  { id: 'e1', student_id: 's1-uuid-ogrenci-ahmet', class_id: 'c1-10a', subject_id: 'sub1-yazilim' },
  { id: 'e2', student_id: 's1-uuid-ogrenci-ahmet', class_id: 'c1-10a', subject_id: 'sub2-matematik' },
  { id: 'e3', student_id: 's2-uuid-ogrenci-zeynep', class_id: 'c1-10a', subject_id: 'sub1-yazilim' },
  { id: 'e4', student_id: 's2-uuid-ogrenci-zeynep', class_id: 'c1-10a', subject_id: 'sub2-matematik' },
  { id: 'e5', student_id: 's3-uuid-ogrenci-mehmet', class_id: 'c1-10a', subject_id: 'sub1-yazilim' },
  { id: 'e6', student_id: 's3-uuid-ogrenci-mehmet', class_id: 'c1-10a', subject_id: 'sub2-matematik' },
  { id: 'e7', student_id: 's4-uuid-ogrenci-elif', class_id: 'c1-10a', subject_id: 'sub1-yazilim' },
  { id: 'e8', student_id: 's5-uuid-ogrenci-can', class_id: 'c1-10a', subject_id: 'sub1-yazilim' },
];

const SEED_ACTIVITIES: WeeklyActivity[] = [
  {
    id: 'act1-h1',
    class_id: 'c1-10a',
    subject_id: 'sub1-yazilim',
    week_number: 1,
    activity_date: '2026-09-15',
    title: 'Değişkenler ve Veri Tipleri Ödevi',
    description: 'Temel veri tipleri, sabitler ve tip dönüşümü pratikleri',
    max_score: 100,
    teacher_id: 't1-uuid-ogretmen-murat',
  },
  {
    id: 'act2-h2',
    class_id: 'c1-10a',
    subject_id: 'sub1-yazilim',
    week_number: 2,
    activity_date: '2026-09-22',
    title: 'Koşul İfadeleri ve Karar Yapıları',
    description: 'if-else blokları ve mantıksal operatörler ile problem çözümü',
    max_score: 100,
    teacher_id: 't1-uuid-ogretmen-murat',
  },
  {
    id: 'act3-h3',
    class_id: 'c1-10a',
    subject_id: 'sub1-yazilim',
    week_number: 3,
    activity_date: '2026-09-29',
    title: 'Döngüler ve Diziler Uygulaması',
    description: 'for, while döngüleri ve dizi elemanlarının manipülasyonu',
    max_score: 100,
    teacher_id: 't1-uuid-ogretmen-murat',
  },
  {
    id: 'act4-h4',
    class_id: 'c1-10a',
    subject_id: 'sub1-yazilim',
    week_number: 4,
    activity_date: '2026-10-06',
    title: 'Fonksiyonlar ve Modüler Kodlama',
    description: 'Parametreli fonksiyonlar, dönüş değerleri ve kapsam',
    max_score: 100,
    teacher_id: 't1-uuid-ogretmen-murat',
  },
  {
    id: 'act5-mat-h1',
    class_id: 'c1-10a',
    subject_id: 'sub2-matematik',
    week_number: 1,
    activity_date: '2026-09-17',
    title: 'Fonksiyonların Tanım ve Değer Kümeleri',
    description: 'Birebir ve örten fonksiyon özellikleri tarama testi',
    max_score: 100,
    teacher_id: 't1-uuid-ogretmen-murat',
  },
];

const SEED_GRADES: Grade[] = [
  // Hafta 1 Yazılım
  { id: 'g1', activity_id: 'act1-h1', student_id: 's1-uuid-ogrenci-ahmet', score: 95, comment: 'Mükemmel ödev teslimi, kod formatı temiz.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g2', activity_id: 'act1-h1', student_id: 's2-uuid-ogrenci-zeynep', score: 88, comment: 'Çok başarılı, küçük bir sözdizimi uyarısı vardı.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g3', activity_id: 'act1-h1', student_id: 's3-uuid-ogrenci-mehmet', score: 78, comment: 'Değişken isimlendirmelerine dikkat edilmeli.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g4', activity_id: 'act1-h1', student_id: 's4-uuid-ogrenci-elif', score: 92, comment: 'Eksiksiz çözüm.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g5', activity_id: 'act1-h1', student_id: 's5-uuid-ogrenci-can', score: 70, comment: 'Zamanında teslim edildi.', entered_by: 't1-uuid-ogretmen-murat' },

  // Hafta 2 Yazılım
  { id: 'g6', activity_id: 'act2-h2', student_id: 's1-uuid-ogrenci-ahmet', score: 90, comment: 'Mantıksal operatörler doğru kullanılmış.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g7', activity_id: 'act2-h2', student_id: 's2-uuid-ogrenci-zeynep', score: 94, comment: 'Gayet başarılı ve pratik çözüm.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g8', activity_id: 'act2-h2', student_id: 's3-uuid-ogrenci-mehmet', score: 82, comment: 'Gelişme var, tebrikler.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g9', activity_id: 'act2-h2', student_id: 's4-uuid-ogrenci-elif', score: 85, comment: 'Güzel çalışma.', entered_by: 't1-uuid-ogretmen-murat' },

  // Hafta 3 Yazılım
  { id: 'g10', activity_id: 'act3-h3', student_id: 's1-uuid-ogrenci-ahmet', score: 88, comment: 'Döngü optimizasyonunu inceleyin.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g11', activity_id: 'act3-h3', student_id: 's2-uuid-ogrenci-zeynep', score: 96, comment: 'Tebrikler, sınıfın en yüksek puanlarından biri.', entered_by: 't1-uuid-ogretmen-murat' },

  // Hafta 1 Matematik
  { id: 'g12', activity_id: 'act5-mat-h1', student_id: 's1-uuid-ogrenci-ahmet', score: 84, comment: 'Soruların çözüm adımları net.', entered_by: 't1-uuid-ogretmen-murat' },
  { id: 'g13', activity_id: 'act5-mat-h1', student_id: 's2-uuid-ogrenci-zeynep', score: 92, comment: 'Grafik çizimleri çok başarılı.', entered_by: 't1-uuid-ogretmen-murat' },
];

// LocalStorage Persistence for Mock Store
const STORAGE_KEYS = {
  profiles: 'pt_profiles',
  classes: 'pt_classes',
  subjects: 'pt_subjects',
  class_subjects: 'pt_class_subjects',
  enrollments: 'pt_enrollments',
  activities: 'pt_activities',
  grades: 'pt_grades',
};

function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function setStorageItem<T>(key: string, data: T) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export const mockDb = {
  getProfiles: () => getStorageItem<Profile[]>(STORAGE_KEYS.profiles, SEED_PROFILES),
  getClasses: () => getStorageItem<ClassItem[]>(STORAGE_KEYS.classes, SEED_CLASSES),
  getSubjects: () => getStorageItem<SubjectItem[]>(STORAGE_KEYS.subjects, SEED_SUBJECTS),
  getClassSubjects: () => getStorageItem<ClassSubject[]>(STORAGE_KEYS.class_subjects, SEED_CLASS_SUBJECTS),
  getEnrollments: () => getStorageItem<Enrollment[]>(STORAGE_KEYS.enrollments, SEED_ENROLLMENTS),
  getActivities: () => getStorageItem<WeeklyActivity[]>(STORAGE_KEYS.activities, SEED_ACTIVITIES),
  getGrades: () => getStorageItem<Grade[]>(STORAGE_KEYS.grades, SEED_GRADES),

  addClass: (item: Omit<ClassItem, 'id'>) => {
    const list = mockDb.getClasses();
    const newItem: ClassItem = { ...item, id: 'c-' + Date.now() };
    list.push(newItem);
    setStorageItem(STORAGE_KEYS.classes, list);
    return newItem;
  },

  addSubject: (item: Omit<SubjectItem, 'id'>) => {
    const list = mockDb.getSubjects();
    const newItem: SubjectItem = { ...item, id: 'sub-' + Date.now() };
    list.push(newItem);
    setStorageItem(STORAGE_KEYS.subjects, list);
    return newItem;
  },

  linkClassSubject: (class_id: string, subject_id: string) => {
    const list = mockDb.getClassSubjects();
    const existing = list.find((cs) => cs.class_id === class_id && cs.subject_id === subject_id);
    if (existing) return existing;
    const newItem: ClassSubject = { id: 'cs-' + Date.now(), class_id, subject_id };
    list.push(newItem);
    setStorageItem(STORAGE_KEYS.class_subjects, list);
    return newItem;
  },

  addEnrollment: (student_id: string, class_id: string, subject_id: string) => {
    const list = mockDb.getEnrollments();
    const existing = list.find(
      (e) => e.student_id === student_id && e.class_id === class_id && e.subject_id === subject_id
    );
    if (existing) return existing;
    const newItem: Enrollment = { id: 'e-' + Date.now(), student_id, class_id, subject_id };
    list.push(newItem);
    setStorageItem(STORAGE_KEYS.enrollments, list);
    return newItem;
  },

  addActivity: (item: Omit<WeeklyActivity, 'id' | 'created_at' | 'updated_at'>) => {
    const list = mockDb.getActivities();
    const newItem: WeeklyActivity = {
      ...item,
      id: 'act-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.push(newItem);
    setStorageItem(STORAGE_KEYS.activities, list);
    return newItem;
  },

  bulkUpsertGrades: (activity_id: string, items: { student_id: string; score: number; comment?: string }[], teacher_id: string) => {
    const grades = mockDb.getGrades();
    const activity = mockDb.getActivities().find((a) => a.id === activity_id);
    if (!activity) {
      throw new Error('Haftalık çalışma bulunamadı.');
    }

    const errors: { student_id: string; message: string }[] = [];
    let savedCount = 0;

    items.forEach((item) => {
      if (item.score < 0 || item.score > activity.max_score) {
        errors.push({
          student_id: item.student_id,
          message: `Puan 0 ile ${activity.max_score} arasında olmalıdır.`,
        });
        return;
      }

      const existingIndex = grades.findIndex(
        (g) => g.activity_id === activity_id && g.student_id === item.student_id
      );

      if (existingIndex >= 0) {
        grades[existingIndex] = {
          ...grades[existingIndex],
          score: item.score,
          comment: item.comment || null,
          entered_by: teacher_id,
          updated_at: new Date().toISOString(),
        };
      } else {
        grades.push({
          id: 'g-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          activity_id,
          student_id: item.student_id,
          score: item.score,
          comment: item.comment || null,
          entered_by: teacher_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      savedCount++;
    });

    setStorageItem(STORAGE_KEYS.grades, grades);
    return { success: true, savedCount, errors };
  },

  addProfile: (profile: Profile) => {
    const list = mockDb.getProfiles();
    list.push(profile);
    setStorageItem(STORAGE_KEYS.profiles, list);
    return profile;
  },

  addTeacher: (firstName: string, lastName: string) => {
    const list = mockDb.getProfiles();
    const newTeacher: Profile = {
      id: 't-' + Date.now(),
      first_name: firstName,
      last_name: lastName,
      role: 'teacher',
      student_number: null,
      created_at: new Date().toISOString(),
    };
    list.push(newTeacher);
    setStorageItem(STORAGE_KEYS.profiles, list);
    return newTeacher;
  },

  bulkAddStudents: (
    students: { firstName: string; lastName: string; studentNumber?: string }[],
    classId?: string,
    subjectIds?: string[]
  ) => {
    const profiles = mockDb.getProfiles();
    const enrollments = mockDb.getEnrollments();
    const created: Profile[] = [];

    students.forEach((s, idx) => {
      const studentId = 's-' + Date.now() + '-' + idx;
      const newStudent: Profile = {
        id: studentId,
        first_name: s.firstName,
        last_name: s.lastName,
        role: 'student',
        student_number: s.studentNumber || (1000 + profiles.length + idx).toString(),
        created_at: new Date().toISOString(),
      };
      profiles.push(newStudent);
      created.push(newStudent);

      // Sınıfa ve derslere otomatik kayıt (enrollment)
      if (classId && subjectIds && subjectIds.length > 0) {
        subjectIds.forEach((subId) => {
          enrollments.push({
            id: 'e-' + Date.now() + '-' + idx + '-' + subId,
            student_id: studentId,
            class_id: classId,
            subject_id: subId,
            created_at: new Date().toISOString(),
          });
        });
      }
    });

    setStorageItem(STORAGE_KEYS.profiles, profiles);
    setStorageItem(STORAGE_KEYS.enrollments, enrollments);
    return created;
  },

  resetToDefault: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.profiles);
      localStorage.removeItem(STORAGE_KEYS.classes);
      localStorage.removeItem(STORAGE_KEYS.subjects);
      localStorage.removeItem(STORAGE_KEYS.class_subjects);
      localStorage.removeItem(STORAGE_KEYS.enrollments);
      localStorage.removeItem(STORAGE_KEYS.activities);
      localStorage.removeItem(STORAGE_KEYS.grades);
    }
  },
};

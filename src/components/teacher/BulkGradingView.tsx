import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ClassItem,
  SubjectItem,
  WeeklyActivity,
  BulkGradeRow,
  Profile,
} from '../../types/database';
import { mockDb, isLiveSupabaseActive, supabase } from '../../lib/supabaseClient';
import {
  Save,
  Bookmark,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Award,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';

export const BulkGradingView: React.FC = () => {
  const { user } = useAuth();
  const isLive = isLiveSupabaseActive();

  // Seçim Durumları (Cascading Filters)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [availableSubjects, setAvailableSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const [activities, setActivities] = useState<WeeklyActivity[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  // Tablo Satırları
  const [rows, setRows] = useState<BulkGradeRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message?: string;
  }>({ type: 'idle' });

  // Klavye navigasyonu için referanslar
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // 1. Sınıfları Yükle
  useEffect(() => {
    const loadClasses = async () => {
      if (isLive && supabase) {
        const { data } = await supabase.from('classes').select('*').order('name');
        if (data && data.length > 0) {
          setClasses(data as ClassItem[]);
          setSelectedClassId(data[0].id);
        }
      } else {
        const list = mockDb.getClasses();
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      }
    };
    loadClasses();
  }, [isLive]);

  // 2. Sınıf Değiştiğinde İlgili Dersleri Filtrele
  useEffect(() => {
    if (!selectedClassId) {
      setAvailableSubjects([]);
      setSelectedSubjectId('');
      return;
    }

    const loadSubjectsForClass = async () => {
      if (isLive && supabase) {
        const { data: cs } = await supabase
          .from('class_subjects')
          .select('subject_id')
          .eq('class_id', selectedClassId);

        if (cs && cs.length > 0) {
          const subIds = cs.map((item: any) => item.subject_id);
          const { data: subData } = await supabase
            .from('subjects')
            .select('*')
            .in('id', subIds);

          if (subData && subData.length > 0) {
            setAvailableSubjects(subData as SubjectItem[]);
            setSelectedSubjectId(subData[0].id);
          } else {
            setAvailableSubjects([]);
            setSelectedSubjectId('');
          }
        } else {
          setAvailableSubjects([]);
          setSelectedSubjectId('');
        }
      } else {
        const classSubjects = mockDb.getClassSubjects().filter((cs) => cs.class_id === selectedClassId);
        const subIds = classSubjects.map((cs) => cs.subject_id);
        const allSubjects = mockDb.getSubjects();
        const filtered = allSubjects.filter((s) => subIds.includes(s.id));
        setAvailableSubjects(filtered);
        if (filtered.length > 0) {
          setSelectedSubjectId(filtered[0].id);
        } else {
          setSelectedSubjectId('');
        }
      }
    };

    loadSubjectsForClass();
  }, [selectedClassId, isLive]);

  // 3. Sınıf ve Ders Seçildiğinde Haftalık Çalışmaları Yükle
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setActivities([]);
      setSelectedActivityId('');
      return;
    }

    const loadActivities = async () => {
      if (isLive && supabase) {
        const { data } = await supabase
          .from('weekly_activities')
          .select('*')
          .eq('class_id', selectedClassId)
          .eq('subject_id', selectedSubjectId)
          .order('week_number', { ascending: true });

        if (data && data.length > 0) {
          setActivities(data as WeeklyActivity[]);
          setSelectedActivityId(data[0].id);
        } else {
          setActivities([]);
          setSelectedActivityId('');
        }
      } else {
        const list = mockDb
          .getActivities()
          .filter((a) => a.class_id === selectedClassId && a.subject_id === selectedSubjectId);
        setActivities(list);
        if (list.length > 0) {
          setSelectedActivityId(list[0].id);
        } else {
          setSelectedActivityId('');
        }
      }
    };

    loadActivities();
  }, [selectedClassId, selectedSubjectId, isLive]);

  // 4. Etkinlik Seçildiğinde Kayıtlı Öğrencileri ve Mevcut Puanları Getir
  const fetchStudentGrades = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedActivityId) {
      setRows([]);
      return;
    }

    setIsLoading(true);
    setSaveStatus({ type: 'idle' });

    try {
      if (isLive && supabase) {
        // Sınıf ve derse kayıtlı öğrencileri çek
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('class_id', selectedClassId)
          .eq('subject_id', selectedSubjectId);

        const studentIds = (enrollments || []).map((e: any) => e.student_id);

        if (studentIds.length === 0) {
          setRows([]);
          setIsLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds);

        // Bu etkinliğe ait girilmiş puanları çek
        const { data: grades } = await supabase
          .from('grades')
          .select('*')
          .eq('activity_id', selectedActivityId);

        const gradesMap = new Map((grades || []).map((g: any) => [g.student_id, g]));

        const studentRows: BulkGradeRow[] = (profiles || []).map((p: any) => {
          const existingGrade = gradesMap.get(p.id);
          const hasScore = existingGrade && existingGrade.score !== undefined && existingGrade.score !== null;

          return {
            student_id: p.id,
            student_number: p.student_number || '-',
            first_name: p.first_name,
            last_name: p.last_name,
            score: hasScore ? Number(existingGrade.score) : '',
            comment: existingGrade?.comment || '',
            status: hasScore ? 'saved' : 'draft',
            saved_score: hasScore ? Number(existingGrade.score) : null,
            saved_comment: existingGrade?.comment || '',
          };
        });

        studentRows.sort((a, b) => a.first_name.localeCompare(b.first_name));
        setRows(studentRows);
      } else {
        // Mock DB
        const enrollments = mockDb
          .getEnrollments()
          .filter((e) => e.class_id === selectedClassId && e.subject_id === selectedSubjectId);

        const studentIds = enrollments.map((e) => e.student_id);
        const allProfiles = mockDb.getProfiles();
        const enrolledProfiles = allProfiles.filter((p) => studentIds.includes(p.id));

        const allGrades = mockDb.getGrades();
        const activityGrades = allGrades.filter((g) => g.activity_id === selectedActivityId);
        const gradeMap = new Map(activityGrades.map((g) => [g.student_id, g]));

        const studentRows: BulkGradeRow[] = enrolledProfiles.map((p) => {
          const g = gradeMap.get(p.id);
          const hasScore = g !== undefined && g.score !== null;

          return {
            student_id: p.id,
            student_number: p.student_number || '1000',
            first_name: p.first_name,
            last_name: p.last_name,
            score: hasScore ? g.score : '',
            comment: g?.comment || '',
            status: hasScore ? 'saved' : 'draft',
            saved_score: hasScore ? g.score : null,
            saved_comment: g?.comment || '',
          };
        });

        studentRows.sort((a, b) => a.first_name.localeCompare(b.first_name));
        setRows(studentRows);
      }
    } catch (err: any) {
      console.error('Öğrenci puanları çekilirken hata:', err);
      setSaveStatus({ type: 'error', message: 'Veriler yüklenirken hata oluştu.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentGrades();
  }, [selectedClassId, selectedSubjectId, selectedActivityId, isLive]);

  // Seçili Etkinlik
  const currentActivity = activities.find((a) => a.id === selectedActivityId);
  const maxScore = currentActivity?.max_score ?? 100;

  // Puan Değişimi Handler
  const handleScoreChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.student_id !== studentId) return r;

        if (val === '') {
          return {
            ...r,
            score: '',
            status: r.saved_score !== null ? 'dirty' : 'draft',
            error_message: undefined,
          };
        }

        const num = parseFloat(val);
        let errorMsg: string | undefined = undefined;

        if (isNaN(num)) {
          errorMsg = 'Geçersiz sayı';
        } else if (num < 0) {
          errorMsg = 'Puan negatif olamaz';
        } else if (num > maxScore) {
          errorMsg = `Maksimum puan (${maxScore}) aşılamaz`;
        }

        return {
          ...r,
          score: isNaN(num) ? '' : num,
          status: errorMsg ? 'error' : 'dirty',
          error_message: errorMsg,
        };
      })
    );
  };

  // Açıklama Değişimi Handler
  const handleCommentChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.student_id !== studentId) return r;
        return {
          ...r,
          comment: val,
          status: r.status === 'error' ? 'error' : 'dirty',
        };
      })
    );
  };

  // Klavye ile Sonraki Öğrenciye Geçiş (Enter veya Aşağı Ok)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < rows.length) {
        const nextId = rows[nextIndex].student_id;
        inputRefs.current.get(nextId)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevId = rows[prevIndex].student_id;
        inputRefs.current.get(prevId)?.focus();
      }
    }
  };

  // Puanları Kaydet (Bulk Upsert)
  const handleSaveGrades = async () => {
    if (!currentActivity || !user) return;

    // Hata kontrolü
    const hasAnyError = rows.some((r) => r.status === 'error');
    if (hasAnyError) {
      setSaveStatus({
        type: 'error',
        message: 'Lütfen tablodaki hatalı puan girişlerini düzeltiniz.',
      });
      return;
    }

    const itemsToSave = rows
      .filter((r) => r.score !== '' && typeof r.score === 'number')
      .map((r) => ({
        student_id: r.student_id,
        score: Number(r.score),
        comment: r.comment.trim() || undefined,
      }));

    if (itemsToSave.length === 0) {
      setSaveStatus({ type: 'error', message: 'Kaydedilecek puan girişi bulunmuyor.' });
      return;
    }

    setIsLoading(true);
    setSaveStatus({ type: 'idle' });

    try {
      if (isLive && supabase) {
        // Supabase bulk_upsert_grades PostgreSQL RPC fonksiyonunu çağır
        const { data, error } = await supabase.rpc('bulk_upsert_grades', {
          p_activity_id: currentActivity.id,
          p_grades_json: itemsToSave,
        });

        if (error) {
          // RPC yoksa doğrudan upsert fallback
          const payload = itemsToSave.map((item) => ({
            activity_id: currentActivity.id,
            student_id: item.student_id,
            score: item.score,
            comment: item.comment,
            entered_by: user.id,
            updated_at: new Date().toISOString(),
          }));

          const { error: upsertErr } = await supabase
            .from('grades')
            .upsert(payload, { onConflict: 'activity_id,student_id' });

          if (upsertErr) {
            throw upsertErr;
          }
        } else if (data && data.errors && data.errors.length > 0) {
          setSaveStatus({
            type: 'error',
            message: `Kısmi hata: ${data.errors.length} öğrencinin puanı kaydedilemedi.`,
          });
        }

        setSaveStatus({
          type: 'success',
          message: `${itemsToSave.length} öğrencinin puanı veritabanına başarıyla kaydedildi.`,
        });
        fetchStudentGrades();
      } else {
        // Mock Store bulk upsert
        const res = mockDb.bulkUpsertGrades(currentActivity.id, itemsToSave, user.id);
        if (res.errors.length > 0) {
          setSaveStatus({
            type: 'error',
            message: `${res.errors.length} öğrencinin puanı doğrulanamadı.`,
          });
        } else {
          setSaveStatus({
            type: 'success',
            message: `${res.savedCount} öğrencinin puanı başarıyla kaydedildi.`,
          });
        }
        fetchStudentGrades();
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: 'Kayıt sırasında hata oluştu: ' + (err?.message || 'Bilinmeyen hata'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Taslak Olarak Sakla (Yerel Tarayıcı Belleği)
  const handleSaveDraft = () => {
    if (!currentActivity) return;
    const draftKey = `pt_draft_${currentActivity.id}`;
    localStorage.setItem(draftKey, JSON.stringify(rows));
    setSaveStatus({
      type: 'success',
      message: 'Puanlar tarayıcınıza taslak olarak kaydedildi. Dilediğiniz zaman gönderebilirsiniz.',
    });
  };

  // Değişiklikleri İptal Et
  const handleCancelChanges = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        score: r.saved_score !== null && r.saved_score !== undefined ? r.saved_score : '',
        comment: r.saved_comment || '',
        status: r.saved_score !== null && r.saved_score !== undefined ? 'saved' : 'draft',
        error_message: undefined,
      }))
    );
    setSaveStatus({ type: 'idle' });
  };

  // İstatistik Hesaplamaları (Tabular figures)
  const validScores = rows
    .filter((r) => typeof r.score === 'number' && !isNaN(r.score))
    .map((r) => Number(r.score));

  const countEntered = validScores.length;
  const totalStudents = rows.length;
  const avgScore = countEntered > 0 ? (validScores.reduce((a, b) => a + b, 0) / countEntered).toFixed(1) : '-';
  const highScore = countEntered > 0 ? Math.max(...validScores) : '-';
  const lowScore = countEntered > 0 ? Math.min(...validScores) : '-';

  const unsavedCount = rows.filter((r) => r.status === 'dirty' || r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* 1. Üst Filtre Barı (Cascading Selectors) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>Toplu Puan Giriş Seçimi</span>
          <span className="text-xs text-slate-500 font-normal">
            Seçimler birbirine bağlıdır: Sınıf &gt; Ders &gt; Çalışma
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sınıf Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Sınıf Seçimi
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.school_year})
                </option>
              ))}
            </select>
          </div>

          {/* Ders Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Ders Seçimi
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={availableSubjects.length === 0}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              {availableSubjects.length === 0 && <option value="">Bu sınıfta ders bulunamadı</option>}
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hafta Filtresi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Hafta Filtresi
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Tüm Haftalar</option>
              {Array.from(new Set(activities.map((a) => a.week_number))).sort((a, b) => a - b).map((w) => (
                <option key={w} value={w}>
                  {w}. Hafta
                </option>
              ))}
            </select>
          </div>

          {/* Haftalık Çalışma / Etkinlik Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4. Haftalık Çalışma
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              disabled={activities.length === 0}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              {activities.length === 0 && <option value="">Çalışma bulunamadı</option>}
              {activities
                .filter((a) => selectedWeek === 'all' || a.week_number === selectedWeek)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    H{a.week_number}: {a.title} (Maks: {a.max_score}p)
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Seçili Çalışma Bilgisi & İstatistikler */}
      {currentActivity && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">Mevcut Çalışma</span>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {currentActivity.title}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {currentActivity.week_number}. Hafta · Maks: {currentActivity.max_score} Puan
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">Puanlanan Öğrenci</span>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {countEntered} / {totalStudents}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {totalStudents > 0 ? `%${Math.round((countEntered / totalStudents) * 100)} tamamlandı` : 'Kayıtlı öğrenci yok'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">Sınıf Ortalaması</span>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {avgScore} / {maxScore}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Geçerli girilen notlar üzerinden
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">En Yüksek / En Düşük</span>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {highScore} / {lowScore}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {unsavedCount > 0 ? `${unsavedCount} kaydedilmemiş değişiklik` : 'Tüm veriler senkronize'}
            </div>
          </div>
        </div>
      )}

      {/* Durum / Bildirim Alanı */}
      {saveStatus.message && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{saveStatus.message}</span>
          </div>
          {unsavedCount > 0 && (
            <span className="font-semibold text-rose-700">({unsavedCount} beklemede)</span>
          )}
        </div>
      )}

      {/* 3. Ana Tablo & İşlem Çubuğu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* İşlem Butonları Çubuğu */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900">Öğrenci Puan Listesi</span>
            {unsavedCount > 0 && (
              <span className="text-[11px] text-amber-700 font-medium">
                · {unsavedCount} değişiklik kaydedilmeyi bekliyor
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelChanges}
              disabled={unsavedCount === 0 || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>İptal Et</span>
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={rows.length === 0 || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-50"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Taslak Sakla</span>
            </button>

            <button
              onClick={fetchStudentGrades}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              title="Kaydedilmiş Puanları Yeniden Yükle"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Puanları Getir</span>
            </button>

            <button
              onClick={handleSaveGrades}
              disabled={isLoading || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Puanları Kaydet</span>
            </button>
          </div>
        </div>

        {/* Tablo İçeriği */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            Öğrenci puanları yükleniyor...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 mb-1">Kayıtlı Öğrenci Bulunamadı</p>
            <p>Seçilen sınıf ve derse henüz kayıtlı öğrenci bulunmuyor veya çalışma seçilmedi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-semibold w-12 text-center">Sıra</th>
                  <th className="py-2.5 px-4 font-semibold w-24">Öğr. No</th>
                  <th className="py-2.5 px-4 font-semibold">Öğrenci Adı Soyadı</th>
                  <th className="py-2.5 px-4 font-semibold w-36">
                    Puan (0 - {maxScore})
                  </th>
                  <th className="py-2.5 px-4 font-semibold min-w-[200px]">Öğretmen Açıklaması</th>
                  <th className="py-2.5 px-4 font-semibold w-28 text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => {
                  const isDirty = row.status === 'dirty';
                  const isError = row.status === 'error';
                  const isSaved = row.status === 'saved';

                  return (
                    <tr
                      key={row.student_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isError ? 'bg-rose-50/40' : isDirty ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 font-medium">
                        {row.student_number}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="py-2 px-4">
                        <div className="relative">
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current.set(row.student_id, el);
                              else inputRefs.current.delete(row.student_id);
                            }}
                            type="number"
                            min="0"
                            max={maxScore}
                            step="any"
                            value={row.score}
                            onChange={(e) => handleScoreChange(row.student_id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            placeholder={`0-${maxScore}`}
                            className={`w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border rounded-md focus:outline-hidden focus:ring-1 transition-all ${
                              isError
                                ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                                : isDirty
                                ? 'border-amber-400 bg-amber-50/50 text-slate-900 focus:ring-amber-500'
                                : 'border-slate-300 bg-white text-slate-900 focus:ring-slate-900'
                            }`}
                          />
                        </div>
                        {row.error_message && (
                          <div className="text-[10px] text-rose-600 mt-0.5 font-medium leading-tight">
                            {row.error_message}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={row.comment}
                          onChange={(e) => handleCommentChange(row.student_id, e.target.value)}
                          placeholder="Öğrenciye özel not (isteğe bağlı)..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-slate-700"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isError && (
                          <span className="text-rose-600 font-semibold text-[11px]">Hatalı</span>
                        )}
                        {isDirty && (
                          <span className="text-amber-700 font-medium text-[11px]">Değişti</span>
                        )}
                        {isSaved && (
                          <span className="text-emerald-700 font-medium text-[11px]">Kaydedildi</span>
                        )}
                        {!isError && !isDirty && !isSaved && (
                          <span className="text-slate-400 text-[11px]">Girilmedi</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tablo Alt Bilgisi */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>İpucu: Puan kutusundayken <strong>Enter</strong> veya <strong>Aşağı Ok</strong> tuşu ile bir sonraki öğrenciye hızlıca geçebilirsiniz.</span>
          </div>
          <span>Maksimum Puan: {maxScore}</span>
        </div>
      </div>
    </div>
  );
};

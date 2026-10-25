import React from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  Award,
  ArrowRight,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import { mockDb, isLiveSupabaseActive } from '../../lib/supabaseClient';

interface OverviewViewProps {
  onNavigate: (tab: 'bulk-grading' | 'activities' | 'classes' | 'students' | 'reports') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const isLive = isLiveSupabaseActive();

  const classes = mockDb.getClasses();
  const subjects = mockDb.getSubjects();
  const activities = mockDb.getActivities();
  const grades = mockDb.getGrades();
  const enrollments = mockDb.getEnrollments();
  const profiles = mockDb.getProfiles().filter((p) => p.role === 'student');

  const totalStudents = profiles.length;
  const totalClasses = classes.length;
  const totalSubjects = subjects.length;
  const totalGrades = grades.length;

  // Son girilen puanlar
  const recentGrades = [...grades]
    .slice(-6)
    .reverse()
    .map((g) => {
      const student = profiles.find((p) => p.id === g.student_id);
      const activity = activities.find((a) => a.id === g.activity_id);
      return {
        ...g,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Öğrenci',
        activityTitle: activity?.title || 'Haftalık Çalışma',
        maxScore: activity?.max_score || 100,
      };
    });

  // Son oluşturulan haftalık çalışmalar
  const recentActivities = [...activities].slice(-4).reverse();

  return (
    <div className="space-y-6">
      {/* İstatistik Sayaçları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Toplam Öğrenci</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {totalStudents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Kayıtlı aktif öğrenci profili
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Aktif Sınıf Sayısı</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {totalClasses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            2026-2027 eğitim yılı şubeleri
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Tanımlı Dersler</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {totalSubjects}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Müfredat dersi ve laboratuvar
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Toplam Girilen Puan</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {totalGrades}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Veritabanında kayıtlı not
          </div>
        </div>
      </div>

      {/* Hızlı Eylemler Çubuğu */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Hızlı İşlemler</h3>
          <p className="text-[11px] text-slate-500">Öğretmen paneli sık kullanılan araçları</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('bulk-grading')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            <span>Toplu Puan Girişi Yap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('activities')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <span>Yeni Çalışma Oluştur</span>
          </button>
        </div>
      </div>

      {/* 2 Kolon: Son Puan Girişleri ve Son Haftalık Çalışmalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Puan Girişleri */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-slate-500" />
              <span>Son Puan Girişleri</span>
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
            >
              Tüm Raporlar &gt;
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentGrades.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Henüz puan girişi bulunmuyor.
              </div>
            ) : (
              recentGrades.map((g) => (
                <div key={g.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{g.studentName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[240px]">
                      {g.activityTitle}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 font-mono tabular-nums">
                      {g.score} / {g.maxScore}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      %{Math.round((g.score / g.maxScore) * 100)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Son Haftalık Çalışmalar */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Son Tanımlanan Çalışmalar</span>
            </h3>
            <button
              onClick={() => onNavigate('activities')}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
            >
              Tüm Çalışmalar &gt;
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Henüz haftalık çalışma oluşturulmadı.
              </div>
            ) : (
              recentActivities.map((act) => {
                const cls = classes.find((c) => c.id === act.class_id);
                const sub = subjects.find((s) => s.id === act.subject_id);
                return (
                  <div key={act.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{act.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {cls?.name || 'Sınıf'} · {sub?.name || 'Ders'} · {act.week_number}. Hafta
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-700 font-mono tabular-nums font-medium">
                        Maks {act.max_score}p
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {act.activity_date || 'Tarih belirtilmedi'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockDb, isLiveSupabaseActive, supabase } from '../../lib/supabaseClient';
import {
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Printer,
} from 'lucide-react';
import { StudentActivityGrade } from '../../types/database';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const isLive = isLiveSupabaseActive();

  const currentStudentId = user?.id || 's1-uuid-ogrenci-ahmet';

  // Veritabanından yalnızca bu öğrenciye ait kayıtları ve dersleri filtrele
  const allEnrollments = mockDb.getEnrollments();
  const studentEnrollments = allEnrollments.filter((e) => e.student_id === currentStudentId);

  const classes = mockDb.getClasses();
  const subjects = mockDb.getSubjects();
  const activities = mockDb.getActivities();
  const grades = mockDb.getGrades();

  // Öğrencinin sınıfı
  const enrolledClassIds = Array.from(new Set(studentEnrollments.map((e) => e.class_id)));
  const studentClasses = classes.filter((c) => enrolledClassIds.includes(c.id));
  const primaryClassName = studentClasses[0]?.name || '10/A';
  const schoolYear = studentClasses[0]?.school_year || '2026-2027';

  // Öğrencinin kayıtlı olduğu dersler
  const enrolledSubjectIds = Array.from(new Set(studentEnrollments.map((e) => e.subject_id)));
  const enrolledSubjects = subjects.filter((s) => enrolledSubjectIds.includes(s.id));

  // Seçili Ders
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    enrolledSubjects[0]?.id || subjects[0]?.id || ''
  );

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Seçili derse ait haftalık çalışmalar ve öğrencinin aldığı notlar
  const subjectActivities = activities
    .filter((a) => a.subject_id === selectedSubjectId)
    .sort((a, b) => a.week_number - b.week_number);

  const myGradesForSubject: StudentActivityGrade[] = subjectActivities.map((act) => {
    // RLS Güvencesi: Yalnızca student_id === currentStudentId olan notlar alınır!
    const gradeObj = grades.find(
      (g) => g.activity_id === act.id && g.student_id === currentStudentId
    );

    return {
      activity_id: act.id,
      week_number: act.week_number,
      title: act.title,
      activity_date: act.activity_date,
      description: act.description,
      max_score: act.max_score,
      score: gradeObj !== undefined && gradeObj.score !== null ? gradeObj.score : null,
      comment: gradeObj?.comment || null,
    };
  });

  // İstatistikler (Eksik veriler ile 0 puanı doğru ayıran hesaplama)
  const gradedActivities = myGradesForSubject.filter((item) => item.score !== null);
  const totalGraded = gradedActivities.length;

  const averagePercentage =
    totalGraded > 0
      ? Math.round(
          gradedActivities.reduce(
            (sum, item) => sum + (item.score! / item.max_score) * 100,
            0
          ) / totalGraded
        )
      : null;

  const highestScore =
    totalGraded > 0 ? Math.max(...gradedActivities.map((g) => g.score!)) : null;

  const latestGrade =
    gradedActivities.length > 0 ? gradedActivities[gradedActivities.length - 1] : null;

  // SVG Çizim Koordinatları için veri hazırlığı
  const graphWidth = 600;
  const graphHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  const availableWeeks = myGradesForSubject.map((item) => ({
    week: item.week_number,
    score: item.score,
    maxScore: item.max_score,
    percentage: item.score !== null ? Math.round((item.score / item.max_score) * 100) : null,
    title: item.title,
  }));

  const plotPoints = availableWeeks.map((item, index) => {
    const x =
      availableWeeks.length > 1
        ? paddingX + (index / (availableWeeks.length - 1)) * (graphWidth - paddingX * 2)
        : graphWidth / 2;
    // Y ekseni: 0% alt (graphHeight - paddingY), 100% üst (paddingY)
    const y =
      item.percentage !== null
        ? graphHeight - paddingY - (item.percentage / 100) * (graphHeight - paddingY * 2)
        : null;

    return { ...item, x, y };
  });

  // Yalnızca puanı girilmiş haftaları birbirine bağlayan SVG Path
  const validPoints = plotPoints.filter((p) => p.y !== null);
  const pathD =
    validPoints.length > 1
      ? validPoints.reduce((acc, curr, idx) => {
          return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`;
        }, '')
      : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Hoş Geldin Başlığı */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Öğrenci Portalı</span>
            <span aria-hidden="true">·</span>
            <span>{schoolYear} Eğitim Yılı</span>
            <span aria-hidden="true">·</span>
            <span>Sınıf: {primaryClassName}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Hoş Geldin, {user?.first_name || 'Öğrenci'} {user?.last_name || ''}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Kayıtlı olduğun derslerdeki haftalık puanlarını, öğretmen değerlendirmelerini ve gelişim grafiklerini buradan takip edebilirsin.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Karne Görünümü</span>
        </button>
      </div>

      {/* 2. Kayıtlı Ders Kartları */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Kayıtlı Derslerin ({enrolledSubjects.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolledSubjects.map((sub) => {
            const isSelected = sub.id === selectedSubjectId;
            const subActivities = activities.filter((a) => a.subject_id === sub.id);
            const subGraded = subActivities.filter((a) =>
              grades.some((g) => g.activity_id === a.id && g.student_id === currentStudentId)
            );

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-slate-900 ring-1 ring-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{sub.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {sub.description || 'Haftalık değerlendirmeler'}
                    </p>
                  </div>
                  <BookOpen className={`w-4 h-4 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`} />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Değerlendirilen:</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {subGraded.length} / {subActivities.length} Çalışma
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Seçili Ders İçin İstatistik Özeti */}
      {currentSubject && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">Ders Başarı Ortalaması</span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {averagePercentage !== null ? `%${averagePercentage}` : 'Henüz not yok'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Girilen {totalGraded} çalışma üzerinden hesaplanmıştır.
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">Son Girilen Puan</span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {latestGrade?.score !== null && latestGrade ? (
                <span>{latestGrade.score} / {latestGrade.max_score}</span>
              ) : (
                '-'
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              {latestGrade ? `${latestGrade.week_number}. Hafta: ${latestGrade.title}` : 'Kayıt bulunmuyor'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500">En Yüksek Puan</span>
            <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
              {highestScore !== null ? `${highestScore} p` : '-'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Bu derste aldığın en yüksek sonuç
            </div>
          </div>
        </div>
      )}

      {/* 4. Haftalık Puan Grafiği (Eksik veriyi 0 puanla karıştırmayan sistem) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span>Haftalık Puan Gelişim Grafiği ({currentSubject?.name})</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Not: Henüz değerlendirilmemiş haftalar sıfır puan olarak sayılmaz; grafik yalnızca değerlendirilmiş haftaları birbirine bağlar.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block" />
              Değerlendirilen Hafta
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400 inline-block" />
              Bekleyen Hafta
            </span>
          </div>
        </div>

        {/* SVG Grafik */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[500px]">
            <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-48 select-none">
              {/* Yatay Kılavuz Çizgileri (%100, %75, %50, %25, %0) */}
              {[100, 75, 50, 25, 0].map((pct) => {
                const y = graphHeight - paddingY - (pct / 100) * (graphHeight - paddingY * 2);
                return (
                  <g key={pct}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={graphWidth - paddingX}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      className="font-mono"
                    >
                      %{pct}
                    </text>
                  </g>
                );
              })}

              {/* Çizgi Grafiği */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Noktalar ve Etiketler */}
              {plotPoints.map((pt, idx) => {
                if (pt.y !== null) {
                  return (
                    <g key={idx}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#0f172a"
                        className="font-mono tabular-nums"
                      >
                        {pt.score}p (%{pt.percentage})
                      </text>
                      <text
                        x={pt.x}
                        y={graphHeight - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                        className="font-mono"
                      >
                        H.{pt.week}
                      </text>
                    </g>
                  );
                } else {
                  return (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={graphHeight - paddingY - 0.5 * (graphHeight - paddingY * 2)}
                        r="4"
                        fill="#f1f5f9"
                        stroke="#94a3b8"
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                      />
                      <text
                        x={pt.x}
                        y={graphHeight - paddingY - 0.5 * (graphHeight - paddingY * 2) - 10}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                      >
                        Bekliyor
                      </text>
                      <text
                        x={pt.x}
                        y={graphHeight - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#94a3b8"
                        className="font-mono"
                      >
                        H.{pt.week}
                      </text>
                    </g>
                  );
                }
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 5. Haftalık Puan Detay Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Haftalık Çalışma ve Puan Geçmişi</span>
          </h3>
          <span className="text-xs text-slate-500">
            Ders: {currentSubject?.name}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold w-20">Hafta</th>
                <th className="py-2.5 px-4 font-semibold">Çalışma / Etkinlik Adı</th>
                <th className="py-2.5 px-4 font-semibold w-28">Tarih</th>
                <th className="py-2.5 px-4 font-semibold w-32">Alınan Puan</th>
                <th className="py-2.5 px-4 font-semibold w-24">Başarı</th>
                <th className="py-2.5 px-4 font-semibold">Öğretmen Açıklaması</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myGradesForSubject.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Bu ders için henüz haftalık çalışma tanımlanmamıştır.
                  </td>
                </tr>
              ) : (
                myGradesForSubject.map((row) => {
                  const hasGrade = row.score !== null;
                  const pct = hasGrade ? Math.round((row.score! / row.max_score) * 100) : null;

                  return (
                    <tr key={row.activity_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {row.week_number}. Hafta
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{row.title}</div>
                        {row.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{row.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
                        {row.activity_date || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {hasGrade ? (
                          <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                            {row.score} <span className="text-slate-400 text-xs font-normal">/ {row.max_score}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Değerlendirilmedi</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {pct !== null ? (
                          <span className={`font-semibold ${
                            pct >= 85 ? 'text-emerald-700' : pct >= 70 ? 'text-slate-900' : 'text-rose-700'
                          }`}>
                            %{pct}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.comment ? (
                          <span className="text-slate-700">{row.comment}</span>
                        ) : (
                          <span className="text-slate-300 italic">Açıklama girilmedi</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
